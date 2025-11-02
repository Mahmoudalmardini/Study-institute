'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import apiClient from '@/lib/api-client';
import { Teacher, TeacherSalary, HourRequest, MonthlyPayrollRecord, HourRequestStatus } from '@/types';

interface TeacherWithSalary extends Teacher {
  currentSalary: TeacherSalary | null;
}

export default function PayrollPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [teachers, setTeachers] = useState<TeacherWithSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Salary management
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherWithSalary | null>(null);
  const [editingSalary, setEditingSalary] = useState<TeacherSalary | null>(null);
  const [monthlySalary, setMonthlySalary] = useState('');
  const [hourlyWage, setHourlyWage] = useState('');
  const [savingSalary, setSavingSalary] = useState(false);

  // Hour requests
  const [showHourRequestsModal, setShowHourRequestsModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<HourRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<HourRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<HourRequestStatus>(HourRequestStatus.APPROVED);
  const [modifiedHours, setModifiedHours] = useState('');
  const [modifiedMinutes, setModifiedMinutes] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Payroll records
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [selectedTeacherForRecords, setSelectedTeacherForRecords] = useState<TeacherWithSalary | null>(null);
  const [payrollRecords, setPayrollRecords] = useState<MonthlyPayrollRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchTeachers();
    fetchPendingRequests();
  }, [router]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/payroll/salaries', {
        params: searchTerm ? { search: searchTerm } : {},
      });
      setTeachers((response as any) || []);
    } catch (err: any) {
      console.error('Error fetching teachers:', err);
      setError('Error loading payroll data');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await apiClient.get('/payroll/hour-requests/pending');
      setPendingRequests((response as any) || []);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  };

  const handleAddSalary = (teacher: TeacherWithSalary) => {
    setSelectedTeacher(teacher);
    setEditingSalary(null);
    setMonthlySalary('');
    setHourlyWage('');
    setError('');
    setSuccess('');
    setShowSalaryModal(true);
  };

  const handleEditSalary = (teacher: TeacherWithSalary) => {
    setSelectedTeacher(teacher);
    setEditingSalary(teacher.currentSalary);
    setMonthlySalary(teacher.currentSalary?.monthlySalary?.toString() || '');
    setHourlyWage(teacher.currentSalary?.hourlyWage?.toString() || '');
    setError('');
    setSuccess('');
    setShowSalaryModal(true);
  };

  const handleSaveSalary = async () => {
    if (!selectedTeacher) return;
    
    if (!monthlySalary && !hourlyWage) {
      setError('Please provide at least monthly salary or hourly wage');
      return;
    }

    try {
      setSavingSalary(true);
      setError('');

      if (editingSalary) {
        await apiClient.patch(`/payroll/salaries/${editingSalary.id}`, {
          monthlySalary: monthlySalary ? parseFloat(monthlySalary) : undefined,
          hourlyWage: hourlyWage ? parseFloat(hourlyWage) : undefined,
        });
        setSuccess('Salary updated successfully. Changes take effect immediately.');
      } else {
        await apiClient.post('/payroll/salaries', {
          teacherId: selectedTeacher.id,
          monthlySalary: monthlySalary ? parseFloat(monthlySalary) : undefined,
          hourlyWage: hourlyWage ? parseFloat(hourlyWage) : undefined,
        });
        setSuccess('Salary created successfully. Changes take effect immediately.');
      }

      await fetchTeachers();
      setShowSalaryModal(false);
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error('Error saving salary:', err);
      setError(err.response?.data?.message || 'Error saving salary');
    } finally {
      setSavingSalary(false);
    }
  };

  const handleDeleteSalary = async (salaryId: string, teacherName: string) => {
    if (!confirm(`Are you sure you want to delete the salary for ${teacherName}?`)) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.delete(`/payroll/salaries/${salaryId}`);
      setSuccess('Salary deleted successfully');
      await fetchTeachers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Error deleting salary:', err);
      setError(err.response?.data?.message || 'Error deleting salary');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewRequest = (request: HourRequest) => {
    setSelectedRequest(request);
    setReviewStatus(HourRequestStatus.APPROVED);
    setModifiedHours(request.hours.toString());
    setModifiedMinutes(request.minutes.toString());
    setFeedback('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest) return;

    try {
      setReviewing(true);
      setError('');

      const payload: any = {
        status: reviewStatus,
      };

      if (reviewStatus === HourRequestStatus.MODIFIED) {
        payload.adminModifiedHours = parseFloat(modifiedHours);
        payload.adminModifiedMinutes = parseInt(modifiedMinutes);
      }

      if (feedback) {
        payload.adminFeedback = feedback;
      }

      await apiClient.patch(`/payroll/hour-requests/${selectedRequest.id}/review`, payload);
      setSuccess('Hour request reviewed successfully');
      await fetchPendingRequests();
      setTimeout(() => {
        setShowReviewModal(false);
        setSelectedRequest(null);
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error('Error reviewing request:', err);
      setError(err.response?.data?.message || 'Error reviewing request');
    } finally {
      setReviewing(false);
    }
  };

  const handleViewRecords = async (teacher: TeacherWithSalary) => {
    setSelectedTeacherForRecords(teacher);
    setShowRecordsModal(true);
    setLoadingRecords(true);

    try {
      // Get all monthly records - we'll need to implement this endpoint or fetch month by month
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const records: MonthlyPayrollRecord[] = [];

      // Try current year and previous year
      for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
        const targetYear = currentYear - yearOffset;
        for (let month = 1; month <= 12; month++) {
          try {
            const response = await apiClient.get(`/payroll/records/${teacher.id}/${month}/${targetYear}`);
            records.push(response as MonthlyPayrollRecord);
          } catch {
            // Record doesn't exist for this month, skip
          }
        }
      }

      setPayrollRecords(records.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      }));
    } catch (err) {
      console.error('Error fetching records:', err);
      setError('Error loading payroll records');
    } finally {
      setLoadingRecords(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const filteredTeachers = teachers.filter(teacher =>
    `${teacher.user.firstName} ${teacher.user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen gradient-bg">
      <nav className="gradient-primary shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin')}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-white">Payroll Management</h1>
            </div>
            <SettingsMenu onLogout={() => router.push('/login')} />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Header Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHourRequestsModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Hour Requests ({pendingRequests.length})
            </button>
          </div>
        </div>

        {/* Teachers List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {teacher.user.firstName} {teacher.user.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{teacher.user.email}</p>
                  </div>
                  <button
                    onClick={() => handleViewRecords(teacher)}
                    className="text-indigo-600 hover:text-indigo-800"
                    title="View Records"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Monthly Salary:</span>
                    <span className="text-sm font-medium">
                      {teacher.currentSalary?.monthlySalary
                        ? `${Number(teacher.currentSalary.monthlySalary).toFixed(2)} SYP`
                        : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Hourly Wage:</span>
                    <span className="text-sm font-medium">
                      {teacher.currentSalary?.hourlyWage
                        ? `${Number(teacher.currentSalary.hourlyWage).toFixed(2)} SYP/hr`
                        : 'Not set'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {teacher.currentSalary ? (
                    <>
                      <button
                        onClick={() => handleEditSalary(teacher)}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSalary(teacher.currentSalary!.id, `${teacher.user.firstName} ${teacher.user.lastName}`)}
                        className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleAddSalary(teacher)}
                      className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Add Salary
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredTeachers.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-600">
            No teachers found
          </div>
        )}
      </main>

      {/* Salary Modal */}
      {showSalaryModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingSalary ? 'Edit Salary' : 'Add Salary'}
                </h3>
                <button
                  onClick={() => setShowSalaryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {selectedTeacher.user.firstName} {selectedTeacher.user.lastName}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Salary (SYP)
                  </label>
                  <input
                    type="text"
                    value={monthlySalary}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setMonthlySalary(value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Wage (SYP/hour)
                  </label>
                  <input
                    type="text"
                    value={hourlyWage}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setHourlyWage(value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Note: Changes take effect immediately from the current month
                </p>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowSalaryModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSalary}
                  disabled={savingSalary}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingSalary ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hour Requests Modal */}
      {showHourRequestsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Pending Hour Requests</h3>
                <button
                  onClick={() => {
                    setShowHourRequestsModal(false);
                    fetchPendingRequests();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {pendingRequests.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No pending requests</p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {request.teacher?.user.firstName} {request.teacher?.user.lastName}
                          </p>
                          <p className="text-sm text-gray-600">
                            Date: {new Date(request.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Hours: {Number(request.hours)}h {request.minutes}m
                          </p>
                        </div>
                        <button
                          onClick={() => handleReviewRequest(request)}
                          className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Review Hour Request</h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Teacher:</p>
                  <p className="font-medium">
                    {selectedRequest.teacher?.user.firstName} {selectedRequest.teacher?.user.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date:</p>
                  <p className="font-medium">{new Date(selectedRequest.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Submitted Hours:</p>
                  <p className="font-medium">{Number(selectedRequest.hours)}h {selectedRequest.minutes}m</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as HourRequestStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={HourRequestStatus.APPROVED}>Approve</option>
                    <option value={HourRequestStatus.REJECTED}>Reject</option>
                    <option value={HourRequestStatus.MODIFIED}>Modify</option>
                  </select>
                </div>

                {reviewStatus === HourRequestStatus.MODIFIED && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Modified Hours
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={modifiedHours}
                        onChange={(e) => setModifiedHours(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Modified Minutes
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={modifiedMinutes}
                        onChange={(e) => setModifiedMinutes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feedback (Optional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Add feedback..."
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewing}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {reviewing ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Records Modal */}
      {showRecordsModal && selectedTeacherForRecords && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Payroll Records - {selectedTeacherForRecords.user.firstName} {selectedTeacherForRecords.user.lastName}
                </h3>
                <button
                  onClick={() => setShowRecordsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingRecords ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-4">
                  {payrollRecords.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No payroll records found</p>
                  ) : (
                    payrollRecords.map((record) => (
                      <div
                        key={record.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">
                            {monthNames[record.month - 1]} {record.year}
                          </h4>
                          <span className="text-lg font-bold text-indigo-600">
                            {Number(record.totalEntitlement).toFixed(2)} SYP
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Monthly:</span> {Number(record.monthlySalary).toFixed(2)} SYP
                          </div>
                          <div>
                            <span className="font-medium">Hours:</span> {Number(record.totalHours).toFixed(2)}h
                          </div>
                          <div>
                            <span className="font-medium">Hourly:</span> {Number(record.hourlyWage).toFixed(2)} SYP/hr
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

