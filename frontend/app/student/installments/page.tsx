'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SettingsMenu from '@/components/SettingsMenu';
import {
  getMyInstallments,
  getMyOutstanding,
  getMyCurrentMonthInstallment,
} from '@/lib/api-client';
import type {
  StudentInstallment,
  PaymentRecord,
  InstallmentStatus,
} from '@/types';
import { format } from 'date-fns';

interface User {
  name: string;
  role: string;
}

// Month names will be loaded from localization

const getStatusColor = (status: InstallmentStatus) => {
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
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [installments, setInstallments] = useState<StudentInstallment[]>([]);
  const [currentMonth, setCurrentMonth] = useState<any>(null);
  const [outstanding, setOutstanding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

    setUser({ name: 'Student', role: 'STUDENT' });
    fetchData();
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [installmentsData, outstandingData, currentMonthData] =
        await Promise.all([
          getMyInstallments(selectedYear),
          getMyOutstanding(),
          getMyCurrentMonthInstallment(),
        ]);

      setInstallments(Array.isArray(installmentsData) ? installmentsData : []);
      setOutstanding(outstandingData || { totalOutstanding: '0', count: 0 });
      setCurrentMonth(currentMonthData || null);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        localStorage.clear();
        router.push('/login');
        return;
      }
      setError(err?.response?.data?.message || t.installments?.failedToLoad || 'Failed to load installments');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toFixed(2);
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
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl relative">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => router.push('/student')}
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
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {t.installments?.myInstallments || 'My Installments'}
                </h1>
                <p className="text-white/90 text-sm sm:text-base mt-1">
                  {t.installments?.paymentHistory || 'Payment History'}
                </p>
              </div>
            </div>
            <SettingsMenu onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
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

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Outstanding Balance */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      {t.installments?.outstandingBalance ||
                        'Outstanding Balance'}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(outstanding?.totalOutstanding || '0')}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {outstanding?.count || 0}{' '}
                      {outstanding?.count === 1 
                        ? (t.installments?.monthWithOutstanding || 'month with outstanding balance')
                        : (t.installments?.monthsWithOutstanding || 'months with outstanding balance')}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-red-600"
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
                </div>
              </div>

              {/* Current Month */}
              {currentMonth && (
                <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        {t.installments?.currentMonth ||
                          'Current Month Installment'}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {formatCurrency(
                          currentMonth.installment?.totalAmount || '0',
                        )}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {(t.installments?.monthNames as string[])?.[new Date().getMonth()] || ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][new Date().getMonth()]}{' '}
                        {new Date().getFullYear()}
                      </p>
                    </div>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Year Filter */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t.installments?.filterByYear || 'Filter by Year'}
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
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
                  {installments.map((installment) => (
                    <div
                      key={installment.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {(t.installments?.monthNames as string[])?.[installment.month - 1] || ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][installment.month - 1]}{' '}
                              {installment.year}
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
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                            <div>
                              <p className="text-sm text-gray-600">
                                {t.installments?.totalAmount || 'Total'}
                              </p>
                              <p className="text-lg font-semibold text-gray-900">
                                {formatCurrency(installment.totalAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">
                                {t.installments?.paidAmount || 'Paid'}
                              </p>
                              <p className="text-lg font-semibold text-green-600">
                                {formatCurrency(installment.paidAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">
                                {t.installments?.outstandingAmount ||
                                  'Outstanding'}
                              </p>
                              <p className="text-lg font-semibold text-red-600">
                                {formatCurrency(installment.outstandingAmount)}
                              </p>
                            </div>
                            {parseFloat(
                              String(installment.discountAmount || 0),
                            ) > 0 && (
                              <div>
                                <p className="text-sm text-gray-600">
                                  {t.installments?.discountAmountLabel ||
                                    'Discount'}
                                </p>
                                <p className="text-lg font-semibold text-blue-600">
                                  -{formatCurrency(installment.discountAmount)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Payment History */}
                      {installment.payments &&
                        installment.payments.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              {t.installments?.paymentHistory ||
                                'Payment History'}
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
                                      {format(
                                        new Date(payment.paymentDate),
                                        'MMM dd, yyyy',
                                      )}
                                      {payment.paymentMethod &&
                                        ` • ${payment.paymentMethod}`}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

