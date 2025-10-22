'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Class, Subject, StudentClass, StudentSubject } from '@/types';

interface Student {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  studentProfile?: {
    id: string;
    classes?: StudentClass[];
    subjects?: StudentSubject[];
  };
}

export default function StudentsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [students, setStudents] = useState<Student[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch all users with STUDENT role
      const studentsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users?role=STUDENT`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (studentsRes.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
        return;
      }

      const studentsData = await studentsRes.json();
      
      // For each student user, try to get their student profile with classes and subjects
      const studentsWithProfiles = await Promise.all(
        (studentsData.data || []).map(async (user: any) => {
          try {
            const profileRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const profileData = await profileRes.json();
            const studentProfile = (profileData.data || []).find((s: any) => s.userId === user.id);
            
            let subjects = [];
            if (studentProfile) {
              try {
                const subjectsRes = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL}/students/${studentProfile.id}/subjects`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                if (subjectsRes.ok) {
                  const subjectsData = await subjectsRes.json();
                  subjects = subjectsData.data || [];
                }
              } catch (err) {
                console.error('Error fetching subjects for student:', err);
              }
            }
            
            return {
              ...user,
              studentProfile: studentProfile || null,
              subjects: subjects,
              class: studentProfile?.class || null,
            };
          } catch {
            return { ...user, studentProfile: null, subjects: [], class: null };
          }
        })
      );
      
      setStudents(studentsWithProfiles);

      // Fetch all classes
      const classesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const classesData = await classesRes.json();
      setAllClasses(classesData.data || []);

      // Fetch all subjects
      const subjectsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const subjectsData = await subjectsRes.json();
      setAllSubjects(subjectsData.data || []);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error loading students');
    } finally {
      setLoading(false);
    }
  };

  const openStudentModal = async (student: Student) => {
    setShowModal(true);
    setModalLoading(true);
    setError('');
    setSuccess('');
    setSelectedClassId('');
    setSelectedSubjectIds([]);
    
    const token = localStorage.getItem('accessToken');
    
    // First, try to fetch the student profile directly
    let studentProfile = student.studentProfile;
    
    if (!studentProfile) {
      try {
        // Try to get all students and find this one
        const studentsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          const existingProfile = (studentsData.data || []).find((s: any) => s.userId === student.id);
          
          if (existingProfile) {
            studentProfile = existingProfile;
            console.log('Found existing student profile:', studentProfile);
          }
        }
      } catch (err) {
        console.error('Error checking for existing profile:', err);
      }
    }
    
    // If still no profile, try to create one
    if (!studentProfile) {
      console.log('Creating student profile for user:', student.id);
      try {
        const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: student.id,
          }),
        });
        
        if (createRes.ok) {
          const createData = await createRes.json();
          studentProfile = createData.data || createData;
          console.log('Student profile created:', studentProfile);
        } else if (createRes.status === 409) {
          // Profile already exists, try to fetch it directly
          console.log('Profile already exists, fetching it...');
          try {
            // First try to get the profile from the response if it contains the created profile
            const errorData = await createRes.json().catch(() => ({}));
            if (errorData.data) {
              studentProfile = errorData.data;
              console.log('Found profile in error response:', studentProfile);
            } else {
              // If not in error response, try to fetch all students and find the one we need
              const fetchRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (fetchRes.ok) {
                const fetchData = await fetchRes.json();
                studentProfile = (fetchData.data || []).find((s: any) => s.userId === student.id);
                if (studentProfile) {
                  console.log('Found existing profile from students list:', studentProfile);
                }
              }
            }
          } catch (fetchErr) {
            console.error('Error fetching existing profile:', fetchErr);
          }
          
          if (!studentProfile) {
            // If we still can't find the profile, try to create it again with a different approach
            console.log('Profile not found, attempting to create again...');
            try {
              const retryRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  userId: student.id,
                }),
              });
              
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                studentProfile = retryData.data || retryData;
                console.log('Successfully created profile on retry:', studentProfile);
              } else {
                console.error('Retry failed:', retryRes.status);
                setError('Unable to create or retrieve student profile. Please try again.');
                setModalLoading(false);
                return;
              }
            } catch (retryErr) {
              console.error('Retry error:', retryErr);
              setError('Unable to create or retrieve student profile. Please try again.');
              setModalLoading(false);
              return;
            }
          }
        } else {
          const errorData = await createRes.json().catch(() => ({}));
          console.error('Failed to create profile:', createRes.status, errorData);
          setError(`Failed to create student profile. ${errorData.message || 'Please ensure the student user exists and try again.'}`);
          setModalLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error creating student profile:', err);
        setError('Error creating student profile. Please try again.');
        setModalLoading(false);
        return;
      }
    }

    setSelectedStudent({
      ...student,
      studentProfile,
    });

    // Fetch student's class and subjects if they have a profile
    if (studentProfile) {
      try {
        // Fetch full student details
        const studentResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/students/${studentProfile.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (studentResponse.ok) {
          const studentData = await studentResponse.json();
          const fullStudent = studentData.data || studentData;
          setSelectedClassId(fullStudent.classId || '');
        }
        
        // Fetch subjects
        const subjectsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/students/${studentProfile.id}/subjects`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (subjectsResponse.ok) {
          const subjectsData = await subjectsResponse.json();
          const studentSubjects = subjectsData.data || [];
          setSelectedSubjectIds(studentSubjects.map((ss: StudentSubject) => ss.subjectId));
          
          setSelectedStudent({
            ...student,
            studentProfile: {
              ...studentProfile,
              subjects: studentSubjects,
            }
          });
        }
      } catch (err) {
        console.error('Error fetching student class/subjects:', err);
      }
    }
    
    setModalLoading(false);
  };

  const handleSaveChanges = async () => {
    if (!selectedStudent || !selectedStudent.studentProfile?.id) {
      setError('Student profile not created yet. Please try again.');
      return;
    }

    // Validate minimum 1 subject
    if (selectedSubjectIds.length === 0) {
      setError('At least one subject must be assigned to the student');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const token = localStorage.getItem('accessToken');
      
      // Update class (single class assignment)
      const classResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/students/${selectedStudent.studentProfile.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ classId: selectedClassId || null }),
        }
      );

      if (!classResponse.ok) {
        const data = await classResponse.json();
        throw new Error(data.message || 'Error updating class');
      }

      // Enroll subjects
      const subjectsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/students/${selectedStudent.studentProfile.id}/enroll-subjects`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subjectIds: selectedSubjectIds }),
        }
      );

      if (!subjectsResponse.ok) {
        const data = await subjectsResponse.json();
        throw new Error(data.message || 'Error enrolling subjects');
      }

      setSuccess('Class and subjects updated successfully!');
      setTimeout(() => {
        setShowModal(false);
        fetchData();
      }, 1500);
      
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Error saving changes');
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm(t.messages.logoutConfirm);
    if (confirmLogout) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    }
  };

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const email = student.email.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  // Get subjects that belong to selected class
  const availableSubjects = allSubjects.filter(subject => {
    if (!selectedClassId) return false; // Don't show any subjects if no class is selected
    return subject.class?.id === selectedClassId;
  });

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <nav className="gradient-primary shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => router.push('/admin')}
                className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-colors flex-shrink-0"
                aria-label="Back to admin dashboard"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                {t.admin.students}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <SettingsMenu onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <div className="mb-6 bg-white rounded-xl shadow-md p-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t.users?.searchPlaceholder || 'Search students...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{t.common.loading}</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {t.users?.totalUsers || 'Total students'}: {filteredStudents.length}
              </span>
              <span className="text-xs text-gray-500">Click on a student to manage classes & subjects</span>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white shadow-md rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-emerald-500 to-green-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      {t.users?.name || 'Name'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      {t.users?.email || 'Email'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Subjects
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      {t.users?.status || 'Status'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openStudentModal(student)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {student.firstName[0]}{student.lastName[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {student.class ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {student.class.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">No class assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {student.subjects && student.subjects.length > 0 ? (
                            student.subjects.map((subject: any) => (
                              <span
                                key={subject.id}
                                className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
                              >
                                {subject.subject?.name || subject.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">No subjects</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            student.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {student.isActive ? t.users?.active || 'Active' : t.users?.inactive || 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openStudentModal(student);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Manage Classes & Subjects
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredStudents.map((student) => (
                <div 
                  key={student.id} 
                  className="bg-white rounded-xl shadow-md p-4 border-l-4 border-emerald-500 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => openStudentModal(student)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {student.firstName[0]}{student.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-sm text-gray-600">{student.email}</div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        student.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {student.isActive ? t.users?.active || 'Active' : t.users?.inactive || 'Inactive'}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="text-sm text-gray-500 mb-2">
                      Joined: {new Date(student.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    
                    {/* Class Display */}
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-600">Class: </span>
                      {student.class ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {student.class.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">No class assigned</span>
                      )}
                    </div>
                    
                    {/* Subjects Display */}
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-600">Subjects: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {student.subjects && student.subjects.length > 0 ? (
                          student.subjects.map((subject: any) => (
                            <span
                              key={subject.id}
                              className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
                            >
                              {subject.subject?.name || subject.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">No subjects</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openStudentModal(student);
                    }}
                    className="w-full py-2 text-center text-indigo-600 hover:text-indigo-900 font-medium text-sm border border-indigo-200 rounded-lg hover:bg-indigo-50"
                  >
                    Manage Classes & Subjects
                  </button>
                </div>
              ))}
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl shadow-md">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t.users?.noUsers || 'No students found'}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search' : 'No students have been added yet'}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Class & Subject Management Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Manage Classes & Subjects</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Student Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Student</h3>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{selectedStudent.email}</p>
                  </div>
                </div>
              </div>

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {modalLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <>
                  {/* Class Section (Single Select) */}
                  <div>
                    <label htmlFor="class-select" className="block text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                      </svg>
                      Class (Select One)
                    </label>
                    <select
                      id="class-select"
                      value={selectedClassId}
                      onChange={(e) => {
                        const newClassId = e.target.value;
                        setSelectedClassId(newClassId);
                        // Clear selected subjects when class changes to force reselection
                        setSelectedSubjectIds([]);
                        setSuccess('Class changed. Please reselect subjects for the new class.');
                      }}
                      className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      required
                    >
                      <option value="">-- Select a Class --</option>
                      {allClasses.map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.name} {classItem.grade ? `- Grade ${classItem.grade}` : ''}
                        </option>
                      ))}
                    </select>
                    {allClasses.length === 0 && (
                      <p className="text-sm text-gray-500 italic mt-2">No classes available</p>
                    )}
                  </div>

                  {/* Subjects Section */}
                  <div className="border-t pt-6">
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                        Subjects ({selectedSubjectIds.length} selected)
                        <span className="text-xs text-red-600 font-normal">(Minimum 1 required)</span>
                      </h3>
                      {selectedClassId && selectedSubjectIds.length === 0 && (
                        <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg mt-2">
                          <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Please select subjects for the chosen class
                        </p>
                      )}
                    </div>
                    {selectedClassId && availableSubjects.length > 0 && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium">
                          <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Showing subjects for: {allClasses.find(c => c.id === selectedClassId)?.name || 'Selected Class'}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2">
                      {availableSubjects.map((subject) => (
                        <button
                          key={subject.id}
                          onClick={() => toggleSubject(subject.id)}
                          className={`p-4 rounded-lg border-2 transition-all text-left min-h-[60px] ${
                            selectedSubjectIds.includes(subject.id)
                              ? 'border-indigo-500 bg-indigo-50 shadow-md'
                              : 'border-gray-200 hover:border-indigo-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{subject.name}</p>
                              {subject.class && (
                                <p className="text-xs text-gray-600 mt-1">Class: {subject.class.name}</p>
                              )}
                            </div>
                            {selectedSubjectIds.includes(subject.id) && (
                              <svg className="w-6 h-6 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    {availableSubjects.length === 0 && (
                      <p className="text-sm text-gray-500 italic text-center py-4">
                        {!selectedClassId 
                          ? 'Please select a class to see available subjects, or leave class empty to see all subjects'
                          : 'No subjects available for the selected class'}
                      </p>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving || !selectedClassId || selectedSubjectIds.length === 0}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
