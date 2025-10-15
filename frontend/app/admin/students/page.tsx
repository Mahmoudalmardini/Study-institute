'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Teacher {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface StudentTeacher {
  id: string;
  teacherId: string;
  teacher: Teacher;
}

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
  };
  teachers?: StudentTeacher[];
}

export default function StudentsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [students, setStudents] = useState<Student[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [success, setSuccess] = useState('');

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
      
      // For each student user, try to get their student profile
      const studentsWithProfiles = await Promise.all(
        (studentsData.data || []).map(async (user: any) => {
          try {
            const profileRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const profileData = await profileRes.json();
            const studentProfile = (profileData.data || []).find((s: any) => s.userId === user.id);
            return {
              ...user,
              studentProfile: studentProfile || null,
            };
          } catch {
            return { ...user, studentProfile: null };
          }
        })
      );
      
      setStudents(studentsWithProfiles);

      // Fetch all teachers
      const teachersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users?role=TEACHER`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const teachersData = await teachersRes.json();
      const teachersList = (teachersData.data || []).map((user: any) => ({
        id: user.id,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      }));
      setAllTeachers(teachersList);

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
    
    // First, check if student has a profile, if not create one
    if (!student.studentProfile) {
      console.log('Creating student profile for user:', student.id);
      try {
        const token = localStorage.getItem('accessToken');
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
        
        const createData = await createRes.json();
        console.log('Create profile response:', createRes.status, createData);
        
        if (createRes.ok) {
          student.studentProfile = createData.data;
          console.log('Student profile created:', student.studentProfile);
        } else {
          console.error('Failed to create profile:', createData);
          setError('Failed to create student profile: ' + (createData.message || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error creating student profile:', err);
        setError('Error creating student profile');
      }
    }

    setSelectedStudent(student);

    // Fetch student's teachers if they have a profile
    if (student.studentProfile) {
      try {
        const token = localStorage.getItem('accessToken');
        console.log('Fetching teachers for student profile:', student.studentProfile.id);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/student-teachers/student/${student.studentProfile.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        console.log('Fetched teachers:', data);
        setSelectedStudent({
          ...student,
          teachers: data.data || [],
        });
      } catch (err) {
        console.error('Error fetching student teachers:', err);
      }
    }
    
    setModalLoading(false);
  };

  const assignTeacher = async () => {
    if (!selectedStudent || !selectedTeacherId) return;

    if (!selectedStudent.studentProfile?.id) {
      setError('Student profile not created yet. Please try again.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('accessToken');
      
      console.log('Assigning teacher:', {
        studentId: selectedStudent.studentProfile.id,
        teacherId: selectedTeacherId,
      });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/student-teachers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: selectedStudent.studentProfile.id,
          teacherId: selectedTeacherId,
        }),
      });

      const data = await response.json();
      console.log('Assignment response:', response.status, data);

      if (response.ok) {
        setSuccess('Teacher assigned successfully!');
        setSelectedTeacherId('');
        // Refresh student's teachers
        openStudentModal(selectedStudent);
        fetchData(); // Refresh main list
      } else {
        setError(data.message || 'Error assigning teacher');
      }
    } catch (err: any) {
      console.error('Assignment error:', err);
      setError(err.message || 'Error assigning teacher');
    }
  };

  const removeTeacher = async (teacherId: string) => {
    if (!selectedStudent) return;
    if (!window.confirm('Are you sure you want to remove this teacher?')) return;

    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('accessToken');
      
      console.log('Removing teacher:', {
        studentId: selectedStudent.studentProfile?.id,
        teacherId: teacherId,
      });
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/student-teachers/${selectedStudent.studentProfile?.id}/${teacherId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      console.log('Remove response:', response.status, data);

      if (response.ok) {
        setSuccess('Teacher removed successfully!');
        // Refresh student's teachers
        openStudentModal(selectedStudent);
        fetchData(); // Refresh main list
      } else {
        setError(data.message || 'Error removing teacher');
      }
    } catch (err: any) {
      console.error('Remove error:', err);
      setError(err.message || 'Error removing teacher');
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

  const availableTeachers = allTeachers.filter(
    (teacher) => !selectedStudent?.teachers?.some((st) => st.teacherId === teacher.id)
  );

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
              <span className="text-xs text-gray-500">Click on a student to assign teachers</span>
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
                      {t.users?.status || 'Status'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Joined
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(student.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openStudentModal(student);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Manage Teachers
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
                  <div className="text-sm text-gray-500">
                    Joined: {new Date(student.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openStudentModal(student);
                    }}
                    className="mt-3 w-full py-2 text-center text-indigo-600 hover:text-indigo-900 font-medium text-sm border border-indigo-200 rounded-lg hover:bg-indigo-50"
                  >
                    Manage Teachers
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

      {/* Teacher Assignment Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Manage Teachers</h2>
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

            <div className="p-6 space-y-6">
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

              {/* Current Teachers */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Assigned Teachers</h3>
                {modalLoading ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedStudent.teachers && selectedStudent.teachers.length > 0 ? (
                      selectedStudent.teachers.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {assignment.teacher.user.firstName[0]}{assignment.teacher.user.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {assignment.teacher.user.firstName} {assignment.teacher.user.lastName}
                              </p>
                              <p className="text-xs text-gray-600">{assignment.teacher.user.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeTeacher(assignment.teacherId)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            aria-label={`Remove ${assignment.teacher.user.firstName} ${assignment.teacher.user.lastName}`}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic py-4 text-center">No teachers assigned yet</p>
                    )}
                  </div>
                )}
              </div>

              {/* Add Teacher */}
              <div className="border-t pt-4">
                <label htmlFor="teacher-select-modal" className="block text-sm font-medium text-gray-700 mb-3">
                  Assign New Teacher
                </label>
                <div className="flex gap-2">
                  <select
                    id="teacher-select-modal"
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Choose a teacher...</option>
                    {availableTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.user.firstName} {teacher.user.lastName}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={assignTeacher}
                    disabled={!selectedTeacherId}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Assign
                  </button>
                </div>
                {availableTeachers.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">All teachers are already assigned to this student</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
