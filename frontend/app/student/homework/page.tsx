'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SettingsMenu from '@/components/SettingsMenu';

interface HomeworkSubmission {
  id: string;
  title: string;
  description: string;
  files: File[];
  submittedAt: string;
  status: 'pending' | 'graded' | 'returned';
  grade?: number;
  feedback?: string;
}

interface Teacher {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface SubjectClassInfo {
  id: string;
  name: string;
  grade?: string | null;
}

interface Subject {
  id: string;
  subject: {
    id: string;
    name: string;
    class?: SubjectClassInfo | null;
    classSubjects?: Array<{
      class?: SubjectClassInfo | null;
    }>;
    teachers: Array<{
      teacher: {
        id: string;
        user: {
          firstName: string;
          lastName: string;
        };
      };
    }>;
  };
}

export default function StudentHomeworkPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [homeworkList, setHomeworkList] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHomework, setEditingHomework] = useState<HomeworkSubmission | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myTeachers, setMyTeachers] = useState<Teacher[]>([]);
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null);
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjectId: '',
    teacherId: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolveSubjectClass = (subject?: { class?: SubjectClassInfo | null; classSubjects?: Array<{ class?: SubjectClassInfo | null }> }) => {
    if (!subject) {
      return null;
    }

    if (subject.class) {
      return subject.class;
    }

    if (subject.classSubjects && Array.isArray(subject.classSubjects)) {
      const match = subject.classSubjects.find(cs => cs?.class);
      if (match?.class) {
        return match.class;
      }
    }

    return null;
  };

  const getSubjectClassName = (subject?: { class?: SubjectClassInfo | null; classSubjects?: Array<{ class?: SubjectClassInfo | null }> }) => {
    const classInfo = resolveSubjectClass(subject);
    return classInfo?.name || 'N/A';
  };

  const getSubjectClassGrade = (subject?: { class?: SubjectClassInfo | null; classSubjects?: Array<{ class?: SubjectClassInfo | null }> }) => {
    const classInfo = resolveSubjectClass(subject);
    return classInfo?.grade || null;
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setUser({ name: 'Student', role: 'STUDENT' });
    setMounted(true);
    fetchStudentData();
    fetchSubjects();
    fetchHomework();
  }, [router]);

  const fetchStudentData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      console.log('Fetching student profile...');
      
      // Get student profile (backend auto-creates if doesn't exist)
      const profileRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/students/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!profileRes.ok) {
        console.error('Failed to get student profile:', profileRes.status);
        const errorData = await profileRes.json();
        console.error('Error details:', errorData);
        return;
      }

      const profileData = await profileRes.json();
      const profile = profileData.data;
      console.log('Student profile retrieved:', profile);
      
      setStudentProfileId(profile.id);

      // Fetch assigned teachers
      console.log('Fetching assigned teachers for profile:', profile.id);
      const teachersRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/student-teachers/student/${profile.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        console.log('Raw teachers response:', teachersData);
        
        const assignments = teachersData.data || [];
        console.log('Teacher assignments:', assignments);
        
        const teachers = assignments.map((assignment: any) => {
          console.log('Processing assignment:', assignment);
          return assignment.teacher;
        });
        
        console.log('Processed teachers list:', teachers);
        console.log('Number of teachers:', teachers.length);
        setMyTeachers(teachers);
      } else {
        const errorData = await teachersRes.json();
        console.log('Error fetching teachers:', teachersRes.status, errorData);
        setMyTeachers([]);
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/homework/my-subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Student subjects raw response:', data);
        // Handle both direct array response and wrapped response
        const subjects = Array.isArray(data) ? data : (data.data || []);
        console.log('Processed subjects:', subjects);
        // Log class information for each subject
        subjects.forEach((subj: any) => {
          console.log(`Subject: ${subj.subject?.name || 'Unknown'}`, {
            directClass: subj.subject?.class,
            classSubjects: subj.subject?.classSubjects,
            finalClass: subj.subject?.class,
          });
        });
        setMySubjects(subjects);
      } else {
        console.error('Failed to fetch subjects:', response.status);
        setMySubjects([]);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setMySubjects([]);
    }
  };

  const fetchHomework = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      // TODO: Replace with actual API call
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/homework/submissions/me`, {
      //   headers: { 'Authorization': `Bearer ${token}` },
      // });
      // const data = await response.json();
      // setHomeworkList(data.data);
      
      // Mock data for now
      setHomeworkList([]);
    } catch (err: any) {
      console.error('Fetch homework error:', err);
      setError(err.message || 'Failed to load homework');
    } finally {
      setLoading(false);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      
      // Validate file sizes
      const invalidFiles = filesArray.filter(file => file.size > maxSize);
      
      if (invalidFiles.length > 0) {
        setError(`${invalidFiles.length} ${t.homework.fileTooLarge}`);
        return;
      }
      
      setError(''); // Clear any previous errors
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      
      // Validate file sizes
      const invalidFiles = filesArray.filter(file => file.size > maxSize);
      
      if (invalidFiles.length > 0) {
        setError(`${invalidFiles.length} ${t.homework.fileTooLarge}`);
        return;
      }
      
      setError('');
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleSubjectSelect = (subjectId: string) => {
    const enrollment = mySubjects.find(
      (s: any) => s.subject?.id === subjectId || s.id === subjectId,
    );
    const assignedTeacherId =
      (enrollment as any)?.teacher?.id || (enrollment as any)?.teacherId || '';

    setFormData(prev => ({
      ...prev,
      subjectId,
      teacherId: assignedTeacherId,
    }));
  };

  const selectedSubjectEnrollment = formData.subjectId
    ? mySubjects.find(
        (s: any) => s.subject?.id === formData.subjectId || s.id === formData.subjectId,
      )
    : null;
  const assignedTeacher = (selectedSubjectEnrollment as any)?.teacher || null;
  const subjectTeacherCount =
    (selectedSubjectEnrollment as any)?.subject?.teachers?.length || 0;
  const multipleTeachersForSubject = subjectTeacherCount > 1;

  const openAddForm = () => {
    console.log('Opening add form, mySubjects:', mySubjects);
    console.log('Number of subjects:', (mySubjects || []).length);
    
    if ((mySubjects || []).length === 0) {
      console.error('No subjects available!');
      setError('You are not enrolled in any subjects. Please contact your administrator.');
      return;
    }
    
    setEditingHomework(null);
    setFormData({ title: '', description: '', subjectId: '', teacherId: '' });
    setSelectedFiles([]);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const openEditForm = (homework: HomeworkSubmission) => {
    setEditingHomework(homework);
    setFormData({
      title: homework.title,
      description: homework.description,
      teacherId: '',
    });
    setSelectedFiles([]);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingHomework(null);
    setFormData({ title: '', description: '', subjectId: '', teacherId: '' });
    setSelectedFiles([]);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title || !formData.description) {
      setError(t.homework.requiredField);
      return;
    }

    if (!formData.subjectId) {
      setError('Please select a subject.');
      return;
    }

    const selectedEnrollment = mySubjects.find(
      (s: any) => s.subject?.id === formData.subjectId || s.id === formData.subjectId,
    );
    const assignedTeacherId =
      formData.teacherId ||
      (selectedEnrollment as any)?.teacher?.id ||
      (selectedEnrollment as any)?.teacherId ||
      '';

    if (!assignedTeacherId) {
      setError('No teacher is assigned to this subject. Please contact your administrator.');
      return;
    }
    setFormData(prev => ({ ...prev, teacherId: assignedTeacherId }));

    setSubmitting(true);

    try {
      const token = localStorage.getItem('accessToken');
      
      console.log('Submitting homework to subject:', formData.subjectId);
      
      const fd = new FormData();
      fd.append('subjectId', formData.subjectId);
      fd.append('title', formData.title);
      fd.append('description', formData.description);
      fd.append('teacherId', assignedTeacherId);
      selectedFiles.forEach((file) => fd.append('files', file));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/homework/submit-to-subject-teacher`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: fd,
      });

      const data = await response.json();
      console.log('Submission response:', data);

      if (response.ok) {
        setSuccess(t.homework.homeworkSubmitted);
        fetchHomework();
        setTimeout(() => {
          closeForm();
        }, 1500);
      } else {
        setError(data.message || 'Failed to submit homework');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || t.homework.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t.homework.confirmDelete)) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      // TODO: Replace with actual API call
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/homework/submissions/${id}`, {
      //   method: 'DELETE',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //   },
      // });

      // if (response.ok) {
        setSuccess(t.homework.homeworkDeleted);
        fetchHomework();
        setTimeout(() => setSuccess(''), 3000);
      // }
    } catch (err: any) {
      setError(err.message || t.homework.error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'bg-green-100 text-green-800';
      case 'returned':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'graded':
        return t.homework.statusGraded;
      case 'returned':
        return t.homework.statusReturned;
      default:
        return t.homework.statusPending;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileSizeColor = (bytes: number): string => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const percentage = (bytes / maxSize) * 100;
    
    if (percentage > 90) return 'text-red-600'; // Very close to limit
    if (percentage > 70) return 'text-orange-600'; // Getting large
    return 'text-gray-500'; // Normal size
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gradient-bg">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Enhanced Header */}
      <nav className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1 gap-3">
              <button
                onClick={() => router.push('/student')}
                className="text-white hover:text-white/80 transition-colors flex-shrink-0"
                aria-label={t.homework.backToDashboard}
              >
                <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">{t.homework.title}</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <span className="hidden md:inline text-sm text-white/90 font-medium">
                {user.name}
              </span>
              <SettingsMenu onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Success/Error Messages */}
        {error && (
          <div className={`mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-slide-down`}>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2 rtl:mr-0 rtl:ml-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}
        {success && (
          <div className={`mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg animate-slide-down`}>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2 rtl:mr-0 rtl:ml-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-700">{success}</span>
            </div>
          </div>
        )}

        {/* Add Homework Button */}
        {!showForm && (
          <div className={`mb-6 ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
            <Button
              onClick={openAddForm}
              className="gradient-primary text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.homework.submitHomework}
            </Button>
          </div>
        )}

        {/* Homework Form */}
        {showForm && (
          <div className={`mb-8 bg-white rounded-2xl shadow-lg p-6 sm:p-8 border-l-4 border-purple-600 ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingHomework ? t.homework.editHomework : t.homework.submitHomework}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-gray-700 font-medium">
                  {t.homework.homeworkTitle} *
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder={t.homework.homeworkTitlePlaceholder}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  disabled={submitting}
                  className="mt-2"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-gray-700 font-medium">
                  {t.homework.description} *
                </Label>
                <textarea
                  id="description"
                  placeholder={t.homework.descriptionPlaceholder}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  disabled={submitting}
                  rows={5}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                />
              </div>

              {/* Subject Selection */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  Select Subject *
                </label>
                <select
                  id="subject"
                  value={formData.subjectId}
                  onChange={(e) => handleSubjectSelect(e.target.value)}
                  required
                  disabled={submitting}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-white"
                >
                  <option value="">Choose a subject...</option>
                  {(mySubjects || []).map((enrollment) => (
                    <option key={enrollment.subject.id} value={enrollment.subject.id}>
                      {enrollment.subject.name} - {getSubjectClassName(enrollment.subject)}
                    </option>
                  ))}
                </select>
                {(mySubjects || []).length === 0 && (
                  <p className="mt-2 text-sm text-amber-600">
                    ⚠️ You are not enrolled in any subjects. Please contact your administrator.
                  </p>
                )}
              </div>

              {/* Assigned Teacher Information */}
              {formData.subjectId && (
                <div>
                  {assignedTeacher ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Teacher: {assignedTeacher?.user?.firstName} {assignedTeacher?.user?.lastName}{' '}
                        {multipleTeachersForSubject && '(assigned by admin)'}
                      </p>
                      {(() => {
                        const className = getSubjectClassName(selectedSubjectEnrollment?.subject);
                        const classGrade = getSubjectClassGrade(selectedSubjectEnrollment?.subject);
                        if (className === 'N/A' && !classGrade) {
                          return null;
                        }
                        return (
                          <p className="text-xs text-blue-700 mt-1">
                            Class: {className}
                            {classGrade ? ` • Grade: ${classGrade}` : ''}
                          </p>
                        );
                      })()}
                      {multipleTeachersForSubject && (
                        <p className="mt-2 text-xs text-blue-700">
                          This subject is taught by multiple teachers. The administrator has pre-assigned this teacher for your submissions.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        No teacher is assigned to this subject yet. Please contact your administrator.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* File Upload */}
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">
                  {t.homework.attachments}
                </Label>
                <div className="mt-2">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
                      isDragging
                        ? 'border-purple-500 bg-purple-100 scale-105'
                        : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                    }`}
                  >
                    <svg className={`mx-auto h-12 w-12 transition-colors ${isDragging ? 'text-purple-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className={`mt-2 text-sm font-medium ${isDragging ? 'text-purple-700' : 'text-gray-600'}`}>
                      {t.homework.dragDropFiles}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{t.homework.supportedFormats}</p>
                    <p className="mt-1 text-xs font-semibold text-purple-600">{t.homework.maxFileSize}</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label={t.homework.uploadFiles}
                    title={t.homework.uploadFiles}
                  />
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-700">
                        {selectedFiles.length} {t.homework.filesSelected}
                      </p>
                      <p className="text-xs text-gray-600 font-semibold">
                        {t.homework.totalSize}: {formatFileSize(selectedFiles.reduce((acc, file) => acc + file.size, 0))}
                      </p>
                    </div>
                    {/* Large upload warning */}
                    {selectedFiles.reduce((acc, file) => acc + file.size, 0) > 100 * 1024 * 1024 && (
                      <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 mb-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{t.homework.largeUploadWarning}</span>
                      </div>
                    )}
                    {selectedFiles.map((file, index) => {
                      const isImage = file.type.startsWith('image/');
                      const sizeColor = getFileSizeColor(file.size);
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors animate-slide-down">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* File type icon */}
                            {isImage ? (
                              <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="text-sm text-gray-700 truncate font-medium">{file.name}</span>
                            <span className={`text-xs flex-shrink-0 font-semibold ${sizeColor}`}>
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="ml-2 rtl:ml-0 rtl:mr-2 text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors flex-shrink-0"
                            aria-label={t.homework.removeFile}
                            title={t.homework.removeFile}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                >
                  {t.homework.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 gradient-primary text-white"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span>{editingHomework ? t.homework.updating : t.homework.submitting}</span>
                    </div>
                  ) : (
                    editingHomework ? t.homework.update : t.homework.submit
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Homework List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{t.common.loading}</p>
          </div>
        ) : homeworkList.length === 0 && !showForm ? (
          <div className={`text-center py-12 bg-white rounded-2xl shadow-lg ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
            <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">{t.homework.noHomework}</h3>
            <p className="mt-2 text-sm text-gray-500">{t.homework.uploadImages}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {homeworkList.map((homework, index) => (
              <div
                key={homework.id}
                className={`bg-white rounded-xl shadow-lg p-6 hover-lift ${mounted ? `animate-slide-up stagger-${Math.min(index + 1, 6)}` : 'opacity-0'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex-1">{homework.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(homework.status)}`}>
                    {getStatusText(homework.status)}
                  </span>
                </div>

                <p className="text-gray-600 mb-4">{homework.description}</p>

                <div className="text-sm text-gray-500 mb-4">
                  {t.homework.submittedOn}: {formatDate(homework.submittedAt)}
                </div>

                {homework.grade && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-green-800">{t.homework.grade}:</span>
                      <span className="text-green-700">{homework.grade}/100</span>
                    </div>
                    {homework.feedback && (
                      <div className="mt-2">
                        <span className="font-semibold text-gray-700">{t.homework.teacherFeedback}:</span>
                        <p className="text-gray-600 mt-1">{homework.feedback}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => openEditForm(homework)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    {t.homework.edit}
                  </button>
                  <button
                    onClick={() => handleDelete(homework.id)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    {t.homework.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

