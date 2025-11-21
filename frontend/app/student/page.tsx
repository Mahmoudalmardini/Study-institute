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
  const [showTermsModal, setShowTermsModal] = useState(false);

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

            {/* Institute Terms and Conditions Card - Clickable */}
            <button
              onClick={() => setShowTermsModal(true)}
              className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-violet-100 hover:border-violet-300 group text-start ${mounted ? 'animate-slide-up stagger-5' : 'opacity-0'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.student.instituteTerms}</h3>
                  <p className="text-sm text-gray-600">{t.student.instituteTermsDesc}</p>
                </div>
                <svg className="w-6 h-6 text-violet-500 flex-shrink-0 ms-2 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden"
          onClick={() => setShowTermsModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">{t.student.instituteTerms}</h2>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1" dir="rtl">
              <div className="prose prose-lg max-w-none text-gray-800 whitespace-pre-line leading-relaxed">
                <p className="text-2xl font-bold mb-6 text-center">مركز المتابعة الدراسية نحو ارتقاء علمي وأخلاقي.</p>
                
                <p className="text-xl mb-4 text-center">أهلاً ومرحباً بكم</p>
                <p className="text-xl mb-6 text-center">في مركز المتابعة الدراسية.</p>

                <p className="text-lg mb-6">ابنك في مركز المتابعة الدراسية</p>
                <p className="text-lg mb-8">أكثر تميزاً وتفوقاً سنصعد على سلم التفوق لنكون رفقاء الدرب.</p>

                <h3 className="text-xl font-bold mb-4">قوانين المركز:</h3>

                <h4 className="text-lg font-semibold mb-3">قوانين تتعلق بمصلحة الابن:</h4>

                <ol className="list-decimal list-inside space-y-3 mb-6">
                  <li>عندما تجد في ابنك الرغبة في الاجتهاد سجله في مركز المتابعة الدراسية، في حال لم تجد الرغبة لا تنفق نقودك.
                    <ul className="list-disc list-inside mr-6 mt-2 space-y-1">
                      <li>الرغبة تعطي النجاح</li>
                      <li>عدم الرغبة يقود إلى الفشل.</li>
                    </ul>
                  </li>
                  <li>التغييب عن الحصص الدراسية أو التأخر 👈 معلومات اقل 👈 انخفاض نتيجته الدراسية.</li>
                  <li>التجمع أمام المركز 👈 قلق راحة الجوار 👈 تجاوز القانون</li>
                  <li>الاحترام للمعلمين والمعلمات خط أحمر، تجاوزه يُؤدي إلى توجيه تنبيه مرة واحدة فقط ثم الفصل النهائي من المركز.</li>
                  <li>العبث بمقتنيات المعهد 👈 غرامة مالية تُدفع من قبل الطالب.</li>
                </ol>

                <h4 className="text-lg font-semibold mb-3">قوانين متعلقة بدفع الأقساط:</h4>

                <ol className="list-decimal list-inside space-y-3 mb-6">
                  <li>حسم 10% في حال تم الدفع عن السنة كاملة، ولا يُعاد أي مبلغ مالي في حال انقطاع الطالب لأي سبب كان.</li>
                  <li>حسم للأخين بمقدار 5% ولثلاثة أخوة بمقدار 10%.</li>
                  <li>في حال انقطع الطالب ولم يعد أو انقطع وعاد خلال الشهر، لا يُعاد أي مبلغ مالي ويجب دفع القسط كاملاً.</li>
                  <li>تسديد القسط كاملاً بموعد أقصاه الرابع من الشهر، في حال التأخر في الدفع لبعد 10 الشهر هناك ضريبة وقدرها 7 آلاف ليرة سورية عن كل يوم تأخير.</li>
                  <li>يعطل المعهد في العطل الرسمية والعطل الانتصافية ويدفع القسط كاملاً في أشهر العطل.</li>
                  <li>يُحدد المركز عطلة بعد المذاكرات لتجديد نشاط الطالب.</li>
                  <li>في حال انتهى الطالب دروسه قبل انتهاء الحصة يحق للمركز إخراجه.</li>
                  <li>احتمال تعديل الأقساط وزيادتها في حال ارتفع الدولار بشكل يؤثر على اقتصادية مركز المتابعة الدراسية.</li>
                </ol>

                <h4 className="text-lg font-semibold mb-3">قوانين متعلقة بالمواصلات:</h4>

                <ol className="list-decimal list-inside space-y-3">
                  <li>احترام السائق واي تجاوز يعرض الطالب للعقوبة.</li>
                  <li>وقت المذاكرة ممكن أن يُحدد المركز مواعيد تختلف عن مواعيد الباص فيضطر الطالب في هذه الفترة المجيء لوحده.</li>
                  <li>حصص المراجعة للمذاكرة أو الامتحان أيضاً يمكن أن تُحدد لمواعيد تختلف عن موعد الباص، ممكن أن يضطر الطالب للقدوم والرجوع لوحده في هذه الفترة.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
