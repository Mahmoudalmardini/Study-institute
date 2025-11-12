'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { getMyOutstanding, getMyCurrentMonthInstallment } from '@/lib/api-client';

interface User {
  name: string;
  role: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [outstanding, setOutstanding] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setUser({ name: 'Student', role: 'STUDENT' });
    fetchInstallmentSummary();
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchInstallmentSummary = async () => {
    try {
      const [outstandingData, currentMonthData] = await Promise.all([
        getMyOutstanding(),
        getMyCurrentMonthInstallment(),
      ]);
      setOutstanding(outstandingData || { totalOutstanding: '0' });
      setCurrentMonth(currentMonthData || null);
    } catch (err) {
      // Silently fail - installments are optional
      console.error('Failed to load installment summary:', err);
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
      {/* Enhanced Header with Gradient */}
      <nav className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1 gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                </svg>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                <span className="hidden sm:inline">{t.common.appName} - </span>
                {t.student.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <span className="hidden md:inline text-sm text-white/90 font-medium">
                {t.student.welcome}, {user.name}
              </span>
              <SettingsMenu onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome Banner with Motivational Quote */}
        <div className={`mb-8 p-6 sm:p-8 bg-white rounded-2xl shadow-lg border-l-4 border-purple-600 ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t.student.welcomeBack}, {user.name}! ⭐
              </h2>
              <p className="text-gray-600 text-base sm:text-lg mb-3">
                {t.student.dashboardGreeting}
              </p>
              <p className="text-sm italic text-purple-600 border-l-2 border-purple-300 pl-3">
                &ldquo;{t.student.motivationalQuote}&rdquo;
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
            {/* My Homework Card - Clickable */}
            <button
              onClick={() => router.push('/student/homework')}
              className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-orange-100 hover:border-orange-300 group text-start ${mounted ? 'animate-slide-up stagger-1' : 'opacity-0'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.student.myHomework}</h3>
                  <p className="text-sm text-gray-600">{t.student.myHomeworkDesc}</p>
                </div>
                <svg className="w-6 h-6 text-orange-500 flex-shrink-0 ms-2 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* My Grades Card - Clickable */}
            <button
              onClick={() => router.push('/student/grades')}
              className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-blue-100 hover:border-blue-300 group text-start ${mounted ? 'animate-slide-up stagger-2' : 'opacity-0'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.student.myGrades}</h3>
                  <p className="text-sm text-gray-600">{t.student.myGradesDesc}</p>
                </div>
                <svg className="w-6 h-6 text-blue-500 flex-shrink-0 ms-2 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* My Points Card - Clickable */}
            <button
              onClick={() => router.push('/student/points')}
              className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-indigo-100 hover:border-indigo-300 group text-start ${mounted ? 'animate-slide-up stagger-3' : 'opacity-0'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.student.myPoints}</h3>
                  <p className="text-sm text-gray-600">{t.student.myPointsDesc}</p>
                </div>
                <svg className="w-6 h-6 text-indigo-500 flex-shrink-0 ms-2 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* My Installments Card - Clickable */}
            <button
              onClick={() => router.push('/student/installments')}
              className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-emerald-100 hover:border-emerald-300 group text-start ${mounted ? 'animate-slide-up stagger-4' : 'opacity-0'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.student.myInstallments || 'My Installments'}</h3>
                  <p className="text-sm text-gray-600 mb-2">{t.student.myInstallmentsDesc || 'View monthly payments and outstanding balance'}</p>
                  {outstanding && parseFloat(outstanding.totalOutstanding || '0') > 0 && (
                    <p className="text-sm font-semibold text-red-600">
                      {t.installments?.outstandingLabel || 'Outstanding'}: {parseFloat(outstanding.totalOutstanding || '0').toFixed(2)}
                    </p>
                  )}
                  {currentMonth && (
                    <p className="text-sm text-gray-500">
                      {t.installments?.currentLabel || 'Current'}: {parseFloat(currentMonth.installment?.totalAmount || '0').toFixed(2)}
                    </p>
                  )}
                </div>
                <svg className="w-6 h-6 text-emerald-500 flex-shrink-0 ms-2 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Announcements Card */}
            <div className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-pink-100 hover:border-pink-300 group ${mounted ? 'animate-slide-up stagger-5' : 'opacity-0'}`}>
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t.student.announcements}</h3>
              <p className="text-sm text-gray-600">{t.student.announcementsDesc}</p>
            </div>

            {/* Evaluations Card */}
            <div className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-green-100 hover:border-green-300 group ${mounted ? 'animate-slide-up stagger-6' : 'opacity-0'}`}>
              <div className="w-12 h-12 gradient-success rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t.student.evaluations}</h3>
              <p className="text-sm text-gray-600">{t.student.evaluationsDesc}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
