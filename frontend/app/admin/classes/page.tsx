'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Pagination from '@/components/ui/Pagination';
import apiClient from '@/lib/api-client';

interface Class {
  id: string;
  name: string;
  grade: string;
  academicYear: string;
  teacher?: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  _count?: {
    students: number;
    subjects: number;
  };
}

interface Teacher {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Subject {
  id: string;
  name: string;
  code?: string;
  description?: string;
  classId?: string;
}

export default function ClassesPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedClassForSubjects, setSelectedClassForSubjects] = useState<Class | null>(null);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<Array<Subject & { monthlyInstallment?: number }>>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Array<{ subjectId: string; monthlyInstallment?: number }>>([]);
  const [subjectModalLoading, setSubjectModalLoading] = useState(false);
  const [editingInstallmentSubjectId, setEditingInstallmentSubjectId] = useState<string | null>(null);
  const [editingInstallmentValue, setEditingInstallmentValue] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setUser({ name: 'Administrator', role: 'ADMIN' });
    setMounted(true);
    fetchClasses();
    fetchTeachers();
  }, [router, page, limit]);

  const fetchClasses = async () => {
    try {
      const data = await apiClient.get(`/classes?page=${page}&limit=${limit}`);
      const classesData = data?.data || (Array.isArray(data) ? data : []);
      const meta = data?.meta || { total: classesData.length, totalPages: 1 };
      
      setClasses(Array.isArray(classesData) ? classesData : []);
      if (meta) {
        setTotal(meta.total || 0);
        setTotalPages(meta.totalPages || 1);
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      
      let errorMessage = 'Failed to load classes';
      
      if (error.response) {
        const status = error.response.status;
        
        if (status === 429) {
          // Rate limit hit - don't logout, retry after delay
          errorMessage = 'Too many requests. Please wait a moment...';
          setError(errorMessage);
          setTimeout(() => {
            fetchClasses();
          }, 2000);
          return;
        } else if (status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          router.push('/login');
          return;
        }
      }
      
      setClasses([]);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const data = await apiClient.get('/teachers');
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
    }
  };

  const fetchAllSubjects = async () => {
    try {
      const data = await apiClient.get('/subjects');
      setAllSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setAllSubjects([]);
    }
  };

  const fetchClassSubjects = async (classId: string) => {
    try {
      const data = await apiClient.get(`/classes/${classId}/subjects`);
      setAssignedSubjects(data || []);
      // Don't reset selectedSubjectIds here - only update assignedSubjects
      // selectedSubjectIds should only be set when user manually selects/deselects
    } catch (error) {
      console.error('Error fetching class subjects:', error);
      setAssignedSubjects([]);
    }
  };

  const handleOpenSubjectModal = async (cls: Class) => {
    setSelectedClassForSubjects(cls);
    setShowSubjectModal(true);
    setSubjectModalLoading(true);
    setError('');
    setSuccess('');
    // Clear selected subjects when opening modal
    setSelectedSubjects([]);
    
    try {
      await Promise.all([
        fetchAllSubjects(),
        fetchClassSubjects(cls.id),
      ]);
    } catch (error) {
      console.error('Error loading subjects:', error);
      setError('Failed to load subjects');
    } finally {
      setSubjectModalLoading(false);
    }
  };

  const handleCloseSubjectModal = () => {
    setShowSubjectModal(false);
    setSelectedClassForSubjects(null);
    setAllSubjects([]);
    setAssignedSubjects([]);
    setSelectedSubjects([]);
    setEditingInstallmentSubjectId(null);
    setEditingInstallmentValue('');
    setError('');
    setSuccess('');
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev => {
      if (prev.find(s => s.subjectId === subjectId)) {
        return prev.filter(s => s.subjectId !== subjectId);
      } else {
        return [...prev, { subjectId, monthlyInstallment: 0 }];
      }
    });
  };

  const updateSubjectInstallment = (subjectId: string, value: string) => {
    setSelectedSubjects(prev => 
      prev.map(s => 
        s.subjectId === subjectId 
          ? { ...s, monthlyInstallment: value === '' ? undefined : parseFloat(value) }
          : s
      )
    );
  };

  const handleAssignSubjects = async () => {
    if (!selectedClassForSubjects) return;
    
    try {
      setError('');
      setSubjectModalLoading(true);
      
      // Only assign subjects that are not already assigned
      const subjectsToAssign = selectedSubjects.filter(
        s => !assignedSubjects.find(as => as.id === s.subjectId)
      );
      
      if (subjectsToAssign.length === 0) {
        setError('Selected subjects are already assigned to this class');
        setSubjectModalLoading(false);
        return;
      }
      
      // Validate that all subjects have monthlyInstallment
      const subjectsWithoutInstallment = subjectsToAssign.filter(
        s => s.monthlyInstallment === undefined || s.monthlyInstallment === null || isNaN(Number(s.monthlyInstallment))
      );
      
      if (subjectsWithoutInstallment.length > 0) {
        setError('Please specify monthly installment amount for all selected subjects');
        setSubjectModalLoading(false);
        return;
      }
      
      await apiClient.post(`/classes/${selectedClassForSubjects.id}/subjects`, {
        subjects: subjectsToAssign.map(s => ({
          subjectId: s.subjectId,
          monthlyInstallment: Number(s.monthlyInstallment),
        })),
      });
      
      // Refresh assigned subjects to get updated data with installments
      await handleOpenSubjectModal(selectedClassForSubjects);
      
      setSuccess('Subjects assigned successfully!');
      // Clear selected subjects after successful assignment
      setSelectedSubjects([]);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error assigning subjects:', error);
      setError(error.response?.data?.message || 'Error assigning subjects');
    } finally {
      setSubjectModalLoading(false);
    }
  };

  const handleUpdateInstallment = async (subjectId: string) => {
    if (!selectedClassForSubjects) return;
    
    try {
      setError('');
      const value = editingInstallmentValue === '' ? null : parseFloat(editingInstallmentValue);
      
      await apiClient.patch(
        `/classes/${selectedClassForSubjects.id}/subjects/${subjectId}/installment`,
        { monthlyInstallment: value }
      );
      
      // Update local state
      setAssignedSubjects(prev =>
        prev.map(s =>
          s.id === subjectId
            ? { ...s, monthlyInstallment: value ?? undefined }
            : s
        )
      );
      
      setEditingInstallmentSubjectId(null);
      setEditingInstallmentValue('');
      setSuccess('Installment updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating installment:', error);
      setError(error.response?.data?.message || 'Error updating installment');
    }
  };

  const handleUnassignSubject = async (subjectId: string) => {
    if (!selectedClassForSubjects) return;
    
    if (!confirm('Are you sure you want to unassign this subject from the class?')) {
      return;
    }
    
    try {
      setError('');
      await apiClient.delete(`/classes/${selectedClassForSubjects.id}/subjects/${subjectId}`);
      
      // Update assignedSubjects immediately by removing the unassigned subject
      setAssignedSubjects(prev => prev.filter(subject => subject.id !== subjectId));
      
      // Update classes state to reflect new subject count
      setClasses(prev => prev.map(cls => 
        cls.id === selectedClassForSubjects.id
          ? { ...cls, _count: { ...cls._count, subjects: Math.max(0, (cls._count?.subjects || 0) - 1) } }
          : cls
      ));
      
      setSuccess('Subject unassigned successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error unassigning subject:', error);
      setError(error.response?.data?.message || 'Error unassigning subject');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      
      if (editingClass) {
        await apiClient.patch(`/classes/${editingClass.id}`, formData);
        setSuccess('Class updated successfully!');
      } else {
        await apiClient.post('/classes', formData);
        setSuccess('Class created successfully!');
      }
      
      setShowForm(false);
      setEditingClass(null);
      setFormData({ name: '' });
      fetchClasses();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error saving class:', error);
      setError(error.response?.data?.message || 'Error saving class');
    }
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.classes?.confirmDelete || 'Are you sure you want to delete this class?')) {
      return;
    }
    try {
      setError('');
      await apiClient.delete(`/classes/${id}`);
      setSuccess('Class deleted successfully!');
      fetchClasses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error deleting class:', error);
      setError(error.response?.data?.message || 'Error deleting class');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingClass(null);
    setFormData({ name: '' });
    setError('');
    setSuccess('');
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    }
  };

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.academicYear.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gradient-bg">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">{t.classes?.loading || 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <nav className="gradient-primary shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1 gap-3">
              <button
                onClick={() => router.push('/admin')}
                className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0 hover:bg-white/30 transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                  <path d="M3.5 9.289l6.106 2.617a1 1 0 00.788 0L16.5 9.29V13.5a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 013.5 13.5V9.289z" />
                </svg>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                <span className="hidden sm:inline">{t.common.appName} - </span>
                Classes Management
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <span className="hidden md:inline text-sm text-white/90 font-medium">
                {t.admin.welcome}, {user?.name}
              </span>
              <SettingsMenu onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className={`mb-8 p-6 sm:p-8 bg-white rounded-2xl shadow-lg border-l-4 border-cyan-600 ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Classes Management 📚
              </h2>
              <p className="text-gray-600 text-base sm:text-lg">
                Manage classes, assign teachers, and organize your educational structure
              </p>
            </div>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className={`mb-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between ${mounted ? 'animate-slide-up stagger-1' : 'opacity-0'}`}>
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="gradient-primary text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all hover-lift font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.classes?.addClass || 'Add Class'}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className={`mb-6 p-4 bg-red-50 border border-red-200 rounded-xl ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className={`mb-6 p-4 bg-green-50 border border-green-200 rounded-xl ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-700 font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className={`mb-8 p-6 sm:p-8 bg-white rounded-2xl shadow-lg border-l-4 border-cyan-600 ${mounted ? 'animate-slide-up stagger-2' : 'opacity-0'}`}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingClass ? (t.classes?.editClass || 'Edit Class') : (t.classes?.addNewClass || 'Add New Class')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t.classes?.className || 'Class Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  placeholder="e.g., Grade 10A, Class 1B, Year 12, etc."
                  required
                  autoFocus
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter the class name. Other details (grade, academic year, teacher) can be added later when editing.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  className="gradient-primary text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editingClass ? (t.classes?.updateClass || 'Update Class') : (t.classes?.createClass || 'Create Class')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  {t.classes?.cancel || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Classes Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${mounted ? 'animate-slide-up stagger-3' : 'opacity-0'}`}>
          {filteredClasses.map((cls, index) => (
            <div
              key={cls.id}
              className="bg-white rounded-2xl shadow-lg hover-lift p-6 border border-gray-100"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenSubjectModal(cls)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Assign Subjects"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEdit(cls)}
                    className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(cls.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">{cls.name}</h3>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {cls.grade ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span>{cls.grade}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-amber-600 italic">No grade set</span>
                  </div>
                )}
                {cls.academicYear ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span>{cls.academicYear}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-amber-600 italic">No year set</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-cyan-600">{cls._count?.students || 0}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Students</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-blue-600">{cls._count?.subjects || 0}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Subjects</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {filteredClasses.length > 0 && (
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

        {/* Empty State */}
        {filteredClasses.length === 0 && !loading && (
          <div className={`text-center py-12 ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No classes found' : 'No classes yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first class'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                className="gradient-primary text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-medium"
              >
                Create First Class
              </button>
            )}
          </div>
        )}
      </main>

      {/* Subject Assignment Modal */}
      {showSubjectModal && selectedClassForSubjects && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Assign Subjects - {selectedClassForSubjects.name}
                </h2>
                <button
                  onClick={handleCloseSubjectModal}
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
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {subjectModalLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <>
                  {/* Currently Assigned Subjects */}
                  {assignedSubjects.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Currently Assigned Subjects ({assignedSubjects.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                        {assignedSubjects.map((subject) => (
                          <div
                            key={subject.id}
                            className="p-4 bg-green-50 border-2 border-green-200 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{subject.name}</p>
                                {subject.code && (
                                  <p className="text-sm text-gray-600">{subject.code}</p>
                                )}
                                {subject.monthlyInstallment !== undefined && subject.monthlyInstallment !== null && (
                                  <p className="text-sm font-medium text-green-700 mt-1">
                                    ${typeof subject.monthlyInstallment === 'number' 
                                      ? subject.monthlyInstallment.toFixed(2) 
                                      : parseFloat(String(subject.monthlyInstallment || 0)).toFixed(2)}/month
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleUnassignSubject(subject.id)}
                                className="ml-2 text-red-600 hover:text-red-800 p-1"
                                title="Unassign"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            {editingInstallmentSubjectId === subject.id ? (
                              <div className="mt-3 pt-3 border-t border-green-200">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Monthly Installment
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editingInstallmentValue}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        setEditingInstallmentValue(value);
                                      }
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="0.00"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleUpdateInstallment(subject.id)}
                                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingInstallmentSubjectId(null);
                                      setEditingInstallmentValue('');
                                    }}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingInstallmentSubjectId(subject.id);
                                  setEditingInstallmentValue(subject.monthlyInstallment?.toString() || '');
                                }}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {subject.monthlyInstallment !== undefined ? 'Edit Installment' : 'Set Installment'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available Subjects */}
                  <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                        Available Subjects ({selectedSubjects.length} selected)
                      </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto p-2">
                      {allSubjects
                        .filter(subject => !assignedSubjects.find(as => as.id === subject.id))
                        .map((subject) => {
                          const isSelected = selectedSubjects.find(s => s.subjectId === subject.id);
                          const selectedSubject = selectedSubjects.find(s => s.subjectId === subject.id);
                          return (
                            <div
                              key={subject.id}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 shadow-md'
                                  : 'border-gray-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">{subject.name}</p>
                                  {subject.code && (
                                    <p className="text-sm text-gray-600">{subject.code}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => toggleSubject(subject.id)}
                                  className="ml-2"
                                >
                                  {isSelected ? (
                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                              {isSelected && (
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Monthly Installment <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={selectedSubject?.monthlyInstallment?.toString() || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        updateSubjectInstallment(subject.id, value);
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="0.00"
                                  />
                                  <p className="mt-1 text-xs text-gray-500">Required: Enter the monthly installment amount for this subject in this class</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    {allSubjects.filter(subject => !assignedSubjects.find(as => as.id === subject.id)).length === 0 && (
                      <p className="text-center text-gray-500 py-8">All subjects are already assigned to this class</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCloseSubjectModal}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl hover:bg-gray-200 transition-all font-medium"
              >
                Close
              </button>
              <button
                onClick={handleAssignSubjects}
                disabled={subjectModalLoading || selectedSubjects.length === 0}
                className="gradient-primary text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subjectModalLoading ? 'Assigning...' : `Assign ${selectedSubjects.length} Subject${selectedSubjects.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

