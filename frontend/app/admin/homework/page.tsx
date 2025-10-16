'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SettingsMenu from '@/components/SettingsMenu';

interface PendingSubmission {
  id: string;
  submittedAt: string;
  teacherEvaluation: 'ACCEPTED' | 'REJECTED';
  teacherFeedback: string;
  teacherReviewedAt: string;
  homework: {
    id: string;
    title: string;
    description: string;
  };
  student: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface User {
  name: string;
  role: string;
}

export default function AdminHomeworkReviewPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<PendingSubmission | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    evaluation: 'ACCEPTED' as 'ACCEPTED' | 'REJECTED',
    feedback: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = () => {
    const confirmLogout = window.confirm(t.messages.logoutConfirm);
    if (confirmLogout) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setUser({ name: 'Admin', role: 'ADMIN' });
    fetchPendingSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchPendingSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/homework/submissions/pending-review`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.clear();
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch pending submissions');
      }

      const data = await response.json();
      console.log('Pending submissions response:', data);
      
      // Handle both array response and wrapped object response
      if (Array.isArray(data)) {
        setSubmissions(data);
      } else if (data.data && Array.isArray(data.data)) {
        setSubmissions(data.data);
      } else {
        console.error('Unexpected response format:', data);
        setSubmissions([]);
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to load pending submissions');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (submission: PendingSubmission) => {
    setSelectedSubmission(submission);
    setReviewForm({
      evaluation: submission.teacherEvaluation,
      feedback: submission.teacherFeedback,
    });
    setShowReviewModal(true);
    setError('');
    setSuccess('');
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedSubmission(null);
    setReviewForm({ evaluation: 'ACCEPTED', feedback: '' });
    setError('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!reviewForm.feedback.trim()) {
      setError('Feedback is required');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/homework/submissions/${selectedSubmission?.id}/admin-review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            evaluation: reviewForm.evaluation,
            feedback: reviewForm.feedback,
          }),
        }
      );

      if (response.ok) {
        setSuccess('Review submitted successfully! Student will be notified.');
        fetchPendingSubmissions();
        setTimeout(() => {
          closeReviewModal();
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to submit review');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An error occurred');
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

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gradient-bg">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg pb-12">
      {/* Header */}
      <header className="gradient-primary text-white shadow-xl relative">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 tracking-tight">
                Review Homework Submissions
              </h1>
              <p className="text-teal-100 text-sm sm:text-base">
                Review and approve teacher evaluations
              </p>
            </div>
            <SettingsMenu onLogout={handleLogout} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Stats Card */}
        <div className="mb-6 p-6 bg-white rounded-xl shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
              <p className="text-sm text-gray-600">Pending Reviews</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">All caught up!</h3>
            <p className="mt-2 text-sm text-gray-500">No homework submissions pending review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    {/* Left Side - Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{submission.homework.title}</h3>
                        <p className="text-sm text-gray-600">{submission.homework.description}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          <span className="font-semibold">Student:</span>
                          <span>{submission.student.user.firstName} {submission.student.user.lastName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-700">{formatDate(submission.submittedAt)}</span>
                        </div>
                      </div>

                      {/* Teacher Evaluation */}
                      <div className={`p-4 rounded-lg border-2 ${
                        submission.teacherEvaluation === 'ACCEPTED'
                          ? 'bg-green-50 border-green-300'
                          : 'bg-red-50 border-red-300'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {submission.teacherEvaluation === 'ACCEPTED' ? (
                            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className={`font-bold ${
                            submission.teacherEvaluation === 'ACCEPTED' ? 'text-green-800' : 'text-red-800'
                          }`}>
                            Teacher's Decision: {submission.teacherEvaluation}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Feedback:</span> {submission.teacherFeedback}
                        </p>
                      </div>
                    </div>

                    {/* Right Side - Action Button */}
                    <div className="flex-shrink-0">
                      <Button
                        onClick={() => openReviewModal(submission)}
                        className="w-full lg:w-auto gradient-secondary text-white font-semibold px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105"
                      >
                        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Review & Approve
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-scale-in">
            <div className="p-6 sm:p-8">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Review Homework Submission
                  </h3>
                  <p className="text-sm text-gray-600">
                    Student: <span className="font-semibold">{selectedSubmission.student.user.firstName} {selectedSubmission.student.user.lastName}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Homework Content */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-gray-900 mb-2">{selectedSubmission.homework.title}</h4>
                <p className="text-gray-700 mb-3">{selectedSubmission.homework.description}</p>
                <p className="text-xs text-gray-500">Submitted: {formatDate(selectedSubmission.submittedAt)}</p>
              </div>

              {/* Review Form */}
              <form onSubmit={handleSubmitReview} className="space-y-5">
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
                  <Label className="text-gray-700 font-medium mb-3 block">
                    Final Decision *
                  </Label>
                  <div className="space-y-3">
                    <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-green-50"
                           style={{
                             borderColor: reviewForm.evaluation === 'ACCEPTED' ? '#10b981' : '#e5e7eb',
                             backgroundColor: reviewForm.evaluation === 'ACCEPTED' ? '#f0fdf4' : 'white'
                           }}>
                      <input
                        type="radio"
                        name="evaluation"
                        value="ACCEPTED"
                        checked={reviewForm.evaluation === 'ACCEPTED'}
                        onChange={(e) => setReviewForm({ ...reviewForm, evaluation: e.target.value as 'ACCEPTED' | 'REJECTED' })}
                        disabled={submitting}
                        className="mr-3 h-5 w-5 text-green-600"
                      />
                      <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold text-gray-900">Accept Homework</span>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-red-50"
                           style={{
                             borderColor: reviewForm.evaluation === 'REJECTED' ? '#ef4444' : '#e5e7eb',
                             backgroundColor: reviewForm.evaluation === 'REJECTED' ? '#fef2f2' : 'white'
                           }}>
                      <input
                        type="radio"
                        name="evaluation"
                        value="REJECTED"
                        checked={reviewForm.evaluation === 'REJECTED'}
                        onChange={(e) => setReviewForm({ ...reviewForm, evaluation: e.target.value as 'ACCEPTED' | 'REJECTED' })}
                        disabled={submitting}
                        className="mr-3 h-5 w-5 text-red-600"
                      />
                      <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold text-gray-900">Reject Homework</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="feedback" className="text-gray-700 font-medium">
                    Final Feedback to Student *
                  </Label>
                  <textarea
                    id="feedback"
                    placeholder="Modify or keep the teacher's feedback..."
                    value={reviewForm.feedback}
                    onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                    disabled={submitting}
                    required
                    rows={5}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300"
                  />
                  <p className="mt-1 text-xs text-gray-500">This feedback will be sent directly to the student.</p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={closeReviewModal}
                    disabled={submitting}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 gradient-secondary text-white"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" />
                        <span>Submitting...</span>
                      </div>
                    ) : (
                      'Approve & Send to Student'
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

