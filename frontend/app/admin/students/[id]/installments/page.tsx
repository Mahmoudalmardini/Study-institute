'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import apiClient, {
  getStudentInstallments,
  getStudentOutstandingBalance,
  calculateInstallment,
  createDiscount,
  cancelDiscount,
  recordPayment,
} from '@/lib/api-client';
import type { StudentInstallment, PaymentRecord } from '@/types';

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

type DiscountFormState = {
  type: 'AMOUNT' | 'PERCENT';
  amount: string;
  percent: string;
  reason: string;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'PARTIAL':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'OVERDUE':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export default function StudentInstallmentsPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;
  const { t } = useI18n();
  const [student, setStudent] = useState<any>(null);
  const [installments, setInstallments] = useState<StudentInstallment[]>([]);
  const [outstanding, setOutstanding] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [totalMonthlyCost, setTotalMonthlyCost] = useState<number>(0);
  const [subjectBreakdown, setSubjectBreakdown] = useState<Array<{
    subjectId: string;
    subjectName: string;
    amount: number;
    enrolledAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<StudentInstallment | null>(null);
  const [discountForm, setDiscountForm] = useState<DiscountFormState>({
    type: 'AMOUNT',
    amount: '',
    percent: '',
    reason: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    notes: '',
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const totalOutstandingNumber = (() => {
    const raw = outstanding?.totalOutstanding ?? 0;
    const parsed =
      typeof raw === 'number'
        ? raw
        : parseFloat(typeof raw === 'string' ? raw : String(raw ?? '0'));
    return isNaN(parsed) ? 0 : parsed;
  })();
  const isAmountDiscount = discountForm.type === 'AMOUNT';
  const parsedDiscountAmount = parseFloat(discountForm.amount || 'NaN');
  const parsedDiscountPercent = parseFloat(discountForm.percent || 'NaN');
  const amountProvided =
    !!discountForm.amount && !isNaN(parsedDiscountAmount);
  const amountExceedsOutstanding =
    isAmountDiscount &&
    amountProvided &&
    parsedDiscountAmount > totalOutstandingNumber;
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
    if (studentId) {
      fetchData();
    }
  }, [router, studentId, selectedYear]);

  const fetchData = async () => {
    if (!studentId) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Fetch student info
      const studentData = await apiClient.get(`/students/${studentId}`);
      setStudent(studentData);

      // Always fetch subjects to calculate total monthly cost
      let subjectsData: any[] = [];
      let totalCost = 0;
      let breakdown: Array<{
        subjectId: string;
        subjectName: string;
        amount: number;
        enrolledAt: string;
      }> = [];

      try {
        const studentSubjects = await apiClient.get(`/students/${studentId}/subjects`);
        subjectsData = Array.isArray(studentSubjects) ? studentSubjects : [];
        
        // Calculate total monthly cost and create breakdown
        subjectsData.forEach((ss: any) => {
          const subject = ss.subject || ss;
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
          breakdown.push({
            subjectId: subject.id,
            subjectName: subject.name,
            amount: monthlyInstallment,
            enrolledAt: ss.enrolledAt || ss.createdAt || new Date().toISOString(),
          });
          
          if (monthlyInstallment > 0) {
            totalCost += monthlyInstallment;
          } else if (monthlyInstallmentValue !== null && monthlyInstallmentValue !== undefined) {
            console.warn(`[Installments] Subject ${subject.name} (${subject.id}) has monthlyInstallment value but parsed to 0. Raw value:`, monthlyInstallmentValue);
          }
        });
      } catch (subjectsErr: any) {
        console.warn('Could not fetch subjects:', subjectsErr);
      }

      setSubjects(subjectsData);
      setTotalMonthlyCost(totalCost);
      setSubjectBreakdown(breakdown);

      // Fetch installments and outstanding balance
      const [installmentsData, outstandingData] = await Promise.all([
        getStudentInstallments(studentId, selectedYear).catch((err) => {
          if (err.response?.status === 404) return [];
          throw err;
        }),
        getStudentOutstandingBalance(studentId).catch((err) => {
          if (err.response?.status === 404) return { totalOutstanding: '0', count: 0 };
          throw err;
        }),
      ]);

      setInstallments(Array.isArray(installmentsData) ? installmentsData : []);
      setOutstanding(outstandingData || { totalOutstanding: '0', count: 0 });

      // Try to calculate current month installment
      try {
        const now = new Date();
        const currentMonthData = await calculateInstallment(
          studentId,
          now.getMonth() + 1,
          now.getFullYear(),
        );
        setCurrentMonth(currentMonthData || null);
        
        // Refresh installments after calculation
        const updatedInstallments = await getStudentInstallments(studentId, selectedYear).catch(() => []);
        setInstallments(Array.isArray(updatedInstallments) ? updatedInstallments : []);
      } catch (calcErr: any) {
        // If calculation fails, try to get current month from existing installments
        const now = new Date();
        const currentInst = (Array.isArray(installmentsData) ? installmentsData : []).find(
          (i: any) => i.month === now.getMonth() + 1 && i.year === now.getFullYear(),
        );
        if (currentInst) {
          setCurrentMonth({ installment: currentInst });
        } else {
          setCurrentMonth(null);
        }
        if (calcErr.response?.status !== 404) {
          console.warn('Could not calculate current month installment:', calcErr);
        }
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      if (err.response?.status === 401) {
        localStorage.clear();
        router.push('/login');
        return;
      }
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load installments data');
      } else {
        setInstallments([]);
        setOutstanding({ totalOutstanding: '0', count: 0 });
        setCurrentMonth(null);
      }
    } finally {
      setLoading(false);
    }
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
    return normalizeAmount(amount).toFixed(2);
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

  const currentInstallmentRecord = currentMonth?.installment;
  const currentInstallmentNetTotal = currentInstallmentRecord
    ? calculateNetTotal(
        currentInstallmentRecord.totalAmount,
        currentInstallmentRecord.discountAmount,
      )
    : 0;

  // Calculate monthly payment after discount
  // If there's a current month installment, calculate the discount ratio and apply it
  // Otherwise, use the base totalMonthlyCost
  let monthlyPaymentAfterDiscount = totalMonthlyCost;
  
  if (currentInstallmentRecord) {
    const installmentTotal = normalizeAmount(currentInstallmentRecord.totalAmount);
    const installmentDiscount = normalizeAmount(currentInstallmentRecord.discountAmount);
    
    // If the installment total matches the monthly cost (no outstanding from previous months),
    // use the net total directly
    if (Math.abs(installmentTotal - totalMonthlyCost) < 0.01) {
      monthlyPaymentAfterDiscount = currentInstallmentNetTotal;
    } else if (installmentDiscount > 0 && installmentTotal > 0) {
      // Calculate discount percentage and apply to monthly cost
      const discountPercentage = (installmentDiscount / installmentTotal) * 100;
      monthlyPaymentAfterDiscount = totalMonthlyCost * (1 - discountPercentage / 100);
      if (monthlyPaymentAfterDiscount < 0) monthlyPaymentAfterDiscount = 0;
    }
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <nav className="bg-gradient-to-r from-emerald-600 to-green-600 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1 gap-3">
              <button
                onClick={() => router.push('/admin/students')}
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
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                  {t.installments?.title || 'Installments Management'}
                </h1>
                {student && (
                  <p className="text-sm text-white/90 truncate">
                    {student.user?.firstName} {student.user?.lastName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <SettingsMenu onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
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

        {/* Total Monthly Cost Card - Always show if student has subjects */}
        {subjectBreakdown.length > 0 && (
          <div className="mb-6 p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">
                  {t.installments?.monthlyPayment || 'Monthly Payment'}
                </p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
                  {formatCurrency(monthlyPaymentAfterDiscount || 0)}
                </p>
                {monthlyPaymentAfterDiscount < totalMonthlyCost && totalMonthlyCost > 0 && (
                  <p className="text-xs text-gray-500 mt-1 break-words">
                    <span className="line-through">{formatCurrency(totalMonthlyCost)}</span>
                    {' '}
                    <span className="text-emerald-600 font-semibold">
                      (Discount: {formatCurrency(totalMonthlyCost - monthlyPaymentAfterDiscount)})
                    </span>
                  </p>
                )}
                {totalMonthlyCost === 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Some subjects may not have monthly costs set. Please update subject costs in the Subjects page.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Subject Breakdown */}
        {subjectBreakdown.length > 0 && (
          <div className="mb-6 p-6 bg-white border border-gray-200 rounded-xl">
            <p className="text-lg font-semibold text-gray-700 mb-4">
              {t.installments?.subjectBreakdown || 'Subject Breakdown'}
            </p>
            <div className="space-y-3">
              {subjectBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between py-3 border-b border-gray-200 last:border-0 ${
                    item.amount === 0 ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-gray-700 font-medium text-sm sm:text-base truncate">{item.subjectName}</span>
                    <span className="text-xs text-gray-500">Monthly Cost</span>
                  </div>
                  <span className={`font-semibold text-sm sm:text-base lg:text-lg flex-shrink-0 ml-2 ${item.amount === 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                    {formatCurrency(item.amount)}
                    {item.amount === 0 && (
                      <span className="ml-1 sm:ml-2 text-xs text-amber-600 font-normal">(No cost set)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 sm:p-6 border border-red-200">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              {t.installments?.outstandingBalance || 'Outstanding Balance'}
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
              {formatCurrency(outstanding?.totalOutstanding || '0')}
            </p>
          </div>
          {currentMonth && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 border border-blue-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">
                {t.installments?.currentMonth || 'Current Month Installment'}
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
                {formatCurrency(currentInstallmentNetTotal)}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => {
              setDiscountForm({
                type: 'AMOUNT',
                amount: '',
                percent: '',
                reason: '',
              });
              setShowDiscountForm(true);
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.installments?.addDiscount || 'Add Discount'}
          </button>
          <button
            onClick={async () => {
              // If no current month installment, create it first
              let installment = currentMonth?.installment;
              if (!installment?.id && totalMonthlyCost > 0) {
                try {
                  const now = new Date();
                  await calculateInstallment(
                    studentId,
                    now.getMonth() + 1,
                    now.getFullYear(),
                  );
                  // Fetch updated installments
                  const updatedInstallments = await getStudentInstallments(studentId, selectedYear);
                  const currentInst = Array.isArray(updatedInstallments)
                    ? updatedInstallments.find(
                        (i: StudentInstallment) =>
                          i.month === now.getMonth() + 1 && i.year === now.getFullYear(),
                      )
                    : null;
                  if (currentInst) {
                    installment = currentInst;
                  } else {
                    setError('Failed to create installment. Please try again.');
                    return;
                  }
                } catch (err: any) {
                  setError(err.response?.data?.message || 'Failed to create installment');
                  return;
                }
              }

              if (installment?.id) {
                setSelectedInstallment(installment);
                setPaymentForm({
                  amount: '',
                  paymentDate: new Date().toISOString().split('T')[0],
                  paymentMethod: '',
                  notes: '',
                });
                setShowPaymentForm(true);
              } else {
                setError('No installment available for payment');
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t.installments?.recordPayment || 'Record Payment'}
          </button>
        </div>

        {/* Year Filter */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t.installments?.filterByYear || 'Filter by Year'}
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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

        {/* Installments List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {t.installments?.paymentHistory || 'Payment History'}
            </h2>
          </div>
          {installments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">
                {t.installments?.noInstallments || 'No installments found'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {installments.map((installment) => {
                const discountValue = normalizeAmount(installment.discountAmount);
                const totalAfterDiscount = calculateNetTotal(
                  installment.totalAmount,
                  discountValue,
                );

                return (
                  <div
                    key={installment.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {monthNames[installment.month - 1]} {installment.year}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            installment.status,
                          )}`}
                        >
                          {t.installments?.[
                            `status${installment.status}` as keyof typeof t.installments
                          ] || installment.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">
                            {t.installments?.totalAmount || 'Total'}
                          </p>
                          <p className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 break-words">
                            {formatCurrency(totalAfterDiscount)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">
                            {t.installments?.paidAmount || 'Paid'}
                          </p>
                          <p className="text-sm sm:text-base lg:text-lg font-semibold text-green-600 break-words">
                            {formatCurrency(installment.paidAmount)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">
                            {parseFloat(String(installment.outstandingAmount || 0)) < 0
                              ? t.installments?.overpaidLabel || 'Overpaid'
                              : t.installments?.outstandingAmount || 'Outstanding'}
                          </p>
                          <p className={`text-sm sm:text-base lg:text-lg font-semibold break-words ${
                            parseFloat(String(installment.outstandingAmount || 0)) < 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {parseFloat(String(installment.outstandingAmount || 0)) < 0
                              ? formatCurrency(Math.abs(parseFloat(String(installment.outstandingAmount || 0))))
                              : formatCurrency(installment.outstandingAmount)}
                          </p>
                        </div>
                        {discountValue > 0 && (
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">
                              {t.installments?.discountAmountLabel || 'Discount'}
                            </p>
                            <p className="text-sm sm:text-base lg:text-lg font-semibold text-blue-600 break-words">
                              -{formatCurrency(discountValue)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {parseFloat(String(installment.outstandingAmount || 0)) > 0 && (
                      <button
                        onClick={() => {
                          setSelectedInstallment(installment);
                          setPaymentForm({
                            amount: '',
                            paymentDate: new Date().toISOString().split('T')[0],
                            paymentMethod: '',
                            notes: '',
                          });
                          setShowPaymentForm(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        {t.installments?.recordPayment || 'Record Payment'}
                      </button>
                    )}
                  </div>

                  {/* Payment History */}
                  {installment.payments && installment.payments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        {t.installments?.paymentHistory || 'Payment History'}
                      </p>
                      <div className="space-y-2">
                        {installment.payments.map((payment: PaymentRecord) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatCurrency(payment.amount)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(payment.paymentDate).toLocaleDateString()}
                                {payment.paymentMethod && ` • ${payment.paymentMethod}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Discount Form Modal */}
      {showDiscountForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {t.installments?.addDiscount || 'Add Discount'}
            </h3>
            <div className="space-y-4">
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
                    max={totalOutstandingNumber}
                    value={discountForm.amount}
                    onChange={(e) =>
                      setDiscountForm({ ...discountForm, amount: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg ${
                      discountAmountInvalid
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {amountExceedsOutstanding && (
                    <p className="mt-1 text-sm text-red-600">
                      {(t.installments?.discountAmountExceedsError ||
                        'Discount amount cannot exceed total outstanding balance ({amount})').replace(
                        '{amount}',
                        formatCurrency(totalOutstandingNumber),
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
                      setDiscountForm({
                        ...discountForm,
                        percent: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-2 border rounded-lg ${
                      discountPercentInvalid
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="0"
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
                        setTimeout(() => setError(''), 5000);
                        return;
                      }
                      if (amountExceedsOutstanding) {
                        setError(
                          (t.installments?.discountAmountExceedsError ||
                            'Discount amount cannot exceed total outstanding balance ({amount})').replace(
                            '{amount}',
                            formatCurrency(totalOutstandingNumber),
                          ),
                        );
                        setTimeout(() => setError(''), 5000);
                        return;
                      }
                    } else {
                      if (!percentProvided || percentNonPositive) {
                        setError(
                          t.installments?.invalidDiscountPercent ||
                            'Please enter a valid discount percentage',
                        );
                        setTimeout(() => setError(''), 5000);
                        return;
                      }
                      if (percentTooLarge) {
                        setError(
                          t.installments?.discountPercentExceedsError ||
                            'Percentage discount cannot exceed 100%.',
                        );
                        setTimeout(() => setError(''), 5000);
                        return;
                      }
                    }

                    try {
                      await createDiscount({
                        studentId: studentId,
                        amount: isAmountDiscount ? parsedDiscountAmount : undefined,
                        percent: !isAmountDiscount ? parsedDiscountPercent : undefined,
                        reason: discountForm.reason || undefined,
                      });
                      setSuccess(t.installments?.discountCreated || 'Discount added successfully');
                      setShowDiscountForm(false);
                      setDiscountForm({
                        type: 'AMOUNT',
                        amount: '',
                        percent: '',
                        reason: '',
                      });
                      setTimeout(() => setSuccess(''), 3000);
                      await fetchData();
                    } catch (err: any) {
                      setError(err.response?.data?.message || 'Failed to add discount');
                      setTimeout(() => setError(''), 5000);
                    }
                  }}
                  disabled={disableDiscountSubmit}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
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

      {/* Payment Form Modal */}
      {showPaymentForm && selectedInstallment && (
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
                  type="text"
                  value={paymentForm.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setPaymentForm({ ...paymentForm, amount: value });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
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
                        studentId: studentId,
                        installmentId: selectedInstallment.id,
                        amount: parseFloat(paymentForm.amount),
                        paymentDate: paymentForm.paymentDate,
                        paymentMethod: paymentForm.paymentMethod || undefined,
                        notes: paymentForm.notes || undefined,
                      });
                      setSuccess(t.installments?.paymentRecorded || 'Payment recorded successfully');
                      setShowPaymentForm(false);
                      setPaymentForm({
                        amount: '',
                        paymentDate: new Date().toISOString().split('T')[0],
                        paymentMethod: '',
                        notes: '',
                      });
                      setSelectedInstallment(null);
                      setTimeout(() => setSuccess(''), 3000);
                      await fetchData();
                    } catch (err: any) {
                      setError(err.response?.data?.message || 'Failed to record payment');
                      setTimeout(() => setError(''), 5000);
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
                      amount: '',
                      paymentDate: new Date().toISOString().split('T')[0],
                      paymentMethod: '',
                      notes: '',
                    });
                    setSelectedInstallment(null);
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

