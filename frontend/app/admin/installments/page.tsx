'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import apiClient, {
  getStudentInstallments,
  getStudentOutstandingBalance,
  calculateInstallment,
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
  subjects?: any[];
  totalMonthlyCost?: number;
  subjectBreakdown?: Array<{
    subjectId: string;
    subjectName: string;
    amount: number;
    enrolledAt: string;
  }>;
}

type DiscountFormState = {
  type: 'AMOUNT' | 'PERCENT';
  amount: string;
  percent: string;
  reason: string;
};

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
  const [discountForm, setDiscountForm] = useState<DiscountFormState>({
    type: 'AMOUNT',
    amount: '',
    percent: '',
    reason: '',
  });
  const [selectedInstallmentOutstanding, setSelectedInstallmentOutstanding] = useState<number>(0);
  const [selectedStudentTotalOutstanding, setSelectedStudentTotalOutstanding] = useState<number>(0);

  const isAmountDiscount = discountForm.type === 'AMOUNT';
  const parsedDiscountAmount = parseFloat(discountForm.amount || 'NaN');
  const parsedDiscountPercent = parseFloat(discountForm.percent || 'NaN');
  const amountProvided =
    !!discountForm.amount && !isNaN(parsedDiscountAmount);
  const amountExceedsOutstanding =
    isAmountDiscount &&
    amountProvided &&
    parsedDiscountAmount > selectedStudentTotalOutstanding;
  const amountNonPositive =
    isAmountDiscount && amountProvided && parsedDiscountAmount <= 0;
  const discountAmountInvalid =
    isAmountDiscount &&
    (!amountProvided || amountExceedsOutstanding || amountNonPositive);
  const percentProvided =
    !!discountForm.percent && !isNaN(parsedDiscountPercent);
  const percentTooLarge =
    !isAmountDiscount && percentProvided && parsedDiscountPercent > 100;
  const percentNonPositive =
    !isAmountDiscount && percentProvided && parsedDiscountPercent <= 0;
  const discountPercentInvalid =
    !isAmountDiscount &&
    (!percentProvided || percentTooLarge || percentNonPositive);
  const disableDiscountSubmit = isAmountDiscount
    ? discountAmountInvalid
    : discountPercentInvalid;

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

      // Fetch installments and subjects for each student
      const studentsWithInstallments = await Promise.all(
        studentsWithProfiles.map(async (student) => {
          if (!student.studentProfile?.id) return student;

          try {
            // Always fetch subjects to calculate total monthly cost
            let subjects: any[] = [];
            let totalMonthlyCost = 0;
            let subjectBreakdown: Array<{
              subjectId: string;
              subjectName: string;
              amount: number;
              enrolledAt: string;
            }> = [];

            try {
              const studentSubjects = await apiClient.get(`/students/${student.studentProfile.id}/subjects`);
              subjects = Array.isArray(studentSubjects) ? studentSubjects : [];
              console.log(`[Installments] Student ${student.studentProfile.id} has ${subjects.length} subjects`);
              
              // Calculate total monthly cost and create breakdown
              subjects.forEach((ss: any) => {
                const subject = ss.subject || ss;
                // Check if monthlyInstallment exists and is not null/undefined
                let monthlyInstallmentValue = subject.monthlyInstallment;
                
                // Handle Prisma Decimal serialization (can be string, number, or object with toString/toNumber)
                let monthlyInstallment = 0;
                if (monthlyInstallmentValue !== null && monthlyInstallmentValue !== undefined) {
                  // Try multiple methods to extract the value
                  if (typeof monthlyInstallmentValue === 'number') {
                    monthlyInstallment = monthlyInstallmentValue;
                  } else if (typeof monthlyInstallmentValue === 'string') {
                    monthlyInstallment = parseFloat(monthlyInstallmentValue);
                  } else if (typeof monthlyInstallmentValue === 'object') {
                    // Handle Prisma Decimal object - try different methods
                    if (typeof monthlyInstallmentValue.toNumber === 'function') {
                      monthlyInstallment = monthlyInstallmentValue.toNumber();
                    } else if (typeof monthlyInstallmentValue.toString === 'function') {
                      monthlyInstallment = parseFloat(monthlyInstallmentValue.toString());
                    } else if (monthlyInstallmentValue.value !== undefined) {
                      // Some Decimal implementations use .value
                      monthlyInstallment = parseFloat(String(monthlyInstallmentValue.value));
                    } else {
                      // Try to parse the object as string
                      monthlyInstallment = parseFloat(String(monthlyInstallmentValue));
                    }
                  } else {
                    monthlyInstallment = parseFloat(String(monthlyInstallmentValue));
                  }
                  
                  // Handle NaN and ensure it's a valid number
                  if (isNaN(monthlyInstallment) || !isFinite(monthlyInstallment)) {
                    monthlyInstallment = 0;
                  }
                }
                
                console.log(`[Installments] Subject ${subject.name} (${subject.id}): monthlyInstallment=${JSON.stringify(monthlyInstallmentValue)} (type: ${typeof monthlyInstallmentValue}), parsed=${monthlyInstallment}`);
                
                // Always add to breakdown, even if 0, so we can show all subjects
                subjectBreakdown.push({
                  subjectId: subject.id,
                  subjectName: subject.name,
                  amount: monthlyInstallment,
                  enrolledAt: ss.enrolledAt || ss.createdAt || new Date().toISOString(),
                });
                
                if (monthlyInstallment > 0) {
                  totalMonthlyCost += monthlyInstallment;
                } else if (monthlyInstallmentValue !== null && monthlyInstallmentValue !== undefined) {
                  console.warn(`[Installments] Subject ${subject.name} (${subject.id}) has monthlyInstallment value but parsed to 0. Raw value:`, monthlyInstallmentValue);
                } else {
                  console.warn(`[Installments] Subject ${subject.name} (${subject.id}) has no monthlyInstallment value set!`);
                }
              });
              console.log(`[Installments] Student ${student.studentProfile.id} totalMonthlyCost: ${totalMonthlyCost}, breakdown:`, subjectBreakdown);
              if (totalMonthlyCost === 0 && subjects.length > 0) {
                console.warn(`[Installments] WARNING: Student ${student.studentProfile.id} has ${subjects.length} subjects but totalMonthlyCost is 0. Subjects may not have monthlyInstallment values set in the database.`);
              }
            } catch (subjectsErr: any) {
              // Silently ignore if we can't fetch subjects
              console.warn(`Could not fetch subjects for student ${student.studentProfile.id}:`, subjectsErr);
            }

            // Try to get existing installments
            let installments: any[] = [];
            try {
              const installmentsData = await getStudentInstallments(student.studentProfile.id, filterYear);
              // Backend returns empty array if no installments, not 404
              installments = Array.isArray(installmentsData) ? installmentsData : [];
              console.log(`Student ${student.studentProfile.id} - Found ${installments.length} existing installments`);
            } catch (err: any) {
              // 404 can mean either student doesn't exist OR no installments exist yet
              // Both are handled the same way - empty array
              if (err.response?.status === 404) {
                // Silently handle 404 - this is expected when student doesn't exist or has no installments
                installments = [];
              } else {
                // Only log non-404 errors
                console.error(`Student ${student.studentProfile.id} - Error fetching installments:`, err);
                installments = [];
              }
            }

            // Always calculate/update installment for current month if student has subjects with installments
            // This ensures installments are created even if they were enrolled before the auto-calculation was added
            if (totalMonthlyCost > 0) {
              const now = new Date();
              const currentMonth = now.getMonth() + 1;
              const currentYear = now.getFullYear();
              const currentMonthInst = installments.find(
                (i: StudentInstallment) =>
                  i.month === currentMonth && i.year === currentYear,
              );

              // Always calculate to ensure installments are up-to-date (handles new enrollments and updates)
              try {
                console.log(`[Installments] Calculating for student ${student.studentProfile.id}, month ${currentMonth}, year ${currentYear}, totalCost: ${totalMonthlyCost}, hasExisting: ${!!currentMonthInst}`);
                const calcResult = await calculateInstallment(
                  student.studentProfile.id,
                  currentMonth,
                  currentYear,
                );
                console.log(`[Installments] Calculation result:`, calcResult);
                
                // Wait a bit for the database to update
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Fetch installments again after calculation
                try {
                  const newInstallments = await getStudentInstallments(student.studentProfile.id, filterYear);
                  installments = Array.isArray(newInstallments) ? newInstallments : [];
                  console.log(`[Installments] After calculation, found ${installments.length} installments for student ${student.studentProfile.id}`);
                } catch (fetchErr: any) {
                  // Silently handle 404 - expected in some cases
                  if (fetchErr.response?.status !== 404) {
                    console.error(`[Installments] Error fetching after calculation:`, fetchErr);
                  }
                  // Keep existing installments array
                }
              } catch (calcErr: any) {
                // Log the full error for debugging
                console.error(`[Installments] Calculation failed for student ${student.studentProfile.id}:`, {
                  error: calcErr,
                  message: calcErr?.message,
                  response: calcErr?.response?.data,
                  status: calcErr?.response?.status,
                  stack: calcErr?.stack,
                });
                // Don't throw - continue with existing installments if any
              }
            }

            // Fetch outstanding balance and current month
            const [outstanding, currentMonth] = await Promise.all([
              getStudentOutstandingBalance(student.studentProfile.id).catch((err: any) => {
                // Silently handle 404 - expected when student doesn't exist or has no outstanding balance
                if (err.response?.status === 404) {
                  return { totalOutstanding: '0', count: 0 };
                }
                // Log other errors but still return default
                console.error(`Error fetching outstanding balance for student ${student.studentProfile.id}:`, err);
                return { totalOutstanding: '0', count: 0 };
              }),
              Promise.resolve().then(() => {
                const now = new Date();
                return installments.find(
                  (i: StudentInstallment) =>
                    i.month === now.getMonth() + 1 && i.year === now.getFullYear(),
                );
              }),
            ]);

            return {
              ...student,
              installments,
              outstanding,
              currentMonth,
              subjects,
              totalMonthlyCost,
              subjectBreakdown,
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

  const handleRecordPayment = async (student: StudentWithInstallments, installment?: StudentInstallment) => {
    setSelectedStudent(student);
    
    // If no installment provided, create it first
    let installmentId = installment?.id;
    let outstandingAmount = 0;
    
    if (!installmentId && student.studentProfile?.id) {
      try {
        const now = new Date();
        await calculateInstallment(
          student.studentProfile.id,
          now.getMonth() + 1,
          now.getFullYear(),
        );
        // Fetch the newly created installment
        const installments = await getStudentInstallments(student.studentProfile.id);
        const currentInst = Array.isArray(installments)
          ? installments.find(
              (i: StudentInstallment) =>
                i.month === now.getMonth() + 1 && i.year === now.getFullYear(),
            )
          : null;
        if (currentInst) {
          installmentId = currentInst.id;
          outstandingAmount = parseFloat(String(currentInst.outstandingAmount || 0));
        } else {
          setError('Failed to create installment. Please try again.');
          return;
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to create installment');
        return;
      }
    } else if (installment) {
      outstandingAmount = parseFloat(String(installment.outstandingAmount || 0));
    }

    if (!installmentId) {
      setError('No installment available for payment');
      return;
    }

    setSelectedInstallmentOutstanding(outstandingAmount);
    setPaymentForm({
      installmentId,
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      notes: '',
    });
    setShowPaymentForm(true);
  };

  const handleAddDiscount = (student: StudentWithInstallments) => {
    setSelectedStudent(student);
    const totalOutstanding = parseFloat(
      String(student.outstanding?.totalOutstanding || '0'),
    );
    setSelectedStudentTotalOutstanding(
      Number.isFinite(totalOutstanding) ? totalOutstanding : 0,
    );
    setDiscountForm({ type: 'AMOUNT', amount: '', percent: '', reason: '' });
    setShowDiscountForm(true);
  };

  const normalizeAmount = (value: number | string | null | undefined) => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const calculateNetTotal = (
    total?: number | string | null,
    discount?: number | string | null,
  ) => {
    const base = normalizeAmount(total);
    const discountValue = normalizeAmount(discount);
    const net = base - discountValue;
    return net < 0 ? 0 : net;
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    const num = normalizeAmount(amount);
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
                {t.installments?.searchStudents || 'Search Students'}
              </label>
              <input
                type="text"
                placeholder={t.installments?.searchPlaceholder || 'Search by name or email...'}
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
                <option value="pending">{t.installments?.statusPending || 'Pending'}</option>
                <option value="partial">{t.installments?.statusPartial || 'Partial'}</option>
                <option value="paid">{t.installments?.statusPaid || 'Paid'}</option>
                <option value="overdue">{t.installments?.statusOverdue || 'Overdue'}</option>
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
                className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-base sm:text-lg">
                        {student.firstName[0]}
                        {student.lastName[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAddDiscount(student)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs sm:text-sm font-medium whitespace-nowrap"
                    >
                      {t.installments?.addDiscount || 'Add Discount'}
                    </button>
                  </div>
                </div>

                {/* Total Monthly Cost Card - Always show if student has subjects */}
                {student.subjectBreakdown && student.subjectBreakdown.length > 0 && (
                  <div className="mb-4 p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-600 mb-1">
                          {t.installments?.monthlyPayment || 'Monthly Payment'}
                        </p>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
                          {formatCurrency(student.totalMonthlyCost || 0)}
                        </p>
                        {student.totalMonthlyCost === 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            Some subjects may not have monthly costs set
                          </p>
                        )}
                      </div>
                      {student.totalMonthlyCost > 0 && (
                          <button
                            onClick={() => handleRecordPayment(student, student.currentMonth)}
                            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0"
                          >
                            {t.installments?.recordPayment || 'Record Payment'}
                          </button>
                        )}
                    </div>
                  </div>
                )}

                {/* Subject Breakdown */}
                {student.subjectBreakdown && student.subjectBreakdown.length > 0 && (
                  <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      {t.installments?.subjectBreakdown || 'Subject Breakdown'}
                    </p>
                    <div className="space-y-2">
                      {student.subjectBreakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between text-sm py-2 border-b border-gray-200 last:border-0 ${
                            item.amount === 0 ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-gray-700 font-medium text-sm sm:text-base truncate">{item.subjectName}</span>
                            <span className="text-xs text-gray-500">{t.installments?.monthlyCost || 'Monthly Cost'}</span>
                          </div>
                          <span className={`font-semibold text-sm sm:text-base flex-shrink-0 ml-2 ${item.amount === 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                            {formatCurrency(item.amount)}
                            {item.amount === 0 && (
                              <span className="ml-1 sm:ml-2 text-xs text-amber-600">(No cost set)</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {student.outstanding && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 break-words">
                      {t.installments?.outstandingBalance || 'Outstanding Balance'}:{' '}
                      <span className="font-bold text-red-600 text-sm sm:text-base">
                        {formatCurrency(student.outstanding.totalOutstanding || '0')}
                      </span>
                    </p>
                  </div>
                )}

                {/* Show installments if they exist, or show message if student has subjects but no installments */}
                {student.installments && student.installments.length > 0 ? (
                  <div className="space-y-3">
                    {student.installments
                      .filter((inst) => !filterMonth || inst.month === filterMonth)
                      .map((installment) => (
                        <div
                          key={installment.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm sm:text-base text-gray-900">
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
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0"
                              >
                                {t.installments?.recordPayment || 'Record Payment'}
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm mt-3">
                            {(() => {
                              const totalBeforeDiscount = normalizeAmount(installment.totalAmount);
                              const discountValue = normalizeAmount(installment.discountAmount);
                              const totalAfterDiscount = calculateNetTotal(
                                totalBeforeDiscount,
                                discountValue,
                              );
                              return (
                                <>
                                  <div className="min-w-0">
                                    <p className="text-gray-600 text-xs mb-1">Total</p>
                                    <p className="font-semibold text-sm sm:text-base break-words">
                                      {formatCurrency(totalAfterDiscount)}
                                    </p>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-gray-600 text-xs mb-1">{t.installments?.paid || 'Paid'}</p>
                                    <p className="font-semibold text-green-600 text-sm sm:text-base break-words">
                                      {formatCurrency(installment.paidAmount)}
                                    </p>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-gray-600 text-xs mb-1">
                                      {parseFloat(String(installment.outstandingAmount || 0)) < 0
                                        ? t.installments?.overpaidLabel || 'Overpaid'
                                        : t.installments?.outstandingLabel || 'Outstanding'}
                                    </p>
                                    <p
                                      className={`font-semibold text-sm sm:text-base break-words ${
                                        parseFloat(String(installment.outstandingAmount || 0)) < 0
                                          ? 'text-green-600'
                                          : 'text-red-600'
                                      }`}
                                    >
                                      {parseFloat(String(installment.outstandingAmount || 0)) < 0
                                        ? formatCurrency(
                                            Math.abs(
                                              parseFloat(
                                                String(installment.outstandingAmount || 0),
                                              ),
                                            ),
                                          )
                                        : formatCurrency(installment.outstandingAmount)}
                                    </p>
                                  </div>
                                  {discountValue > 0 && (
                                    <div className="min-w-0">
                                      <p className="text-gray-600 text-xs mb-1">Discount</p>
                                      <p className="font-semibold text-blue-600 text-sm sm:text-base break-words">
                                        -{formatCurrency(discountValue)}
                                      </p>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : student.totalMonthlyCost !== undefined && student.totalMonthlyCost > 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">
                      {t.installments?.noInstallments || 'No installments found'}
                    </p>
                    <p className="text-sm text-gray-400">
                      Installments will be created automatically when subjects are assigned.
                    </p>
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
              <div className={`mb-3 p-3 border rounded-lg ${
                selectedInstallmentOutstanding < 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className="text-sm text-gray-600">
                  {selectedInstallmentOutstanding < 0
                    ? t.installments?.overpaidLabel || 'Overpaid Amount'
                    : t.installments?.outstandingAmountLabel || 'Outstanding Amount'}: <span className={`font-bold ${
                      selectedInstallmentOutstanding < 0
                        ? 'text-green-600'
                        : 'text-blue-600'
                    }`}>
                      {selectedInstallmentOutstanding < 0
                        ? formatCurrency(Math.abs(selectedInstallmentOutstanding))
                        : formatCurrency(selectedInstallmentOutstanding)}
                    </span>
                </p>
              </div>
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
                {paymentForm.amount && parseFloat(paymentForm.amount) > selectedInstallmentOutstanding && (
                  <p className="mt-1 text-sm text-blue-600">
                    {t.installments?.overpaymentInfo || 'Payment exceeds outstanding amount. Excess will be applied to future installments.'}
                  </p>
                )}
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
                    const paymentAmount = parseFloat(paymentForm.amount);
                    if (isNaN(paymentAmount) || !paymentForm.amount || paymentAmount <= 0) {
                      setError(t.installments?.invalidPaymentAmount || 'Please enter a valid payment amount');
                      return;
                    }
                    try {
                      await recordPayment({
                        studentId: selectedStudent.studentProfile!.id,
                        installmentId: paymentForm.installmentId,
                        amount: paymentAmount,
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
                      setSelectedInstallmentOutstanding(0);
                      await fetchData();
                    } catch (err: any) {
                      setError(err.response?.data?.message || 'Failed to record payment');
                    }
                  }}
                  disabled={!paymentForm.amount || isNaN(parseFloat(paymentForm.amount)) || parseFloat(paymentForm.amount) <= 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                    setSelectedInstallmentOutstanding(0);
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
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  {t.installments?.totalOutstandingBalanceLabel || 'Total Outstanding Balance'}: <span className="font-bold text-blue-600">{formatCurrency(selectedStudentTotalOutstanding)}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {t.installments?.discountType || 'Discount Type'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountForm((prev) => ({
                        ...prev,
                        type: 'AMOUNT',
                        percent: '',
                      }))
                    }
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                      isAmountDiscount
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-300 text-gray-600 hover:border-emerald-300'
                    }`}
                  >
                    {t.installments?.discountTypeAmount || 'Fixed Amount'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountForm((prev) => ({
                        ...prev,
                        type: 'PERCENT',
                        amount: '',
                      }))
                    }
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                      !isAmountDiscount
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-300 text-gray-600 hover:border-emerald-300'
                    }`}
                  >
                    {t.installments?.discountTypePercent || 'Percentage'}
                  </button>
                </div>
              </div>
              {isAmountDiscount ? (
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    {t.installments?.discountAmount || 'Discount Amount'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedStudentTotalOutstanding}
                    value={discountForm.amount}
                    onChange={(e) =>
                      setDiscountForm({ ...discountForm, amount: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg ${
                      discountAmountInvalid
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {amountExceedsOutstanding && (
                    <p className="mt-1 text-sm text-red-600">
                      {(t.installments?.discountAmountExceedsError ||
                        'Discount amount cannot exceed total outstanding balance ({amount})').replace(
                        '{amount}',
                        formatCurrency(selectedStudentTotalOutstanding),
                      )}
                    </p>
                  )}
                  {amountNonPositive && (
                    <p className="mt-1 text-sm text-red-600">
                      {t.installments?.invalidDiscountAmount ||
                        'Please enter a valid discount amount'}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    {t.installments?.discountPercent || 'Discount Percentage'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={discountForm.percent}
                    onChange={(e) =>
                      setDiscountForm({ ...discountForm, percent: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg ${
                      discountPercentInvalid
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t.installments?.discountPercentHelper ||
                      'Applies to the student’s monthly tuition from this month onward.'}
                  </p>
                  {percentTooLarge && (
                    <p className="mt-1 text-sm text-red-600">
                      {t.installments?.discountPercentExceedsError ||
                        'Percentage discount cannot exceed 100%.'}
                    </p>
                  )}
                  {percentNonPositive && (
                    <p className="mt-1 text-sm text-red-600">
                      {t.installments?.invalidDiscountPercent ||
                        'Please enter a valid percentage between 0 and 100.'}
                    </p>
                  )}
                </div>
              )}
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
                    if (isAmountDiscount) {
                      if (!amountProvided || amountNonPositive) {
                        setError(
                          t.installments?.invalidDiscountAmount ||
                            'Please enter a valid discount amount',
                        );
                        return;
                      }
                      if (amountExceedsOutstanding) {
                        setError(
                          (t.installments?.discountAmountExceedsError ||
                            'Discount amount cannot exceed total outstanding balance ({amount})').replace(
                            '{amount}',
                            formatCurrency(selectedStudentTotalOutstanding),
                          ),
                        );
                        return;
                      }
                    } else if (discountPercentInvalid) {
                      if (!percentProvided || percentNonPositive) {
                        setError(
                          t.installments?.invalidDiscountPercent ||
                            'Please enter a valid discount percentage',
                        );
                        return;
                      }
                      if (percentTooLarge) {
                        setError(
                          t.installments?.discountPercentExceedsError ||
                            'Percentage discount cannot exceed 100%.',
                        );
                        return;
                      }
                    }

                    try {
                      await createDiscount({
                        studentId: selectedStudent.studentProfile!.id,
                        amount: isAmountDiscount ? parsedDiscountAmount : undefined,
                        percent: !isAmountDiscount ? parsedDiscountPercent : undefined,
                        reason: discountForm.reason || undefined,
                      });
                      setSuccess(
                        t.installments?.discountCreated ||
                          'Discount added successfully',
                      );
                      setShowDiscountForm(false);
                      setDiscountForm({
                        type: 'AMOUNT',
                        amount: '',
                        percent: '',
                        reason: '',
                      });
                      setSelectedStudentTotalOutstanding(0);
                      await fetchData();
                    } catch (err: any) {
                      setError(
                        err.response?.data?.message || 'Failed to add discount',
                      );
                    }
                  }}
                  disabled={disableDiscountSubmit}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowDiscountForm(false);
                    setDiscountForm({
                      type: 'AMOUNT',
                      amount: '',
                      percent: '',
                      reason: '',
                    });
                    setSelectedStudentTotalOutstanding(0);
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

