'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import apiClient from '@/lib/api-client';
import { HourRequest, MonthlyPayrollRecord, HourRequestStatus } from '@/types';

export default function TeacherPayrollPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [salary, setSalary] = useState<any>(null);
  const [hourRequests, setHourRequests] = useState<HourRequest[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<MonthlyPayrollRecord[]>([]);
  
  // Submit hour request
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [requestHours, setRequestHours] = useState('');
  const [requestMinutes, setRequestMinutes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // View records
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);

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
      const [salaryData, requestsData, recordsData] = await Promise.all([
        apiClient.get('/payroll/salaries/me'),
        apiClient.get('/payroll/hour-requests/me'),
        apiClient.get('/payroll/records/me'),
      ]);
      console.log('Salary data received:', salaryData);
      setSalary((salaryData as any)?.salary || null);
      setHourRequests((requestsData as any) || []);
      setPayrollRecords((recordsData as any) || []);
    } catch (err) {
      console.error('Error fetching payroll data:', err);
      setError('Error loading payroll data. Please refresh the page.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitHourRequest = async () => {
    if (!requestHours) {
      setError('Please enter the number of hours worked');
      return;
    }

    const hours = parseInt(requestHours);
    const minutes = parseInt(requestMinutes) || 0;

    if (isNaN(hours) || hours < 0 || hours > 24) {
      setError('Hours must be a whole number between 0 and 24');
      return;
    }

    if (isNaN(minutes) || minutes < 0 || minutes > 59) {
      setError('Minutes must be a whole number between 0 and 59');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      // Date will be automatically set to today on the backend
      await apiClient.post('/payroll/hour-requests', {
        hours: hours,
        minutes: minutes,
      });
      setSuccess('Hour request submitted successfully');
      await fetchData();
      setTimeout(() => {
        setShowSubmitModal(false);
        setRequestHours('');
        setRequestMinutes('');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting request:', err);
      setError(err.response?.data?.message || 'Error submitting hour request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewRecords = async () => {
    setShowRecordsModal(true);
    setLoadingRecords(true);
    try {
      const records = await apiClient.get('/payroll/records/me');
      setPayrollRecords((records as any) || []);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const monthNames = t.installments?.monthNames || [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getStatusColor = (status: HourRequestStatus) => {
    switch (status) {
      case HourRequestStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case HourRequestStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case HourRequestStatus.MODIFIED:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <nav className="gradient-primary shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/teacher')}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-white">{t.teacher.myPayroll}</h1>
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

        {/* Salary Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">{t.teacher.salaryInformation}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">{t.teacher.monthlySalary}:</span>
              <p className="text-lg font-semibold">
                {salary?.monthlySalary
                  ? `${Number(salary.monthlySalary).toFixed(2)} SYP`
                  : t.teacher.notSet}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">{t.teacher.hourlyWage}:</span>
              <p className="text-lg font-semibold">
                {salary?.hourlyWage
                  ? `${Number(salary.hourlyWage).toFixed(2)} SYP/hour`
                  : t.teacher.notSet}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {salary?.hourlyWage && (
            <button
              onClick={() => {
                setShowSubmitModal(true);
                setError('');
                setSuccess('');
              }}
              className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t.teacher.submitHourRequest}</h3>
                  <p className="text-sm text-gray-600">{t.teacher.submitDailyHours}</p>
                </div>
              </div>
            </button>
          )}
          <button
            onClick={handleViewRecords}
            className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t.teacher.viewPayrollRecords}</h3>
                <p className="text-sm text-gray-600">{t.teacher.viewMonthlyHistory}</p>
              </div>
            </div>
          </button>
        </div>

        {/* Hour Requests */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{t.teacher.hourRequests}</h2>
            <button
              onClick={() => {
                if (!salary?.hourlyWage) {
                  setError('Hourly wage is not configured. Please contact the administrator to set up your hourly wage.');
                  setTimeout(() => setError(''), 5000);
                  return;
                }
                setShowSubmitModal(true);
                setError('');
                setSuccess('');
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
{t.teacher.submitHourRequest}
            </button>
          </div>
          {hourRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">{t.teacher.noHourRequests}</p>
              {!salary?.hourlyWage && (
                <p className="text-sm text-orange-600">
                  {t.teacher.hourlyWageNote}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {hourRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {new Date(request.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {request.status === HourRequestStatus.MODIFIED && request.adminModifiedHours !== undefined
                          ? `${Number(request.adminModifiedHours)}h ${request.adminModifiedMinutes || 0}m (${t.teacher.modified})`
                          : `${Number(request.hours)}h ${request.minutes}m`}
                      </p>
                      {request.adminFeedback && (
                        <p className="text-sm text-gray-600 mt-1 italic">
                          {t.teacher.feedbackLabel}: {request.adminFeedback}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Submit Hour Request Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{t.teacher.submitHourRequest}</h3>
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    setRequestHours('');
                    setRequestMinutes('');
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

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.teacher.hours} *
                  </label>
                  <input
                    type="text"
                    value={requestHours}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 24)) {
                        setRequestHours(value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">{t.teacher.enterHours}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.teacher.minutes}
                  </label>
                  <input
                    type="text"
                    value={requestMinutes}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 59)) {
                        setRequestMinutes(value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t.teacher.enterMinutes}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    setRequestDate('');
                    setRequestHours('');
                    setRequestMinutes('');
                    setError('');
                    setSuccess('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleSubmitHourRequest}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? t.teacher.submitting : t.teacher.submit}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Records Modal */}
      {showRecordsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{t.teacher.payrollRecords}</h3>
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
                    <p className="text-gray-600 text-center py-8">{t.teacher.noPayrollRecords}</p>
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
                            <span className="font-medium">{t.teacher.monthly}:</span> {Number(record.monthlySalary).toFixed(2)} SYP
                          </div>
                          <div>
                            <span className="font-medium">{t.teacher.hours}:</span> {Number(record.totalHours).toFixed(2)}h
                          </div>
                          <div>
                            <span className="font-medium">{t.teacher.hourly}:</span> {Number(record.hourlyWage).toFixed(2)} SYP/hr
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

