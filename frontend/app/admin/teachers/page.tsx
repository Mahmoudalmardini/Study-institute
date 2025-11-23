'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Pagination from '@/components/ui/Pagination';
import apiClient from '@/lib/api-client';

interface Subject {
  id: string;
  name: string;
  code?: string;
  class?: {
    id: string;
    name: string;
    grade?: string;
  };
  classSubjects?: Array<{
    class?: {
      id: string;
      name: string;
      grade?: string;
    } | null;
  }>;
}

interface TeacherSubject {
  id: string;
  subject: Subject;
}

interface Teacher {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  subjects?: TeacherSubject[];
  hireDate: string;
}

interface Class {
  id: string;
  name: string;
  grade?: string;
}

export default function TeachersPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [assigningSubject, setAssigningSubject] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  const [selectedSubjectForAssignment, setSelectedSubjectForAssignment] = useState<Subject | null>(null);
  const [showClassSelection, setShowClassSelection] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [editSubjectId, setEditSubjectId] = useState<string>('');
  const [editClassId, setEditClassId] = useState<string>('');
  // New state for class-first subject assignment
  const [selectedClassForSubjects, setSelectedClassForSubjects] = useState<string>('');
  const [availableSubjectsForClass, setAvailableSubjectsForClass] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [loadingClassSubjects, setLoadingClassSubjects] = useState(false);


  const resolveSubjectClass = (subject: Subject) => {
    if (subject?.class) {
      return subject.class;
    }
    const fallback = subject?.classSubjects?.find(cs => cs.class)?.class;
    return fallback ?? null;
  };

  const getClassName = (subject: Subject) =>
    resolveSubjectClass(subject)?.name || 'No Class';

  const getClassGrade = (subject: Subject) =>
    resolveSubjectClass(subject)?.grade || '';

  const getClassId = (subject: Subject) =>
    resolveSubjectClass(subject)?.id || null;

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchTeachers();
    fetchSubjects();
    fetchClasses();
  }, [router, page, limit]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        router.push('/login');
        return [];
      }

      const response = await apiClient.get(`/teachers?page=${page}&limit=${limit}`);
      const teachersData = response?.data || (Array.isArray(response) ? response : []);
      const meta = response?.meta || { total: teachersData.length, totalPages: 1 };
      
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
      if (meta) {
        setTotal(meta.total || 0);
        setTotalPages(meta.totalPages || 1);
      }
      return Array.isArray(teachersData) ? teachersData : [];
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setError('Error loading teachers');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await apiClient.get('/subjects');
      setSubjects((response as any) || []);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await apiClient.get('/classes');
      setClasses((response as any) || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleManageSubjects = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowSubjectModal(true);
    setSelectedClassFilter('');
    setSelectedClassForSubjects('');
    setAvailableSubjectsForClass([]);
    setSelectedSubjectIds([]);
    setError('');
    setSuccess('');
  };

  const handleDeleteTeacher = async (userId: string, teacherName: string) => {
    if (!confirm(`Are you sure you want to permanently delete the teacher account for ${teacherName}?\n\nThis will:\n- Delete the teacher's user account\n- Remove all subject assignments\n- Delete all related data\n\nThis action CANNOT be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.delete(`/users/${userId}`);
      setSuccess(`Teacher account for ${teacherName} has been permanently deleted!`);
      await fetchTeachers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Error deleting teacher:', err);
      const errorMsg = err.response?.data?.message || 'Error deleting teacher account';
      setError(`Failed to delete teacher: ${errorMsg}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelectionForSubjects = async (classId: string) => {
    if (!classId) {
      setSelectedClassForSubjects('');
      setAvailableSubjectsForClass([]);
      setSelectedSubjectIds([]);
      return;
    }

    setLoadingClassSubjects(true);
    setSelectedClassForSubjects(classId);
    setSelectedSubjectIds([]);
    setError('');

    try {
      const response = await apiClient.get(`/classes/${classId}/subjects`);
      // Handle both direct array and wrapped response
      let subjects = Array.isArray(response) ? response : (response?.data || response || []);
      
      // Strictly filter: Only include subjects that are confirmed to be assigned to this class
      // The backend should return subjects with class info, but we double-check
      subjects = subjects.filter((subject: any) => {
        // Must have class info that matches the selected class
        const hasMatchingClass = subject?.class?.id === classId;
        
        // Log for debugging
        if (subject && !hasMatchingClass) {
          console.warn('Subject filtered out - class mismatch:', {
            subjectId: subject.id,
            subjectName: subject.name,
            subjectClassId: subject?.class?.id,
            expectedClassId: classId
          });
        }
        
        return hasMatchingClass;
      });
      
      console.log(`Fetched ${subjects.length} subject(s) for class ${classId}:`, subjects.map((s: any) => s.name));
      setAvailableSubjectsForClass(subjects);
      
      // Clear any previous errors
      setError('');
      
      // Verify we got subjects for this class
      if (subjects.length === 0) {
        const className = classes.find(c => c.id === classId)?.name || 'this class';
        setError(`No subjects are assigned to ${className}. Please assign subjects to the class first on the Classes page.`);
      }
    } catch (error) {
      console.error('Error fetching class subjects:', error);
      setError('Failed to load subjects for this class. Please try again.');
      setAvailableSubjectsForClass([]);
    } finally {
      setLoadingClassSubjects(false);
    }
  };

  const toggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjectIds(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  const handleBulkAssignSubjects = async () => {
    if (!selectedTeacher?.id || !selectedClassForSubjects || selectedSubjectIds.length === 0) {
      setError('Please select a class and at least one subject');
      return;
    }

    try {
      setAssigningSubject(true);
      setError('');
      
      const results = {
        success: [] as string[],
        failed: [] as string[],
      };

      // Assign each selected subject
      for (const subjectId of selectedSubjectIds) {
        try {
          // Check if subject is already assigned to this teacher
          const isAlreadyAssigned = selectedTeacher.subjects?.some(
            (ts) => ts.subject.id === subjectId
          );

          if (isAlreadyAssigned) {
            const subjectName = availableSubjectsForClass.find(s => s.id === subjectId)?.name || 'Subject';
            results.failed.push(`${subjectName} (already assigned)`);
            continue;
          }

          await apiClient.post(`/subjects/${subjectId}/assign-teacher`, {
            teacherId: selectedTeacher.id,
          });

          const subjectName = availableSubjectsForClass.find(s => s.id === subjectId)?.name || 'Subject';
          results.success.push(subjectName);
        } catch (err: any) {
          const subjectName = availableSubjectsForClass.find(s => s.id === subjectId)?.name || 'Subject';
          const errorMsg = err.response?.data?.message || 'Error assigning subject';
          results.failed.push(`${subjectName} (${errorMsg})`);
        }
      }

      // Show results
      if (results.success.length > 0) {
        setSuccess(`${results.success.length} subject(s) assigned successfully: ${results.success.join(', ')}`);
      }
      if (results.failed.length > 0) {
        setError(`Failed to assign ${results.failed.length} subject(s): ${results.failed.join(', ')}`);
      }

      // Refresh teachers data
      const refreshedTeachers = await fetchTeachers();
      const updatedTeacher = refreshedTeachers.find((t: Teacher) => t.id === selectedTeacher.id);
      if (updatedTeacher) {
        setSelectedTeacher(updatedTeacher);
      }

      // Clear selections
      setSelectedSubjectIds([]);
      // Refresh subjects for the class
      await handleClassSelectionForSubjects(selectedClassForSubjects);

      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
    } catch (err: any) {
      console.error('Error in bulk assignment:', err);
      setError(err.response?.data?.message || 'Error assigning subjects');
    } finally {
      setAssigningSubject(false);
    }
  };

  const handleAssignSubject = async (subjectId: string) => {
    if (!selectedTeacher?.id) return;
    
    // Find the subject to show class selection
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    setSelectedSubjectForAssignment(subject);
    setShowClassSelection(true);
  };

  const handleOpenAssignmentModal = () => {
    setShowAssignmentModal(true);
    setSelectedSubjectId('');
    setSelectedClassId('');
    setAvailableSubjectsForClass([]);
    setError('');
    setSuccess('');
  };

  const handleClassChangeInModal = async (classId: string) => {
    setSelectedClassId(classId);
    setSelectedSubjectId(''); // Clear subject selection when class changes
    
    if (!classId) {
      setAvailableSubjectsForClass([]);
      return;
    }

    try {
      setLoadingClassSubjects(true);
      const response = await apiClient.get(`/classes/${classId}/subjects`);
      let subjects = Array.isArray(response) ? response : (response?.data || response || []);
      
      // Strictly filter: Only include subjects that are confirmed to be assigned to this class
      subjects = subjects.filter((subject: any) => {
        return subject?.class?.id === classId;
      });
      
      setAvailableSubjectsForClass(subjects);
    } catch (error) {
      console.error('Error fetching class subjects:', error);
      setError('Failed to load subjects for this class');
      setAvailableSubjectsForClass([]);
    } finally {
      setLoadingClassSubjects(false);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedTeacher || !selectedSubjectId || !selectedClassId) {
      setError('Please select both a subject and a class');
      return;
    }

    // Check if subject is already assigned to this teacher
    const isAlreadyAssigned = selectedTeacher.subjects?.some(
      (ts) => ts.subject.id === selectedSubjectId
    );

    if (isAlreadyAssigned) {
      const subjectName = availableSubjectsForClass.find(s => s.id === selectedSubjectId)?.name || subjects.find(s => s.id === selectedSubjectId)?.name || 'This subject';
      setError(`${subjectName} is already assigned to this teacher. Please use the Edit button to change the class instead.`);
      return;
    }

    try {
      setAssigningSubject(true);
      setError('');
      
      const subjectName = availableSubjectsForClass.find(s => s.id === selectedSubjectId)?.name || subjects.find(s => s.id === selectedSubjectId)?.name || 'Subject';
      
      // Remove classId - backend no longer requires it
      await apiClient.post(`/subjects/${selectedSubjectId}/assign-teacher`, {
        teacherId: selectedTeacher.id,
      });
      setSuccess(`${subjectName} assigned successfully!`);

      // Refresh teachers data
      const refreshedTeachers = await fetchTeachers();

      // Update selected teacher from refreshed data
      const updatedTeacher = refreshedTeachers.find((t: Teacher) => t.id === selectedTeacher.id);
      if (updatedTeacher) {
        setSelectedTeacher(updatedTeacher);
      }

      // Close assignment modal
      setShowAssignmentModal(false);
      setSelectedSubjectId('');
      setSelectedClassId('');
      // Clear class subjects when closing
      setAvailableSubjectsForClass([]);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error assigning subject:', err);
      const errorMessage = err.response?.data?.message || 'Error assigning subject';

      // Handle specific error cases
      if (err.response?.status === 409) {
        setError('Cannot assign: This subject is already assigned to this teacher. Refreshing data...');
        
        // Force refresh after showing error
        setTimeout(async () => {
          const refreshedTeachers = await fetchTeachers();
          const updatedTeacher = refreshedTeachers.find((t: Teacher) => t.id === selectedTeacher.id);
          if (updatedTeacher) {
            setSelectedTeacher(updatedTeacher);
          }
          setShowAssignmentModal(false);
          setSelectedSubjectId('');
          setSelectedClassId('');
          setError('');
        }, 2000);
      } else {
        setError(errorMessage);
        // Refresh data on any error
        await fetchTeachers();
      }
    } finally {
      setAssigningSubject(false);
    }
  };

  const handleConfirmClassAssignment = async (classId: string) => {
    if (!selectedTeacher?.id || !selectedSubjectForAssignment) return;
    
    // Check if subject is already assigned to this teacher
    const isAlreadyAssigned = selectedTeacher.subjects?.some(
      (ts) => ts.subject.id === selectedSubjectForAssignment.id
    );

    if (isAlreadyAssigned) {
      setError(`The subject "${selectedSubjectForAssignment.name}" is already assigned to this teacher. Please use the Edit button to change the class.`);
      setShowClassSelection(false);
      setSelectedSubjectForAssignment(null);
      return;
    }
    
    try {
      setAssigningSubject(true);
      setError('');
      await apiClient.post(`/subjects/${selectedSubjectForAssignment.id}/assign-teacher`, {
        teacherId: selectedTeacher.id,
        classId: classId,
      });
      setSuccess(`Subject "${selectedSubjectForAssignment.name}" assigned successfully!`);

      // Refresh teachers data
      const refreshedTeachers = await fetchTeachers();

      // Update selected teacher from refreshed data
      const updatedTeacher = refreshedTeachers.find((t: Teacher) => t.id === selectedTeacher.id);
      if (updatedTeacher) {
        setSelectedTeacher(updatedTeacher);
      }

      // Close class selection modal
      setShowClassSelection(false);
      setSelectedSubjectForAssignment(null);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error assigning subject:', err);
      const errorMessage = err.response?.data?.message || 'Error assigning subject';

      // Close modal on error
      setShowClassSelection(false);
      setSelectedSubjectForAssignment(null);

      // Handle specific error cases
      if (err.response?.status === 409) {
        setError(`Cannot assign: This subject is already assigned. Refreshing data...`);
        
        // Force refresh to sync with backend
        setTimeout(async () => {
          const refreshedTeachers = await fetchTeachers();
          const updatedTeacher = refreshedTeachers.find((t: Teacher) => t.id === selectedTeacher.id);
          if (updatedTeacher) {
            setSelectedTeacher(updatedTeacher);
          }
          setError('');
        }, 2000);
      } else {
        setError(errorMessage);
        // Refresh data on any error
        await fetchTeachers();
      }
    } finally {
      setAssigningSubject(false);
    }
  };

  const handleUnassignSubject = async (subjectId: string, subjectName: string) => {
    if (!selectedTeacher?.id) return;
    
    if (!confirm(`Are you sure you want to remove the subject "${subjectName}" from this teacher?\n\nNote: This will only unassign the subject. The teacher account will remain active.`)) {
      return;
    }
    
    try {
      setError('');
      const response = await apiClient.delete(`/subjects/${subjectId}/unassign-teacher/${selectedTeacher.id}`);
      // Show the message from backend (which includes info about removed students if applicable)
      const message = (response as any)?.message || `Subject "${subjectName}" has been unassigned successfully!`;
      setSuccess(message);
      
      // Refresh teachers data
      const refreshedTeachers = await fetchTeachers();
      
      // Update selected teacher from refreshed data
      const updatedTeacher = refreshedTeachers.find((t: Teacher) => t.id === selectedTeacher.id);
      if (updatedTeacher) {
        setSelectedTeacher(updatedTeacher);
      }
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Error unassigning subject:', err);
      setError(err.response?.data?.message || 'Error unassigning subject');
      
      // Refresh data to sync UI with backend
      const refreshedTeachers = await fetchTeachers();
      const updatedTeacher = refreshedTeachers.find((t: Teacher) => t.id === selectedTeacher.id);
      if (updatedTeacher) {
        setSelectedTeacher(updatedTeacher);
      }
    }
  };

  const handleRemoveAllAssignments = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Remove all subject-class assignments for ${teacherName}?\n\nThis will:\n- Remove ALL assigned subjects and classes\n- Keep the teacher account active\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher || !teacher.subjects || teacher.subjects.length === 0) {
        setError('No assignments to remove');
        setLoading(false);
        return;
      }

      // Remove all assignments one by one
      let totalRemovedStudents = 0;
      for (const ts of teacher.subjects) {
        const response = await apiClient.delete(`/subjects/${ts.subject.id}/unassign-teacher/${teacherId}`);
        const removedCount = (response as any)?.removedStudents || 0;
        totalRemovedStudents += removedCount;
      }

      let successMsg = `All assignments removed for ${teacherName}!`;
      if (totalRemovedStudents > 0) {
        successMsg += ` ${totalRemovedStudents} student(s) were automatically removed from subjects with no remaining teachers.`;
      }
      setSuccess(successMsg);
      const refreshedTeachers = await fetchTeachers();
      const updatedTeacher = refreshedTeachers.find((t: Teacher) => t.id === teacherId);
      if (updatedTeacher && selectedTeacher?.id === teacherId) {
        setSelectedTeacher(updatedTeacher);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error removing assignments:', err);
      setError(err.response?.data?.message || 'Error removing assignments');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (teacherId: string, teacherSubjectId: string, subjectName: string, teacherName: string) => {
    if (!confirm(`Remove "${subjectName}" assignment from ${teacherName}?\n\nThis will only remove this specific subject-class assignment.\nThe teacher account will remain active.`)) {
      return;
    }

    try {
      setLoading(true);
      // Find the teacher subject record to get the subject ID
      const teacher = teachers.find(t => t.id === teacherId);
      const teacherSubject = teacher?.subjects?.find(ts => ts.id === teacherSubjectId);
      
      if (!teacherSubject) {
        setError('Assignment not found');
        return;
      }

      const response = await apiClient.delete(`/subjects/${teacherSubject.subject.id}/unassign-teacher/${teacherId}`);
      const message = (response as any)?.message || `Assignment "${subjectName}" removed from ${teacherName}!`;
      setSuccess(message);
      
      const refreshedTeachers = await fetchTeachers();
      const updatedTeacher = refreshedTeachers.find((t: Teacher) => t.id === teacherId);
      if (updatedTeacher && selectedTeacher?.id === teacherId) {
        setSelectedTeacher(updatedTeacher);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error removing assignment:', err);
      setError(err.response?.data?.message || 'Error removing assignment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAssignment = (assignment: any) => {
    setEditingAssignment(assignment);
    setEditSubjectId(assignment.subject.id);
    setEditClassId(assignment.subject.class?.id || '');
    setShowEditModal(true);
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment || !selectedTeacher?.id || !editSubjectId || !editClassId) {
      setError('Please select both a subject and a class');
      return;
    }

    const newSubjectName = subjects.find(s => s.id === editSubjectId)?.name || 'Subject';
    const oldSubjectId = editingAssignment.subject.id;

    try {
      setAssigningSubject(true);
      setError('');
      
      // If changing to a different subject, check if it's already assigned
      if (oldSubjectId !== editSubjectId) {
        const isNewSubjectAssigned = selectedTeacher.subjects?.some(
          (ts) => ts.subject.id === editSubjectId
        );

        if (isNewSubjectAssigned) {
          setError(`Cannot update: The subject "${newSubjectName}" is already assigned to this teacher. Please choose a different subject or edit that assignment instead.`);
          setAssigningSubject(false);
          return;
        }
      }
      
      // First unassign the old subject
      const unassignResponse = await apiClient.delete(`/subjects/${oldSubjectId}/unassign-teacher/${selectedTeacher.id}`);
      const unassignMessage = (unassignResponse as any)?.message;
      
      // Small delay to ensure backend processes the deletion
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Then reassign with new subject and class
      await apiClient.post(`/subjects/${editSubjectId}/assign-teacher`, {
        teacherId: selectedTeacher.id,
        classId: editClassId,
      });
      
      // Include message about removed students if applicable
      let successMessage = `Assignment updated successfully to "${newSubjectName}"!`;
      if (unassignMessage && unassignMessage.includes('automatically removed')) {
        successMessage += ` Note: ${unassignMessage.split('automatically removed')[1]}`;
      }
      setSuccess(successMessage);

      // Refresh teachers data
      const refreshedTeachers = await fetchTeachers();

      // Update selected teacher from refreshed data
      const updatedTeacher = refreshedTeachers.find((t: Teacher) => t.id === selectedTeacher.id);
      if (updatedTeacher) {
        setSelectedTeacher(updatedTeacher);
      }

      // Close edit modal
      setShowEditModal(false);
      setEditingAssignment(null);
      setEditSubjectId('');
      setEditClassId('');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating assignment:', err);
      const errorMessage = err.response?.data?.message || 'Error updating assignment';
      
      if (err.response?.status === 409) {
        setError(`Cannot update: There was a conflict. Refreshing data...`);
        
        // Force refresh after showing error
        setTimeout(async () => {
          const refreshedTeachers = await fetchTeachers();
          const updatedTeacher = refreshedTeachers.find((t: Teacher) => t.id === selectedTeacher.id);
          if (updatedTeacher) {
            setSelectedTeacher(updatedTeacher);
          }
          setShowEditModal(false);
          setEditingAssignment(null);
          setEditSubjectId('');
          setEditClassId('');
          setError('');
        }, 2000);
      } else {
        setError(errorMessage);
        // Refresh data on any error
        await fetchTeachers();
      }
    } finally {
      setAssigningSubject(false);
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

  const filteredTeachers = teachers.filter((teacher) => {
    const fullName = `${teacher.user.firstName} ${teacher.user.lastName}`.toLowerCase();
    const email = teacher.user.email.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
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
                {t.admin.teachers}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <SettingsMenu onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Search and Actions Section */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search teachers by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredTeachers.length}</span> teacher{filteredTeachers.length !== 1 ? 's' : ''} found
            </div>
            <button
              onClick={handleOpenAssignmentModal}
              className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Assign Subject
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-700 font-medium">{success}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{t.common.loading}</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Total teachers: {filteredTeachers.length}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white shadow-md rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-purple-500 to-indigo-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Subjects
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {teacher.user.firstName[0]}{teacher.user.lastName[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {teacher.user.firstName} {teacher.user.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{teacher.user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {teacher.subjects && teacher.subjects.length > 0 ? (
                            teacher.subjects
                              .filter((ts, index, self) => 
                                // Remove duplicates based on subject.id and class.id combination
                                index === self.findIndex(t => 
                                  t.subject.id === ts.subject.id && 
                                  getClassId(t.subject) === getClassId(ts.subject)
                                )
                              )
                              .map((ts) => {
                                const subjectClass = resolveSubjectClass(ts.subject);
                                const className = subjectClass?.name || 'No Class';
                                const gradeTooltip = subjectClass?.grade ? `Grade: ${subjectClass.grade}` : undefined;
                                return (
                                  <div
                                    key={ts.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 group"
                                  >
                                    <span title={gradeTooltip}>
                                      {ts.subject.name} - {className}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteAssignment(teacher.id, ts.id, ts.subject.name, `${teacher.user.firstName} ${teacher.user.lastName}`)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-teal-200 rounded-full p-0.5"
                                      title={`Remove ${ts.subject.name} assignment`}
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                );
                              })
                          ) : (
                            <span className="text-xs text-gray-400 italic">No subjects assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleManageSubjects(teacher)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemoveAllAssignments(teacher.id, `${teacher.user.firstName} ${teacher.user.lastName}`)}
                            disabled={!teacher.subjects || teacher.subjects.length === 0}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remove all subject-class assignments (keeps account)"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Clear All
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(teacher.user.id, `${teacher.user.firstName} ${teacher.user.lastName}`)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            title="Permanently delete this teacher's account"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Account
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredTeachers.map((teacher) => (
                <div key={teacher.id} className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-purple-500 hover:shadow-xl transition-shadow duration-200">
                  {/* Header Section */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 h-14 w-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-lg">
                          {teacher.user.firstName[0]}{teacher.user.lastName[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-lg truncate">
                          {teacher.user.firstName} {teacher.user.lastName}
                        </div>
                        <div className="text-sm text-gray-600 truncate">{teacher.user.email}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Joined: {new Date(teacher.hireDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex-shrink-0">
                      Active
                    </span>
                  </div>
                  
                  {/* Subjects Section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-gray-700">Assigned Subjects</div>
                      <div className="text-xs text-gray-500">
                        {teacher.subjects?.length || 0} assignment{(teacher.subjects?.length || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {teacher.subjects && teacher.subjects.length > 0 ? (
                        teacher.subjects
                          .filter((ts, index, self) => 
                            // Remove duplicates based on subject.id and class.id combination
                            index === self.findIndex(t => 
                              t.subject.id === ts.subject.id && 
                              getClassId(t.subject) === getClassId(ts.subject)
                            )
                          )
                          .map((ts) => {
                            const subjectClass = resolveSubjectClass(ts.subject);
                            const className = subjectClass?.name || 'No Class';
                            const gradeLabel = subjectClass?.grade ? ` • Grade: ${subjectClass.grade}` : '';
                            return (
                              <div
                                key={ts.id}
                                className="flex items-center justify-between bg-teal-50 rounded-lg p-3 border border-teal-200 group hover:bg-teal-100 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-teal-900 text-sm">
                                    {ts.subject.name}
                                  </div>
                                  <div className="text-xs text-teal-700">
                                    Class: {className}
                                    {gradeLabel}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteAssignment(teacher.id, ts.id, ts.subject.name, `${teacher.user.firstName} ${teacher.user.lastName}`)}
                                  className="ml-2 p-1.5 text-teal-600 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                  title={`Remove ${ts.subject.name} assignment`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })
                      ) : (
                        <div className="text-center py-4 text-gray-400">
                          <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                          </svg>
                          <div className="text-sm">No subjects assigned</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {/* Primary Actions Row */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleManageSubjects(teacher)}
                        className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Manage Subjects
                      </button>
                      <button
                        onClick={() => handleRemoveAllAssignments(teacher.id, `${teacher.user.firstName} ${teacher.user.lastName}`)}
                        disabled={!teacher.subjects || teacher.subjects.length === 0}
                        className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                        title="Remove all subject-class assignments (keeps account)"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Clear All
                      </button>
                    </div>
                    
                    {/* Danger Action Row */}
                    <button
                      onClick={() => handleDeleteTeacher(teacher.user.id, `${teacher.user.firstName} ${teacher.user.lastName}`)}
                      className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                      title="Permanently delete this teacher's account"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Teacher Account
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {filteredTeachers.length > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
                showLimitSelector={true}
              />
            )}

            {filteredTeachers.length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-xl shadow-md">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t.users?.noUsers || 'No teachers found'}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search' : 'No teachers have been added yet'}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Subject Management Modal */}
      {showSubjectModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Manage Subjects
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedTeacher.user.firstName} {selectedTeacher.user.lastName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSubjectModal(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Messages */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-700 text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-700 text-sm font-medium">{success}</span>
                  </div>
                </div>
              )}

              {/* Assigned Subjects */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Currently Assigned Subjects</h4>
                {selectedTeacher.subjects && selectedTeacher.subjects.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTeacher.subjects
                      .filter((ts, index, self) => 
                        // Remove duplicates based on subject.id and class.id combination
                        index === self.findIndex(t => 
                          t.subject.id === ts.subject.id && 
                          getClassId(t.subject) === getClassId(ts.subject)
                        )
                      )
                      .map((ts) => (
                      <div key={ts.id} className="flex items-center justify-between bg-teal-50 p-3 rounded-lg border border-teal-200">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {ts.subject.name} - {getClassName(ts.subject)}
                          </div>
                          {ts.subject.code && (
                            <div className="text-xs text-gray-600">Code: {ts.subject.code}</div>
                          )}
                          {getClassGrade(ts.subject) && (
                            <div className="text-xs text-gray-600">Grade: {getClassGrade(ts.subject)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditAssignment(ts)}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium transition-colors"
                            title="Edit assignment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleUnassignSubject(ts.subject.id, ts.subject.name)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium transition-colors"
                            title="Remove subject assignment (teacher account will remain)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">No subjects currently assigned</p>
                )}
              </div>

              {/* Class Selection (Required) */}
              <div className="mb-6">
                <label htmlFor="class-select" className="block text-sm font-semibold text-gray-900 mb-2">
                  Select Class (Required) *
                </label>
                <select
                  id="class-select"
                  value={selectedClassForSubjects}
                  onChange={(e) => handleClassSelectionForSubjects(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                  required
                >
                  <option value="">-- Select a Class --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}{cls.grade ? ` - Grade ${cls.grade}` : ''}
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="text-sm text-gray-500 italic mt-2">No classes available</p>
                )}
              </div>

              {/* Available Subjects - Only show after class is selected */}
              {!selectedClassForSubjects ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 text-sm font-medium mt-2">Please select a class first</p>
                  <p className="text-gray-400 text-xs mt-1">Subjects assigned to the selected class will appear here</p>
                </div>
              ) : loadingClassSubjects ? (
                <div className="text-center py-8">
                  <LoadingSpinner size="md" />
                  <p className="text-gray-500 text-sm mt-2">Loading subjects...</p>
                </div>
              ) : (
                <div>
                  {/* Show selected class info */}
                  {selectedClassForSubjects && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Showing subjects for: {classes.find(c => c.id === selectedClassForSubjects)?.name || 'Selected Class'}
                        {availableSubjectsForClass.length > 0 && (
                          <span className="ml-2 text-blue-600">({availableSubjectsForClass.length} subject{availableSubjectsForClass.length !== 1 ? 's' : ''} available)</span>
                        )}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">
                      Available Subjects
                      {selectedSubjectIds.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-purple-600">
                          ({selectedSubjectIds.length} selected)
                        </span>
                      )}
                    </h4>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableSubjectsForClass.length === 0 ? (
                      <div className="text-center py-8">
                        <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 text-sm italic mt-2">
                          No subjects are assigned to this class. Please assign subjects to the class first on the Classes page.
                        </p>
                      </div>
                    ) : (
                      availableSubjectsForClass
                        .filter(
                          (subject) =>
                            !selectedTeacher.subjects?.some((ts) => ts.subject.id === subject.id)
                        )
                        .map((subject) => (
                        <div key={subject.id} className={`flex items-center gap-3 bg-gray-50 p-3 rounded-lg border-2 transition-colors ${
                          selectedSubjectIds.includes(subject.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedSubjectIds.includes(subject.id)}
                            onChange={() => toggleSubjectSelection(subject.id)}
                            disabled={assigningSubject}
                            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{subject.name}</div>
                            {subject.code && (
                              <div className="text-xs text-gray-600">Code: {subject.code}</div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {availableSubjectsForClass.length > 0 && 
                     availableSubjectsForClass.filter(
                       (subject) =>
                         !selectedTeacher.subjects?.some((ts) => ts.subject.id === subject.id)
                     ).length === 0 && (
                      <div className="text-center py-8">
                        <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 text-sm italic mt-2">
                          All subjects for this class have been assigned to this teacher
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Bulk Assign Button */}
                  {selectedSubjectIds.length > 0 && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleBulkAssignSubjects}
                        disabled={assigningSubject || selectedSubjectIds.length === 0}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {assigningSubject ? (
                          <>
                            <LoadingSpinner size="sm" />
                            Assigning...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Assign {selectedSubjectIds.length} Subject{selectedSubjectIds.length !== 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowSubjectModal(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class Selection Modal */}
      {showClassSelection && selectedSubjectForAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Select Class for Subject</h3>
                <button
                  onClick={() => {
                    setShowClassSelection(false);
                    setSelectedSubjectForAssignment(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">Subject to Assign</h4>
                      <p className="text-blue-700 text-sm">{selectedSubjectForAssignment.name}</p>
                      {selectedSubjectForAssignment.code && (
                        <p className="text-blue-600 text-xs">Code: {selectedSubjectForAssignment.code}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select the class for this subject:
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {classes.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => handleConfirmClassAssignment(cls.id)}
                      disabled={assigningSubject}
                      className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{cls.name}</div>
                          {cls.grade && (
                            <div className="text-sm text-gray-600">Grade: {cls.grade}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                  {classes.length === 0 && (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <p className="text-gray-500 text-sm mt-2">No classes available</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowClassSelection(false);
                    setSelectedSubjectForAssignment(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {showEditModal && editingAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Teacher Assignment</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAssignment(null);
                    setEditSubjectId('');
                    setEditClassId('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">Current Assignment</h4>
                      <p className="text-blue-700 text-sm">{editingAssignment.subject.name}</p>
                      {resolveSubjectClass(editingAssignment.subject) && (
                        <p className="text-blue-600 text-xs">
                          Class: {getClassName(editingAssignment.subject)}
                          {getClassGrade(editingAssignment.subject) && ` - ${getClassGrade(editingAssignment.subject)}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subject Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Subject
                </label>
                <select
                  value={editSubjectId}
                  onChange={(e) => setEditSubjectId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a subject...</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} {subject.code ? `(${subject.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Class
                </label>
                <select
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.grade ? `- Grade ${cls.grade}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAssignment(null);
                    setEditSubjectId('');
                    setEditClassId('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAssignment}
                  disabled={assigningSubject || !editSubjectId || !editClassId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {assigningSubject ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Update Assignment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Assign Subject to Teacher
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select both a subject and a class for assignment
                  </p>
                </div>
                <button
                  onClick={() => setShowAssignmentModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Teacher Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Teacher
                </label>
                <select
                  value={selectedTeacher?.id || ''}
                  onChange={(e) => {
                    const teacher = teachers.find(t => t.id === e.target.value);
                    setSelectedTeacher(teacher || null);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Choose a teacher...</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.user.firstName} {teacher.user.lastName} ({teacher.user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Selection (Required First) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Class (Required) *
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassChangeInModal(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Choose a class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}{cls.grade ? ` - Grade ${cls.grade}` : ''}
                    </option>
                  ))}
                </select>
                {loadingClassSubjects && (
                  <p className="text-sm text-gray-500 mt-2">Loading subjects...</p>
                )}
              </div>

              {/* Subject Selection - Only show after class is selected */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Subject {selectedClassId && `(for ${classes.find(c => c.id === selectedClassId)?.name || 'selected class'})`}
                </label>
                {!selectedClassId ? (
                  <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                    Please select a class first
                  </div>
                ) : availableSubjectsForClass.length === 0 ? (
                  <div className="w-full p-3 border border-gray-300 rounded-lg bg-yellow-50 text-yellow-700 text-sm">
                    No subjects are assigned to this class. Please assign subjects to the class first on the Classes page.
                  </div>
                ) : (
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Choose a subject...</option>
                    {availableSubjectsForClass
                      .filter(
                        (subject) =>
                          !selectedTeacher?.subjects?.some((ts) => ts.subject.id === subject.id)
                      )
                      .map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} {subject.code ? `(${subject.code})` : ''}
                        </option>
                      ))}
                  </select>
                )}
                {selectedClassId && availableSubjectsForClass.length > 0 && 
                 availableSubjectsForClass.filter(
                   (subject) =>
                     !selectedTeacher?.subjects?.some((ts) => ts.subject.id === subject.id)
                 ).length === 0 && (
                  <p className="text-sm text-gray-500 mt-2 italic">
                    All subjects for this class have been assigned to this teacher
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-700 text-sm">{success}</span>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssignment}
                  disabled={assigningSubject || !selectedTeacher || !selectedSubjectId || !selectedClassId}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {assigningSubject ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Assign Subject
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

