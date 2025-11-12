'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import apiClient, {
  getStudentInstallments,
  getStudentOutstandingBalance,
  calculateInstallment,
  createDiscount,
  cancelDiscount,
  recordPayment,
} from '@/lib/api-client';
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
  const [activeTab, setActiveTab] = useState<'classes' | 'installments'>('classes');
  const [installments, setInstallments] = useState<any[]>([]);
  const [outstanding, setOutstanding] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState<any>(null);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [discountForm, setDiscountForm] = useState({ amount: '', reason: '' });
  const [paymentForm, setPaymentForm] = useState({ 
    installmentId: '', 
    amount: '', 
    paymentDate: new Date().toISOString().split('T')[0], 
    paymentMethod: '', 
    notes: '' 
  });
  const [loadingInstallments, setLoadingInstallments] = useState(false);

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

      // Fetch all users with STUDENT role and all student profiles in parallel
      const [usersRes, studentsRes, classesRes, subjectsRes] = await Promise.all([
        apiClient.get('/users?role=STUDENT'),
        apiClient.get('/students'),
        apiClient.get('/classes'),
        apiClient.get('/subjects'),
      ]);

      const users = Array.isArray(usersRes) ? usersRes : (usersRes as any)?.data || [];
      const studentProfiles = Array.isArray(studentsRes) ? studentsRes : (studentsRes as any)?.data || [];
      const classes = Array.isArray(classesRes) ? classesRes : (classesRes as any)?.data || [];
      const subjects = Array.isArray(subjectsRes) ? subjectsRes : (subjectsRes as any)?.data || [];

      // Create a map of userId -> studentProfile for fast lookup
      const profileMap = new Map(
        studentProfiles.map((profile: any) => [profile.userId, profile])
      );

      // Match users with profiles first (no subjects yet to avoid rate limits)
      const studentsWithProfiles = users.map((user: any) => {
        const studentProfile = profileMap.get(user.id);
        return {
          ...user,
          studentProfile: studentProfile || null,
          subjects: [], // Load subjects lazily when needed (modal opens)
          class: studentProfile?.class || null,
        };
      });
      
      // Fetch subjects sequentially for students that have profiles to avoid rate limits
      // We do this in a loop instead of Promise.all to throttle requests
      const studentsWithSubjects = [];
      for (let i = 0; i < studentsWithProfiles.length; i++) {
        const student = studentsWithProfiles[i];
        
        if (student.studentProfile) {
          try {
            // Small delay between requests to avoid rate limiting (100ms)
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const subjectsData = await apiClient.get(`/students/${student.studentProfile.id}/subjects`);
            const studentSubjects = Array.isArray(subjectsData) ? subjectsData : (subjectsData as any)?.data || [];
            student.subjects = studentSubjects;
          } catch (err: any) {
            // If rate limited or other error, continue with empty subjects
            if (err.response?.status === 429) {
              console.warn(`Rate limited for student ${student.studentProfile.id}, subjects will load on demand`);
            } else {
              console.error('Error fetching subjects for student:', err);
            }
            student.subjects = [];
          }
        }
        
        studentsWithSubjects.push(student);
      }
      
      setStudents(studentsWithSubjects);
      setAllClasses(classes);
      setAllSubjects(subjects);

    } catch (err: any) {
      console.error('Error fetching data:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
        return;
      }
      setError('Error loading students');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallmentsData = async (studentId: string) => {
    if (!studentId || !studentId.startsWith) return; // Check if it's a valid ID format
    try {
      setLoadingInstallments(true);
      const [installmentsData, outstandingData, currentMonthData] = await Promise.all([
        getStudentInstallments(studentId),
        getStudentOutstandingBalance(studentId),
        calculateInstallment(studentId, new Date().getMonth() + 1, new Date().getFullYear()),
      ]);
      setInstallments(Array.isArray(installmentsData) ? installmentsData : []);
      setOutstanding(outstandingData || { totalOutstanding: '0', count: 0 });
      setCurrentMonth(currentMonthData || null);
    } catch (err: any) {
      console.error('Error fetching installments:', err);
      setError('Failed to load installments data');
    } finally {
      setLoadingInstallments(false);
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
    setActiveTab('classes');
    
    const token = localStorage.getItem('accessToken');
    
    // First, try to fetch the student profile directly
    let studentProfile = student.studentProfile;
    
    // If no profile, try to fetch it first, then create if needed (only once)
    if (!studentProfile) {
      try {
        // First try to fetch all students and find this one
        const allStudents = await apiClient.get('/students');
        const studentsList = Array.isArray(allStudents) ? allStudents : (allStudents as any)?.data || [];
        studentProfile = studentsList.find((s: any) => s.userId === student.id);
        
        if (studentProfile) {
          console.log('Found existing student profile:', studentProfile);
        } else {
          // If not found, try to create it (only once, no retries)
          console.log('Creating student profile for user:', student.id);
          try {
            studentProfile = await apiClient.post('/students', {
              userId: student.id,
            });
            console.log('Student profile created:', studentProfile);
          } catch (createErr: any) {
            // If 409 conflict, profile exists - fetch it one more time
            if (createErr.response?.status === 409) {
              console.log('Profile already exists (409), fetching again...');
              const retryStudents = await apiClient.get('/students');
              const retryList = Array.isArray(retryStudents) ? retryStudents : (retryStudents as any)?.data || [];
              studentProfile = retryList.find((s: any) => s.userId === student.id);
              
              if (!studentProfile) {
                console.warn('Profile should exist but cannot be found');
                setError('Student profile exists but could not be retrieved. Please refresh the page.');
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
      } catch (err: any) {
        console.error('Error fetching/creating student profile:', err);
        setError('Unable to load student profile. Please try again.');
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
      // Fetch installments data
      fetchInstallmentsData(studentProfile.id);
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
          
          // Set teacher assignments if they exist
          const teacherAssignments: Record<string, string> = {};
          studentSubjects.forEach((ss: any) => {
            // Extract teacherId from either direct property or nested teacher object
            const teacherId = ss.teacherId || ss.teacher?.id;
            if (teacherId) {
              teacherAssignments[ss.subjectId] = String(teacherId).trim();
            }
          });
          console.log('Loaded teacher assignments:', teacherAssignments);
          setSubjectTeachers(teacherAssignments);
          
          // Fetch teachers for all enrolled subjects
          for (const ss of studentSubjects) {
            await fetchTeachersForSubject(ss.subjectId);
          }
          
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

    // Validate that subjects with multiple teachers have a teacher assigned
    const subjectsMissingTeachers: string[] = [];
    for (const subjectId of selectedSubjectIds) {
      const teachers = teachersBySubject[subjectId] || [];
      if (teachers.length > 1 && !subjectTeachers[subjectId]) {
        const subject = availableSubjects.find(s => s.id === subjectId);
        subjectsMissingTeachers.push(subject?.name || subjectId);
      }
    }

    if (subjectsMissingTeachers.length > 0) {
      setError(
        `Please assign a teacher for the following subjects with multiple teachers: ${subjectsMissingTeachers.join(', ')}`
      );
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

      // Enroll subjects with optional teacher assignments
      const subjectsToEnroll = selectedSubjectIds.map(subjectId => {
        const teacherId = subjectTeachers[subjectId];
        // Validate teacherId is a valid UUID-like string (basic validation)
        const isValidTeacherId = teacherId && 
          typeof teacherId === 'string' && 
          teacherId.trim().length > 0 &&
          teacherId.trim().length >= 10; // Basic validation for UUID
        
        const result = {
          subjectId,
          // Only include teacherId if it's valid
          ...(isValidTeacherId ? { teacherId: teacherId.trim() } : {}),
        };
        return result;
      });

      console.log('Enrolling subjects with teachers:', subjectsToEnroll);

      const subjectsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/students/${selectedStudent.studentProfile.id}/enroll-subjects`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subjects: subjectsToEnroll }),
        }
      );

      if (!subjectsResponse.ok) {
        const data = await subjectsResponse.json();
        throw new Error(data.message || 'Error enrolling subjects');
      }

      setSuccess('Class and subjects updated successfully!');
      // Recalculate installments after enrollment
      if (selectedStudent?.studentProfile?.id) {
        try {
          await calculateInstallment(
            selectedStudent.studentProfile.id,
            new Date().getMonth() + 1,
            new Date().getFullYear(),
          );
          await fetchInstallmentsData(selectedStudent.studentProfile.id);
        } catch (err) {
          console.error('Error recalculating installments:', err);
        }
      }
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

  const fetchTeachersForSubject = async (subjectId: string) => {
    if (teachersBySubject[subjectId]) {
      return teachersBySubject[subjectId]; // Already fetched, return cached
    }
    
    setLoadingTeachers(prev => ({ ...prev, [subjectId]: true }));
    try {
      const data = await apiClient.get(`/subjects/${subjectId}/teachers`);
      const teachers = Array.isArray(data) ? data : (data as any)?.data || [];
      setTeachersBySubject(prev => ({ ...prev, [subjectId]: teachers }));
      return teachers;
    } catch (error) {
      console.error('Error fetching teachers for subject:', error);
      setTeachersBySubject(prev => ({ ...prev, [subjectId]: [] }));
      return [];
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
      const teachers = await fetchTeachersForSubject(subjectId);
      
      // Auto-assign teacher if there's exactly one teacher for this subject
      if (teachers.length === 1) {
        const teacherAssignment = teachers[0];
        const teacher = teacherAssignment.teacher || teacherAssignment;
        const teacherId = teacher?.id || teacher?.teacherId;
        if (teacherId) {
          setSubjectTeachers(prev => ({
            ...prev,
            [subjectId]: String(teacherId).trim(),
          }));
        }
      }
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Manage Student</h2>
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
              {/* Tabs */}
              <div className="flex gap-2 border-b border-white/20">
                <button
                  onClick={() => setActiveTab('classes')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'classes'
                      ? 'text-white border-b-2 border-white'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Classes & Subjects
                </button>
                <button
                  onClick={() => {
                    setActiveTab('installments');
                    if (selectedStudent?.studentProfile?.id) {
                      fetchInstallmentsData(selectedStudent.studentProfile.id);
                    }
                  }}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'installments'
                      ? 'text-white border-b-2 border-white'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Installments
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
              ) : activeTab === 'classes' ? (
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
                    <div className="space-y-4">
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

                      {/* Teacher Selection for Selected Subjects */}
                      {selectedSubjectIds.length > 0 && (
                        <div className="border-t pt-4 mt-4">
                          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                            Assign Teachers
                          </h4>
                          <p className="text-sm text-gray-600 mb-4">
                            For subjects taught by multiple teachers, you must select which teacher will teach this student. The teacher assignment is automatically set for subjects with only one teacher. Students will no longer need to choose teachers when submitting homework.
                          </p>
                          <div className="space-y-3">
                            {selectedSubjectIds.map((subjectId) => {
                              const subject = availableSubjects.find(s => s.id === subjectId);
                              const teachers = teachersBySubject[subjectId] || [];
                              const isLoading = loadingTeachers[subjectId];
                              const selectedTeacherId = subjectTeachers[subjectId] || '';

                              const studentSubject = selectedStudent?.studentProfile?.subjects?.find(
                                (ss: any) => ss.subjectId === subjectId || ss.subject?.id === subjectId,
                              );
                              const assignedTeacher = studentSubject?.teacher;

                              const teacherOptions = [...teachers];
                              if (
                                assignedTeacher &&
                                !teacherOptions.some((t: any) => {
                                  const teacher = t.teacher || t;
                                  return teacher.id === assignedTeacher.id;
                                })
                              ) {
                                teacherOptions.unshift({ teacher: assignedTeacher });
                              }

                              const hasMultipleTeachers = teacherOptions.length > 1;
                              const isRequired = hasMultipleTeachers && !selectedTeacherId;
                              const showAutoAssignedBadge =
                                teacherOptions.length === 1 &&
                                !!selectedTeacherId &&
                                teacherOptions[0] &&
                                ((teacherOptions[0].teacher || teacherOptions[0]).id === selectedTeacherId);

                              return (
                                <div
                                  key={subjectId}
                                  className={`bg-gray-50 rounded-lg p-4 border ${
                                    isRequired ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                                        {subject?.name || 'Unknown Subject'}
                                        {hasMultipleTeachers && (
                                          <span className="text-xs text-red-600 font-normal">(Required)</span>
                                        )}
                                        {showAutoAssignedBadge && (
                                          <span className="text-xs text-green-600 font-normal">(Auto-assigned)</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  {isLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <LoadingSpinner size="sm" />
                                      Loading teachers...
                                    </div>
                                  ) : teacherOptions.length > 0 ? (
                                    <>
                                      <select
                                        value={selectedTeacherId}
                                        onChange={(e) => {
                                          setSubjectTeachers(prev => ({
                                            ...prev,
                                            [subjectId]: e.target.value || '',
                                          }));
                                        }}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white ${
                                          isRequired ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                        required={hasMultipleTeachers}
                                      >
                                        {hasMultipleTeachers && (
                                          <option value="">-- Select a teacher (Required) --</option>
                                        )}
                                        {teacherOptions.map((teacherAssignment: any) => {
                                          const teacher = teacherAssignment.teacher || teacherAssignment;
                                          return (
                                            <option key={teacher.id} value={teacher.id}>
                                              {teacher.user?.firstName || teacher.firstName}{' '}
                                              {teacher.user?.lastName || teacher.lastName}
                                            </option>
                                          );
                                        })}
                                      </select>
                                      {isRequired && (
                                        <p className="text-xs text-red-600 mt-1">
                                          Please select a teacher for this subject
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">
                                      No teachers available for this subject
                                      {assignedTeacher && (
                                        <span className="block text-xs text-gray-600 mt-1">
                                          Current assignment: {assignedTeacher.user?.firstName || assignedTeacher.firstName}{' '}
                                          {assignedTeacher.user?.lastName || assignedTeacher.lastName}
                                        </span>
                                      )}
                                    </div>
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
              ) : (
                <>
                  {/* Installments Tab */}
                  {loadingInstallments ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                          <p className="text-sm text-gray-600 mb-1">
                            {t.installments?.outstandingBalance || 'Outstanding Balance'}
                          </p>
                          <p className="text-3xl font-bold text-gray-900">
                            {parseFloat(outstanding?.totalOutstanding || '0').toFixed(2)}
                          </p>
                        </div>
                        {currentMonth && (
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                            <p className="text-sm text-gray-600 mb-1">
                              {t.installments?.currentMonth || 'Current Month'}
                            </p>
                            <p className="text-3xl font-bold text-gray-900">
                              {parseFloat(currentMonth.installment?.totalAmount || '0').toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowDiscountForm(true)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {t.installments?.addDiscount || 'Add Discount'}
                        </button>
                        <button
                          onClick={() => {
                            if (currentMonth?.installment?.id) {
                              setPaymentForm({
                                ...paymentForm,
                                installmentId: currentMonth.installment.id,
                              });
                              setShowPaymentForm(true);
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t.installments?.recordPayment || 'Record Payment'}
                        </button>
                      </div>

                      {/* Installments List */}
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {t.installments?.paymentHistory || 'Payment History'}
                          </h3>
                        </div>
                        {installments.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            {t.installments?.noInstallments || 'No installments found'}
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-200">
                            {installments.map((installment) => (
                              <div key={installment.id} className="p-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {new Date(installment.year, installment.month - 1).toLocaleDateString('en-US', {
                                        month: 'long',
                                        year: 'numeric',
                                      })}
                                    </p>
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                      installment.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                      installment.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                                      installment.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {installment.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                                  <div>
                                    <p className="text-gray-600">Total</p>
                                    <p className="font-semibold">{parseFloat(String(installment.totalAmount)).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Paid</p>
                                    <p className="font-semibold text-green-600">{parseFloat(String(installment.paidAmount)).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Outstanding</p>
                                    <p className="font-semibold text-red-600">{parseFloat(String(installment.outstandingAmount)).toFixed(2)}</p>
                                  </div>
                                </div>
                                {installment.payments && installment.payments.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Payments:</p>
                                    {installment.payments.map((payment: any) => (
                                      <div key={payment.id} className="text-xs text-gray-600 flex justify-between">
                                        <span>{parseFloat(String(payment.amount)).toFixed(2)} - {new Date(payment.paymentDate).toLocaleDateString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Discount Form Modal */}
                  {showDiscountForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">{t.installments?.addDiscount || 'Add Discount'}</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              {t.installments?.discountAmount || 'Discount Amount'}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={discountForm.amount}
                              onChange={(e) => setDiscountForm({ ...discountForm, amount: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              {t.installments?.discountReason || 'Reason (Optional)'}
                            </label>
                            <textarea
                              value={discountForm.reason}
                              onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={async () => {
                                try {
                                  await createDiscount({
                                    studentId: selectedStudent!.studentProfile!.id,
                                    amount: parseFloat(discountForm.amount),
                                    reason: discountForm.reason || undefined,
                                  });
                                  setSuccess(t.installments?.discountCreated || 'Discount added successfully');
                                  setShowDiscountForm(false);
                                  setDiscountForm({ amount: '', reason: '' });
                                  await fetchInstallmentsData(selectedStudent!.studentProfile!.id);
                                } catch (err: any) {
                                  setError(err.response?.data?.message || 'Failed to add discount');
                                }
                              }}
                              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setShowDiscountForm(false);
                                setDiscountForm({ amount: '', reason: '' });
                              }}
                              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Form Modal */}
                  {showPaymentForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">{t.installments?.recordPayment || 'Record Payment'}</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              {t.installments?.paymentAmount || 'Payment Amount'}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={paymentForm.amount}
                              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              {t.installments?.paymentDate || 'Payment Date'}
                            </label>
                            <input
                              type="date"
                              value={paymentForm.paymentDate}
                              onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              {t.installments?.paymentMethod || 'Payment Method (Optional)'}
                            </label>
                            <input
                              type="text"
                              value={paymentForm.paymentMethod}
                              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              placeholder="Cash, Bank Transfer, etc."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              {t.installments?.paymentNotes || 'Notes (Optional)'}
                            </label>
                            <textarea
                              value={paymentForm.notes}
                              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={async () => {
                                try {
                                  await recordPayment({
                                    studentId: selectedStudent!.studentProfile!.id,
                                    installmentId: paymentForm.installmentId,
                                    amount: parseFloat(paymentForm.amount),
                                    paymentDate: paymentForm.paymentDate,
                                    paymentMethod: paymentForm.paymentMethod || undefined,
                                    notes: paymentForm.notes || undefined,
                                  });
                                  setSuccess(t.installments?.paymentRecorded || 'Payment recorded successfully');
                                  setShowPaymentForm(false);
                                  setPaymentForm({
                                    installmentId: '',
                                    amount: '',
                                    paymentDate: new Date().toISOString().split('T')[0],
                                    paymentMethod: '',
                                    notes: '',
                                  });
                                  await fetchInstallmentsData(selectedStudent!.studentProfile!.id);
                                } catch (err: any) {
                                  setError(err.response?.data?.message || 'Failed to record payment');
                                }
                              }}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              Record
                            </button>
                            <button
                              onClick={() => {
                                setShowPaymentForm(false);
                                setPaymentForm({
                                  installmentId: '',
                                  amount: '',
                                  paymentDate: new Date().toISOString().split('T')[0],
                                  paymentMethod: '',
                                  notes: '',
                                });
                              }}
                              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
