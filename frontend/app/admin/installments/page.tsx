'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import apiClient, {
  getStudentInstallments,
  getStudentOutstandingBalance,
  recordPayment,
  createDiscount,
  cancelDiscount,
} from '@/lib/api-client';
import type { StudentInstallment, StudentDiscount } from '@/types';

interface Student {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  studentProfile?: {
    id: string;
  };
}

interface StudentWithInstallments extends Student {
  installments?: StudentInstallment[];
  outstanding?: any;
  currentMonth?: any;
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function InstallmentsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [students, setStudents] = useState<StudentWithInstallments[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithInstallments | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    installmentId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    notes: '',
  });
  const [discountForm, setDiscountForm] = useState({ amount: '', reason: '' });

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
      const [usersRes, studentsRes] = await Promise.all([
        apiClient.get('/users?role=STUDENT'),
        apiClient.get('/students'),
      ]);

      const users = Array.isArray(usersRes) ? usersRes : (usersRes as any)?.data || [];
      const studentProfiles = Array.isArray(studentsRes) ? studentsRes : (studentsRes as any)?.data || [];

      const studentsWithProfiles = users
        .filter((user: any) => user.role === 'STUDENT')
        .map((user: any) => {
          const profile = studentProfiles.find((sp: any) => sp.userId === user.id);
          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            studentProfile: profile,
          };
        });

      // Fetch installments for each student
      const studentsWithInstallments = await Promise.all(
        studentsWithProfiles.map(async (student) => {
          if (!student.studentProfile?.id) return student;

          try {
            const [installments, outstanding, currentMonth] = await Promise.all([
              getStudentInstallments(student.studentProfile.id, filterYear),
              getStudentOutstandingBalance(student.studentProfile.id),
              getStudentInstallments(student.studentProfile.id, filterYear).then((data) => {
                const installments = Array.isArray(data) ? data : [];
                const now = new Date();
                return installments.find(
                  (i: StudentInstallment) =>
                    i.month === now.getMonth() + 1 && i.year === now.getFullYear(),
                );
              }),
            ]);

            return {
              ...student,
              installments: Array.isArray(installments) ? installments : [],
              outstanding,
              currentMonth,
            };
          } catch (err) {
            return student;
          }
        }),
      );

      setStudents(studentsWithInstallments);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
        return;
      }
      setError('Error loading installments data');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus !== 'all' && student.installments) {
      const hasMatchingStatus = student.installments.some(
        (i) => i.status.toLowerCase() === filterStatus.toLowerCase(),
      );
      if (!hasMatchingStatus) return false;
    }

    if (filterMonth && student.installments) {
      const hasMatchingMonth = student.installments.some((i) => i.month === filterMonth);
      if (!hasMatchingMonth) return false;
    }

    return true;
  });

  const handleRecordPayment = async (student: StudentWithInstallments, installment: StudentInstallment) => {
    setSelectedStudent(student);
    setPaymentForm({
      installmentId: installment.id,
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      notes: '',
    });
    setShowPaymentForm(true);
  };

  const handleAddDiscount = (student: StudentWithInstallments) => {
    setSelectedStudent(student);
    setDiscountForm({ amount: '', reason: '' });
    setShowDiscountForm(true);
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toFixed(2);
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm(t.messages.logoutConfirm);
    if (confirmLogout) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gradient-bg">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <nav className="bg-gradient-to-r from-emerald-600 to-green-600 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1 gap-3">
              <button
                onClick={() => router.push('/admin')}
                className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0 hover:bg-white/30 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                <span className="hidden sm:inline">{t.common.appName} - </span>
                {t.installments?.title || 'Installments Management'}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <SettingsMenu onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Students
              </label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t.installments?.filterByMonth || 'Filter by Month'}
              </label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">{t.installments?.allMonths || 'All Months'}</option>
                {monthNames.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t.installments?.filterByYear || 'Filter by Year'}
              </label>
              <select
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(parseInt(e.target.value));
                  fetchData();
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t.installments?.filterByStatus || 'Filter by Status'}
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">{t.installments?.allStatuses || 'All Statuses'}</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-green-700 font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Students List */}
        <div className="space-y-4">
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <p className="text-gray-500">
                {searchTerm ? 'No students match your search' : 'No students found'}
              </p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {student.firstName[0]}
                        {student.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddDiscount(student)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                    >
                      {t.installments?.addDiscount || 'Add Discount'}
                    </button>
                  </div>
                </div>

                {student.outstanding && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                      {t.installments?.outstandingBalance || 'Outstanding Balance'}:{' '}
                      <span className="font-bold text-red-600">
                        {formatCurrency(student.outstanding.totalOutstanding || '0')}
                      </span>
                    </p>
                  </div>
                )}

                {student.installments && student.installments.length > 0 ? (
                  <div className="space-y-3">
                    {student.installments
                      .filter((inst) => !filterMonth || inst.month === filterMonth)
                      .map((installment) => (
                        <div
                          key={installment.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {monthNames[installment.month - 1]} {installment.year}
                              </p>
                              <span
                                className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                                  installment.status === 'PAID'
                                    ? 'bg-green-100 text-green-800'
                                    : installment.status === 'PARTIAL'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : installment.status === 'OVERDUE'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {installment.status}
                              </span>
                            </div>
                            {parseFloat(String(installment.outstandingAmount || 0)) > 0 && (
                              <button
                                onClick={() => handleRecordPayment(student, installment)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                              >
                                {t.installments?.recordPayment || 'Record Payment'}
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm mt-3">
                            <div>
                              <p className="text-gray-600">Total</p>
                              <p className="font-semibold">{formatCurrency(installment.totalAmount)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Paid</p>
                              <p className="font-semibold text-green-600">
                                {formatCurrency(installment.paidAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Outstanding</p>
                              <p className="font-semibold text-red-600">
                                {formatCurrency(installment.outstandingAmount)}
                              </p>
                            </div>
                            {parseFloat(String(installment.discountAmount || 0)) > 0 && (
                              <div>
                                <p className="text-gray-600">Discount</p>
                                <p className="font-semibold text-blue-600">
                                  -{formatCurrency(installment.discountAmount)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    {t.installments?.noInstallments || 'No installments found'}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Payment Form Modal */}
      {showPaymentForm && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {t.installments?.recordPayment || 'Record Payment'}
            </h3>
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
                        studentId: selectedStudent.studentProfile!.id,
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
                      await fetchData();
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

      {/* Discount Form Modal */}
      {showDiscountForm && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {t.installments?.addDiscount || 'Add Discount'}
            </h3>
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
                        studentId: selectedStudent.studentProfile!.id,
                        amount: parseFloat(discountForm.amount),
                        reason: discountForm.reason || undefined,
                      });
                      setSuccess(t.installments?.discountCreated || 'Discount added successfully');
                      setShowDiscountForm(false);
                      setDiscountForm({ amount: '', reason: '' });
                      await fetchData();
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
    </div>
  );
}

