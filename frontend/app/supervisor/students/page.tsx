'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import apiClient from '@/lib/api-client';
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

export default function SupervisorStudentsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [students, setStudents] = useState<Student[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjectTeachers, setSubjectTeachers] = useState<Record<string, string>>({}); // subjectId -> teacherId
  const [teachersBySubject, setTeachersBySubject] = useState<Record<string, any[]>>({}); // subjectId -> teachers[]
  const [loadingTeachers, setLoadingTeachers] = useState<Record<string, boolean>>({});
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

      // Fetch all users with STUDENT role using apiClient
      const studentsData = await apiClient.get('/users?role=STUDENT');
      
      // For each student user, try to get their student profile with classes and subjects
      const studentsWithProfiles = await Promise.all(
        ((studentsData as any)?.data || studentsData || []).map(async (user: any) => {
          try {
            const profileData = await apiClient.get('/students');
            const profileArray = Array.isArray(profileData) ? profileData : ((profileData as any)?.data || []);
            const studentProfile = profileArray.find((s: any) => s.userId === user.id);
            
            let subjects = [];
            if (studentProfile) {
              try {
                const subjectsData = await apiClient.get(`/students/${studentProfile.id}/subjects`);
                subjects = Array.isArray(subjectsData) ? subjectsData : ((subjectsData as any)?.data || []);
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

      // Fetch all classes using apiClient
      const classesData = await apiClient.get('/classes');
      setAllClasses(Array.isArray(classesData) ? classesData : ((classesData as any)?.data || []));

      // Fetch all subjects using apiClient
      const subjectsData = await apiClient.get('/subjects');
      setAllSubjects(Array.isArray(subjectsData) ? subjectsData : ((subjectsData as any)?.data || []));

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
    setSubjectTeachers({});
    setTeachersBySubject({});
    
    const token = localStorage.getItem('accessToken');
    
    // First, try to fetch the student profile directly
    let studentProfile = student.studentProfile;
    
    if (!studentProfile) {
      try {
        // Try to get all students and find this one using apiClient
        const studentsData = await apiClient.get('/students');
        const studentsArray = Array.isArray(studentsData) ? studentsData : ((studentsData as any)?.data || []);
        const existingProfile = studentsArray.find((s: any) => s.userId === student.id);
        
        if (existingProfile) {
          studentProfile = existingProfile;
          console.log('Found existing student profile:', studentProfile);
        }
      } catch (err) {
        console.error('Error checking for existing profile:', err);
      }
    }
    
    // If still no profile, try to create one
    if (!studentProfile) {
      console.log('Creating student profile for user:', student.id);
      try {
        studentProfile = await apiClient.post('/students', {
          userId: student.id,
        });
        console.log('Student profile created:', studentProfile);
      } catch (createErr: any) {
        if (createErr.response?.status === 409) {
          // Profile already exists, try to fetch it directly
          console.log('Profile already exists, fetching it...');
          try {
            const studentsData = await apiClient.get('/students');
            const studentsArray = Array.isArray(studentsData) ? studentsData : ((studentsData as any)?.data || []);
            studentProfile = studentsArray.find((s: any) => s.userId === student.id);
            if (studentProfile) {
              console.log('Found existing profile from students list:', studentProfile);
            } else {
              // If we still can't find it, show error
              console.error('Profile exists but cannot be retrieved');
              setError('Student profile exists but could not be retrieved. Please refresh the page.');
              setModalLoading(false);
              return;
            }
          } catch (fetchErr) {
            console.error('Error fetching existing profile:', fetchErr);
            setError('Unable to retrieve student profile. Please try again.');
            setModalLoading(false);
            return;
          }
        } else {
          console.error('Error creating student profile:', createErr);
          setError('Unable to create student profile. Please try again.');
          setModalLoading(false);
          return;
        }
      }
    }

    setSelectedStudent({
      ...student,
      studentProfile,
    });

    // Fetch student's class and subjects if they have a profile
    if (studentProfile) {
      try {
        // Fetch full student details using apiClient
        const studentData = await apiClient.get(`/students/${studentProfile.id}`);
        const fullStudent = studentData.data || studentData;
        setSelectedClassId(fullStudent.classId || '');
        
        // Fetch subjects using apiClient
        const studentSubjects = await apiClient.get(`/students/${studentProfile.id}/subjects`);
        const subjectsArray = Array.isArray(studentSubjects) ? studentSubjects : (studentSubjects as any)?.data || [];
        setSelectedSubjectIds(subjectsArray.map((ss: any) => ss.subjectId || ss.subject?.id));
        
        // Set teacher assignments if they exist
        const teacherAssignments: Record<string, string> = {};
        subjectsArray.forEach((ss: any) => {
          const teacherId = ss.teacherId || ss.teacher?.id;
          const subjectId = ss.subjectId || ss.subject?.id;
          if (teacherId && subjectId) {
            teacherAssignments[subjectId] = String(teacherId).trim();
          }
        });
        setSubjectTeachers(teacherAssignments);
        
        // Fetch teachers for all enrolled subjects
        for (const ss of subjectsArray) {
          const subjectId = ss.subjectId || ss.subject?.id;
          if (subjectId) {
            await fetchTeachersForSubject(subjectId);
          }
        }
        
        setSelectedStudent({
          ...student,
          studentProfile: {
            ...studentProfile,
            subjects: subjectsArray,
          }
        });
      } catch (err) {
        console.error('Error fetching student class/subjects:', err);
      }
    }
    
    setModalLoading(false);
  };

  const handleSaveChanges = async () => {
    if (!selectedStudent || !selectedStudent.studentProfile?.id) {
      setError(t.students?.profileNotCreated || 'Student profile not created yet. Please try again.');
      return;
    }

    // Validate minimum 1 subject
    if (selectedSubjectIds.length === 0) {
      setError(t.students?.atLeastOneSubject || 'At least one subject must be assigned to the student');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // Validate that class is selected before enrolling subjects
      if (selectedSubjectIds.length > 0 && !selectedClassId) {
        setError(t.students?.selectClassFirst || 'Please select a class before assigning subjects to the student');
        setSaving(false);
        return;
      }
      
      // Update class (single class assignment) using apiClient
      await apiClient.patch(
        `/students/${selectedStudent.studentProfile.id}`,
        { classId: selectedClassId || null }
      );

      // Enroll subjects with optional teacher assignments
      const subjectsToEnroll = selectedSubjectIds.map(subjectId => ({
        subjectId,
        teacherId: subjectTeachers[subjectId] || undefined,
      }));

      // Enroll subjects using apiClient
      await apiClient.post(
        `/students/${selectedStudent.studentProfile.id}/enroll-subjects`,
        { subjects: subjectsToEnroll }
      );

      setSuccess(t.students?.classSubjectsUpdated || 'Class and subjects updated successfully!');
      setTimeout(() => {
        setShowModal(false);
        fetchData();
      }, 1500);
      
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || t.students?.errorSaving || 'Error saving changes');
    } finally {
      setSaving(false);
    }
  };

  const fetchTeachersForSubject = async (subjectId: string) => {
    if (teachersBySubject[subjectId]) {
      return; // Already fetched
    }
    
    setLoadingTeachers(prev => ({ ...prev, [subjectId]: true }));
    try {
      const data = await apiClient.get(`/subjects/${subjectId}/teachers`);
      const teachers = Array.isArray(data) ? data : (data as any)?.data || [];
      setTeachersBySubject(prev => ({ ...prev, [subjectId]: teachers }));
    } catch (error) {
      console.error('Error fetching teachers for subject:', error);
      setTeachersBySubject(prev => ({ ...prev, [subjectId]: [] }));
    } finally {
      setLoadingTeachers(prev => ({ ...prev, [subjectId]: false }));
    }
  };

  const toggleSubject = async (subjectId: string) => {
    const isCurrentlySelected = selectedSubjectIds.includes(subjectId);
    
    if (isCurrentlySelected) {
      // Deselecting - remove from selection and clear teacher
      setSelectedSubjectIds(prev => prev.filter(id => id !== subjectId));
      setSubjectTeachers(prev => {
        const updated = { ...prev };
        delete updated[subjectId];
        return updated;
      });
    } else {
      // Selecting - add to selection and fetch teachers
      setSelectedSubjectIds(prev => [...prev, subjectId]);
      await fetchTeachersForSubject(subjectId);
    }
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

  // Fetch subjects for selected class
  useEffect(() => {
    const fetchClassSubjects = async () => {
      if (!selectedClassId) {
        setAvailableSubjects([]);
        return;
      }
      
      try {
        const data = await apiClient.get(`/classes/${selectedClassId}/subjects`);
        setAvailableSubjects(data || []);
      } catch (error) {
        console.error('Error fetching class subjects:', error);
        setAvailableSubjects([]);
      }
    };
    
    fetchClassSubjects();
  }, [selectedClassId]);

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <nav className="gradient-secondary shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => router.push('/supervisor')}
                className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-colors flex-shrink-0"
                aria-label="Back to supervisor dashboard"
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
                Students
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
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {error && !showModal && (
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
                <thead className="bg-gradient-to-r from-blue-500 to-cyan-600">
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
                          className="text-blue-600 hover:text-blue-900 font-medium"
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
                  className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-shadow"
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
                    className="w-full py-2 text-center text-blue-600 hover:text-blue-900 font-medium text-sm border border-blue-200 rounded-lg hover:bg-blue-50"
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
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4 rounded-t-2xl">
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
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                      </svg>
                      Class (Select One)
                    </label>
                    <select
                      id="class-select"
                      value={selectedClassId}
                      onChange={async (e) => {
                        const newClassId = e.target.value;
                        setSelectedClassId(newClassId);
                        // Clear selected subjects when class changes to force reselection
                        setSelectedSubjectIds([]);
                        setSuccess('Class changed. Please reselect subjects for the new class.');
                        
                        // Fetch subjects for the selected class
                        if (newClassId) {
                          try {
                            const data = await apiClient.get(`/classes/${newClassId}/subjects`);
                            setAvailableSubjects(data || []);
                          } catch (error) {
                            console.error('Error fetching class subjects:', error);
                            setAvailableSubjects([]);
                          }
                        } else {
                          setAvailableSubjects([]);
                        }
                      }}
                      className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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
                      {!selectedClassId && (
                        <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg mt-2">
                          <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Please select a class first to see available subjects
                        </p>
                      )}
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
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2">
                        {availableSubjects.map((subject) => (
                          <button
                            key={subject.id}
                            onClick={() => toggleSubject(subject.id)}
                            disabled={!selectedClassId}
                            className={`p-4 rounded-lg border-2 transition-all text-left min-h-[60px] ${
                              selectedSubjectIds.includes(subject.id)
                                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                : 'border-gray-200 hover:border-indigo-300 bg-white'
                            } ${!selectedClassId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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

                      {/* Monthly Installment Preview */}
                      {selectedClassId && selectedSubjectIds.length > 0 && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                              </svg>
                              <span className="font-semibold text-gray-900">Estimated Monthly Installment:</span>
                            </div>
                            <span className="text-2xl font-bold text-emerald-600">
                              ${(() => {
                                const total = selectedSubjectIds.reduce((sum, subjectId) => {
                                  const subject = availableSubjects.find(s => s.id === subjectId);
                                  const installment = subject?.monthlyInstallment;
                                  if (typeof installment === 'number') {
                                    return sum + installment;
                                  } else if (typeof installment === 'string') {
                                    return sum + parseFloat(installment) || 0;
                                  }
                                  return sum;
                                }, 0);
                                return total.toFixed(2);
                              })()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            This is the total monthly installment based on selected subjects. The actual amount will be calculated automatically when subjects are enrolled.
                          </p>
                        </div>
                      )}

                      {/* Teacher Selection for Selected Subjects */}
                      {selectedSubjectIds.length > 0 && (
                        <div className="border-t pt-4 mt-4">
                          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                            Assign Teachers (Optional)
                          </h4>
                          <p className="text-sm text-gray-600 mb-4">
                            If multiple teachers teach the same subject, select which teacher will teach this student. If not selected, the student will need to choose when submitting homework.
                          </p>
                          <div className="space-y-3">
                            {selectedSubjectIds.map((subjectId) => {
                              const subject = availableSubjects.find(s => s.id === subjectId);
                              const teachers = teachersBySubject[subjectId] || [];
                              const isLoading = loadingTeachers[subjectId];
                              const selectedTeacherId = subjectTeachers[subjectId] || '';

                              return (
                                <div key={subjectId} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900">{subject?.name || 'Unknown Subject'}</p>
                                    </div>
                                  </div>
                                  {isLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <LoadingSpinner size="sm" />
                                      Loading teachers...
                                    </div>
                                  ) : teachers.length > 0 ? (
                                    <select
                                      value={selectedTeacherId}
                                      onChange={(e) => {
                                        setSubjectTeachers(prev => ({
                                          ...prev,
                                          [subjectId]: e.target.value || '',
                                        }));
                                      }}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                    >
                                      <option value="">-- No teacher assigned (student will choose) --</option>
                                      {teachers.map((teacherAssignment: any) => {
                                        const teacher = teacherAssignment.teacher || teacherAssignment;
                                        return (
                                          <option key={teacher.id} value={teacher.id}>
                                            {teacher.user?.firstName || teacher.firstName} {teacher.user?.lastName || teacher.lastName}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  ) : (
                                    <p className="text-sm text-gray-500 italic">No teachers available for this subject</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
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
