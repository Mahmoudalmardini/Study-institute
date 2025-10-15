'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SettingsMenu from '@/components/SettingsMenu';

interface StudentHomeworkSubmission {
  id: string;
  title: string;
  description: string;
  files: Array<{ name: string; url: string; size: number }>;
  submittedAt: string;
  status: 'pending' | 'graded' | 'returned';
  grade?: number;
  feedback?: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface User {
  name: string;
  role: string;
}

export default function TeacherHomeworkPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [submissions, setSubmissions] = useState<StudentHomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<StudentHomeworkSubmission | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeForm, setGradeForm] = useState({
    grade: '',
    feedback: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setUser({ name: 'Teacher', role: 'TEACHER' });
    setMounted(true);
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      // Use the conflict-safe endpoint path
      const url = `${process.env.NEXT_PUBLIC_API_URL}/homework/submissions/received`;
      
      console.log('=== FETCHING TEACHER SUBMISSIONS ===');
      console.log('URL:', url);
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Safely read error payload as text, then try JSON
        let errorPayload: Record<string, unknown> | { message?: string } = {};
        try {
          const text = await response.text();
          try { errorPayload = text ? JSON.parse(text) : {}; } catch { errorPayload = { message: text }; }
        } catch {
          errorPayload = {};
        }
        console.error('Error response:', errorPayload);
        
        if (response.status === 401) {
          localStorage.clear();
          router.push('/login');
          return;
        }
        const errorMessage = typeof errorPayload?.message === 'string' 
          ? errorPayload.message 
          : 'Failed to fetch submissions';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Submissions response:', data);
      
      // Normalize response to an array
      // Handle common API envelope shapes: data, {data}, {data:{data}}, {result}
      const rawListCandidate =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.result)
          ? data.result
          : Array.isArray(data?.data?.data)
          ? data.data.data
          : [];

      const rawList: unknown[] = rawListCandidate || [];

      // Transform data to match the interface
      type SubmissionApi = {
        id: string;
        homework?: { title?: string; description?: string } | null;
        submittedAt?: string;
        status?: string;
        grade?: number | null;
        feedback?: string | null;
        fileUrls?: string[] | null;
        student?: { user?: { id?: string; firstName?: string; lastName?: string } | null } | null;
      };

      const buildFileUrl = (u: string): string => {
        if (/^https?:\/\//i.test(u)) return u;
        const cleaned = u.replace(/^\.\/?/, '');
        // For uploaded files, use the base URL without /api prefix
        // because ServeStaticModule serves files at /uploads (not /api/uploads)
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001';
        return `${baseUrl}/${cleaned}`;
      };

      const fileNameFrom = (u: string): string => {
        try {
          const parts = u.split('?')[0].split('#')[0].split('/');
          return parts[parts.length - 1] || 'file';
        } catch {
          return 'file';
        }
      };

      const transformedSubmissions: StudentHomeworkSubmission[] = (rawList as SubmissionApi[]).map((sub: SubmissionApi) => ({
        id: sub.id,
        title: sub.homework?.title ?? '',
        description: sub.homework?.description ?? '',
        files: (sub.fileUrls ?? []).map((url) => ({
          name: fileNameFrom(url),
          url: buildFileUrl(url),
          size: 0,
        })),
        submittedAt: sub.submittedAt ?? new Date().toISOString(),
        status: ((sub.status || '').toLowerCase() as 'pending' | 'graded' | 'returned'),
        grade: (sub.grade ?? undefined) as number | undefined,
        feedback: sub.feedback ?? undefined,
        student: {
          id: sub.student?.user?.id ?? '',
          firstName: sub.student?.user?.firstName ?? '',
          lastName: sub.student?.user?.lastName ?? '',
        },
      }));

      console.log('Transformed submissions:', transformedSubmissions);
      setSubmissions(transformedSubmissions);
      // Clear any previous error now that we have a successful response
      setError('');
    } catch (err: unknown) {
      console.error('Fetch submissions error:', err);
      setError((err as Error)?.message || 'Failed to load homework submissions');
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

  const openGradeModal = (submission: StudentHomeworkSubmission) => {
    setSelectedSubmission(submission);
    setGradeForm({
      grade: submission.grade?.toString() || '',
      feedback: submission.feedback || '',
    });
    setShowGradeModal(true);
    setError('');
    setSuccess('');
  };

  const closeGradeModal = () => {
    setShowGradeModal(false);
    setSelectedSubmission(null);
    setGradeForm({ grade: '', feedback: '' });
    setError('');
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const gradeValue = parseInt(gradeForm.grade);
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
      setError(t.teacher.gradeValue);
      return;
    }

    setSubmitting(true);

    try {
      // TODO: Replace with actual API call
      // const token = localStorage.getItem('accessToken');
      // const response = await fetch(
      //   `${process.env.NEXT_PUBLIC_API_URL}/homework/submissions/${selectedSubmission?.id}/grade`,
      //   {
      //     method: 'PATCH',
      //     headers: {
      //       'Authorization': `Bearer ${token}`,
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({
      //       grade: gradeValue,
      //       feedback: gradeForm.feedback,
      //     }),
      //   }
      // );

      // if (response.ok) {
        setSuccess(t.teacher.gradeSubmitted);
        fetchSubmissions();
        setTimeout(() => {
          closeGradeModal();
        }, 1500);
      // }
    } catch (err) {
      const error = err as Error;
      setError(error.message || t.homework.error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'returned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'graded':
        return t.teacher.graded;
      case 'returned':
        return t.homework.statusReturned;
      default:
        return t.teacher.pendingReview;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      // Fetch the file as a blob
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download file. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const studentName = `${submission.student.firstName} ${submission.student.lastName}`.toLowerCase();
    const matchesSearch = studentName.includes(searchTerm.toLowerCase()) || 
                         submission.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? submission.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

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
      <nav className="gradient-secondary shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1 gap-3">
              <button
                onClick={() => router.push('/teacher')}
                className="text-white hover:text-white/80 transition-colors flex-shrink-0"
                aria-label={t.teacher.backToDashboard}
              >
                <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">{t.teacher.studentHomework}</h1>
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
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-slide-down">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2 rtl:mr-0 rtl:ml-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg animate-slide-down">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2 rtl:mr-0 rtl:ml-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-700">{success}</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={`mb-6 flex flex-col sm:flex-row gap-3 ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
          <Input
            type="text"
            placeholder={t.teacher.searchStudent}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg min-w-[200px] focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            aria-label={t.teacher.filterByStatus}
          >
            <option value="">{t.teacher.allStatuses}</option>
            <option value="pending">{t.teacher.pendingReview}</option>
            <option value="graded">{t.teacher.graded}</option>
            <option value="returned">{t.homework.statusReturned}</option>
          </select>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{t.common.loading}</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className={`text-center py-12 bg-white rounded-2xl shadow-lg ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
            <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">{t.teacher.noSubmissions}</h3>
            <p className="mt-2 text-sm text-gray-500">{t.teacher.waitingForSubmissions}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredSubmissions.map((submission, index) => (
              <div
                key={submission.id}
                className={`bg-white rounded-xl shadow-lg p-6 hover-lift border-l-4 ${
                  submission.status === 'graded' 
                    ? 'border-green-500' 
                    : submission.status === 'returned'
                    ? 'border-yellow-500'
                    : 'border-blue-500'
                } ${mounted ? `animate-slide-up stagger-${Math.min(index + 1, 6)}` : 'opacity-0'}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Side - Homework Info */}
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{submission.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">
                            {t.teacher.submittedBy}: {submission.student.firstName} {submission.student.lastName}
                          </span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(submission.status)}`}>
                        {getStatusText(submission.status)}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-gray-700">{submission.description}</p>

                    {/* Submitted Date */}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span>{formatDate(submission.submittedAt)}</span>
                    </div>

                    {/* Attached Files */}
                    {submission.files.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                          </svg>
                          {t.teacher.attachedFiles} ({submission.files.length})
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {submission.files.map((file, fileIndex) => (
                            <div key={fileIndex} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs text-gray-700 truncate flex-1">{file.name}</span>
                                {file.size > 0 && (
                                  <span className="text-xs text-gray-500 flex-shrink-0">
                                    {formatFileSize(file.size)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-600 hover:text-teal-700 text-xs font-medium"
                                  aria-label="Open file"
                                >
                                  Open
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadFile(file.url, file.name)}
                                  className="text-teal-600 hover:text-teal-700 text-xs font-medium underline"
                                  aria-label="Download file"
                                >
                                  Download
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Current Grade (if graded) */}
                    {submission.grade !== undefined && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-bold text-green-800">{t.homework.grade}: {submission.grade}/100</span>
                        </div>
                        {submission.feedback && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-1">{t.homework.teacherFeedback}:</p>
                            <p className="text-sm text-gray-600">{submission.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Side - Action Button */}
                  <div className="flex-shrink-0">
                    <Button
                      onClick={() => openGradeModal(submission)}
                      className="w-full lg:w-auto gradient-secondary text-white font-semibold px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105"
                    >
                      <svg className="w-5 h-5 inline mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {submission.grade !== undefined ? t.homework.edit : t.teacher.gradeHomework}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Grading Modal */}
      {showGradeModal && selectedSubmission && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-scale-in">
            <div className="p-6 sm:p-8">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {t.teacher.homeworkDetails}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t.teacher.submittedBy}: <span className="font-semibold">{selectedSubmission.student.firstName} {selectedSubmission.student.lastName}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeGradeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={t.teacher.closeDetails}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Homework Content */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-gray-900 mb-2">{selectedSubmission.title}</h4>
                <p className="text-gray-700 mb-3">{selectedSubmission.description}</p>
                <p className="text-xs text-gray-500">{formatDate(selectedSubmission.submittedAt)}</p>
              </div>

              {/* Files */}
              {selectedSubmission.files.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{t.teacher.attachedFiles}:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedSubmission.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <svg className="w-5 h-5 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          {file.size > 0 && <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                            aria-label="Open file in new tab"
                          >
                            Open
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(file.url, file.name)}
                            className="text-teal-600 hover:text-teal-700 text-sm font-medium underline"
                            aria-label="Download file"
                          >
                            {t.teacher.downloadFile}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grading Form */}
              <form onSubmit={handleSubmitGrade} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    {success}
                  </div>
                )}

                <div>
                  <Label htmlFor="grade" className="text-gray-700 font-medium">
                    {t.teacher.gradeValue} *
                  </Label>
                  <Input
                    id="grade"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    value={gradeForm.grade}
                    onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                    required
                    disabled={submitting}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="feedback" className="text-gray-700 font-medium">
                    {t.teacher.feedback}
                  </Label>
                  <textarea
                    id="feedback"
                    placeholder={t.teacher.feedbackPlaceholder}
                    value={gradeForm.feedback}
                    onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                    disabled={submitting}
                    rows={4}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={closeGradeModal}
                    disabled={submitting}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    {t.homework.cancel}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 gradient-secondary text-white"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" />
                        <span>{t.teacher.savingGrade}</span>
                      </div>
                    ) : (
                      t.teacher.saveGrade
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

