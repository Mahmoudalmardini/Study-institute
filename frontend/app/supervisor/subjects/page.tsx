'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import apiClient from '@/lib/api-client';

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  class: {
    id: string;
    name: string;
    grade: string;
  };
  teachers: Array<{
    teacher: {
      id: string;
      user: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
  _count?: {
    students: number;
    teachers: number;
  };
}

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface Teacher {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export default function SubjectsPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
  });
  const [teacherFormData, setTeacherFormData] = useState({
    teacherId: '',
  });
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setUser({ name: 'Administrator', role: 'ADMIN' });
    setMounted(true);
    fetchData();
  }, [router]);

  useEffect(() => {
    if (!loading) {
      fetchSubjects();
    }
  }, [selectedClassFilter]);

  const fetchData = async () => {
    await Promise.all([
      fetchClasses(),
      fetchTeachers(),
      fetchSubjects(),
    ]);
  };

  const fetchSubjects = async () => {
    try {
      const url = selectedClassFilter 
        ? `/subjects?classId=${selectedClassFilter}` 
        : '/subjects';
      const data = await apiClient.get(url);
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects([]);
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await apiClient.get('/classes');
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      
      if (editingSubject) {
        await apiClient.patch(`/subjects/${editingSubject.id}`, formData);
        setSuccess('Subject updated successfully!');
      } else {
        await apiClient.post('/subjects', formData);
        setSuccess('Subject created successfully!');
      }
      
      setShowForm(false);
      setEditingSubject(null);
      setFormData({ name: '' });
      fetchSubjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error saving subject:', error);
      setError(error.response?.data?.message || 'Error saving subject');
    }
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await apiClient.post(`/subjects/${selectedSubject?.id}/assign-teacher`, {
        teacherId: teacherFormData.teacherId,
      });
      setSuccess('Teacher assigned successfully!');
      setTeacherFormData({ teacherId: '' });
      fetchSubjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error assigning teacher:', error);
      setError(error.response?.data?.message || 'Error assigning teacher');
    }
  };

  const handleUnassignTeacher = async (subjectId: string, teacherId: string) => {
    if (!confirm(t.subjects?.confirmUnassign || 'Are you sure you want to unassign this teacher?')) {
      return;
    }
    try {
      setError('');
      const response = await apiClient.delete(`/subjects/${subjectId}/unassign-teacher/${teacherId}`);
      const message = (response as any)?.message || 'Teacher unassigned successfully!';
      setSuccess(message);
      fetchSubjects();
      setTimeout(() => setSuccess(''), 5000);
    } catch (error: any) {
      console.error('Error unassigning teacher:', error);
      setError(error.response?.data?.message || 'Error unassigning teacher');
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.subjects?.confirmDelete || 'Are you sure you want to delete this subject?')) {
      return;
    }
    try {
      setError('');
      await apiClient.delete(`/subjects/${id}`);
      setSuccess('Subject deleted successfully!');
      fetchSubjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      setError(error.response?.data?.message || 'Error deleting subject');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSubject(null);
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

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subject.code && subject.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (subject.class && subject.class.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gradient-bg">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">{t.subjects?.loading || 'Loading...'}</p>
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
                onClick={() => router.push('/supervisor')}
                className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0 hover:bg-white/30 transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                <span className="hidden sm:inline">{t.common.appName} - </span>
                Subjects Management
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
        <div className={`mb-8 p-6 sm:p-8 bg-white rounded-2xl shadow-lg border-l-4 border-teal-600 ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Subjects Management 📖
              </h2>
              <p className="text-gray-600 text-base sm:text-lg">
                Manage subjects, assign teachers, and organize your curriculum
              </p>
            </div>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className={`mb-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between ${mounted ? 'animate-slide-up stagger-1' : 'opacity-0'}`}>
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            >
              <option value="">{t.subjects?.allClasses || 'All Classes'}</option>
              {(classes || []).map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.grade}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="gradient-primary text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all hover-lift font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.subjects?.addSubject || 'Add Subject'}
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
          <div className={`mb-8 p-6 sm:p-8 bg-white rounded-2xl shadow-lg border-l-4 border-teal-600 ${mounted ? 'animate-slide-up stagger-2' : 'opacity-0'}`}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingSubject ? (t.subjects?.editSubject || 'Edit Subject') : (t.subjects?.addNewSubject || 'Add New Subject')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t.subjects?.subjectName || 'Subject Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="e.g., Mathematics, Physics, English, etc."
                  required
                  autoFocus
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter the subject name. Other details can be added later when editing.
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
                  {editingSubject ? (t.subjects?.updateSubject || 'Update Subject') : (t.subjects?.createSubject || 'Create Subject')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  {t.subjects?.cancel || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Subjects Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${mounted ? 'animate-slide-up stagger-3' : 'opacity-0'}`}>
          {filteredSubjects.map((subject, index) => (
            <div
              key={subject.id}
              className="bg-white rounded-2xl shadow-lg hover-lift p-6 border border-gray-100"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-600 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedSubject(subject);
                      setShowTeacherForm(true);
                    }}
                    className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Manage Teachers"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEdit(subject)}
                    className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">{subject.name}</h3>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {subject.code && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">{subject.code}</span>
                  </div>
                )}
                {subject.class ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
                    </svg>
                    <span>{subject.class.name} - {subject.class.grade}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-amber-600 italic">No class assigned</span>
                  </div>
                )}
              </div>
              
              {subject.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{subject.description}</p>
              )}
              
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-teal-600">{subject._count?.students || 0}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Students</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-green-600">{subject._count?.teachers || 0}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Teachers</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredSubjects.length === 0 && !loading && (
          <div className={`text-center py-12 ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No subjects found' : 'No subjects yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first subject'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                className="gradient-primary text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-medium"
              >
                Create First Subject
              </button>
            )}
          </div>
        )}
      </main>

      {/* Teacher Assignment Modal */}
      {showTeacherForm && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {t.subjects?.manageTeachers || 'Manage Teachers'} - {selectedSubject.name}
                </h3>
                <button
                  onClick={() => {
                    setShowTeacherForm(false);
                    setSelectedSubject(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2">{t.subjects?.assignedTeachers || 'Assigned Teachers'}</h4>
                {selectedSubject.teachers.length > 0 ? (
                  <ul className="space-y-2">
                    {(selectedSubject.teachers || []).map((assignment) => (
                      <li key={assignment.teacher.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <span>
                          {assignment.teacher.user.firstName} {assignment.teacher.user.lastName}
                        </span>
                        <button
                          onClick={() => handleUnassignTeacher(selectedSubject.id, assignment.teacher.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          {t.subjects?.unassign || 'Unassign'}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">{t.subjects?.noTeachersAssigned || 'No teachers assigned'}</p>
                )}
              </div>

              <form onSubmit={handleTeacherSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t.subjects?.assignTeacher || 'Assign Teacher'}
                  </label>
                  <select
                    value={teacherFormData.teacherId}
                    onChange={(e) => setTeacherFormData({ teacherId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="">{t.subjects?.selectTeacher || 'Select Teacher'}</option>
                    {(teachers || []).map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.user.firstName} {teacher.user.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="gradient-primary text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all font-medium flex-1"
                  >
                    {t.subjects?.assign || 'Assign'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTeacherForm(false);
                      setSelectedSubject(null);
                    }}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-all font-medium"
                  >
                    {t.subjects?.close || 'Close'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}