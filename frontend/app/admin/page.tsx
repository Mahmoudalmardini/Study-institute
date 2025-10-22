'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AdminDashboard() {
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    // TODO: Fetch user data from API
    setUser({ name: 'Administrator', role: 'ADMIN' });
    setMounted(true);
  }, [router]);

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
      <nav className="gradient-primary shadow-lg sticky top-0 z-40">
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
                {t.admin.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <span className="hidden md:inline text-sm text-white/90 font-medium">
                {t.admin.welcome}, {user.name}
              </span>
              <SettingsMenu onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className={`mb-8 p-6 sm:p-8 bg-white rounded-2xl shadow-lg border-l-4 border-indigo-600 ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 gradient-secondary rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t.admin.welcomeBack}, {user.name}! 👋
              </h2>
              <p className="text-gray-600 text-base sm:text-lg">
                {t.admin.dashboardGreeting}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Users Card - Clickable */}
            <button
              onClick={() => router.push('/admin/users')}
              className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-indigo-100 hover:border-indigo-300 text-start group ${mounted ? 'animate-slide-up stagger-1' : 'opacity-0'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.admin.users}</h3>
                  <p className="text-sm text-gray-600">{t.admin.usersDesc}</p>
                </div>
                <svg className="w-6 h-6 text-indigo-500 flex-shrink-0 ms-2 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Students Card - Clickable */}
            <button
              onClick={() => router.push('/admin/students')}
              className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-emerald-100 hover:border-emerald-300 text-start group ${mounted ? 'animate-slide-up stagger-2' : 'opacity-0'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="w-12 h-12 gradient-success rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.admin.students}</h3>
                  <p className="text-sm text-gray-600">{t.admin.studentsDesc}</p>
                </div>
                <svg className="w-6 h-6 text-emerald-500 flex-shrink-0 ms-2 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Teachers Card - Clickable */}
            <button
              onClick={() => router.push('/admin/teachers')}
              className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-purple-100 hover:border-purple-300 text-start group ${mounted ? 'animate-slide-up stagger-3' : 'opacity-0'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.admin.teachers}</h3>
                  <p className="text-sm text-gray-600">{t.admin.teachersDesc}</p>
                </div>
                <svg className="w-6 h-6 text-purple-500 flex-shrink-0 ms-2 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Subjects Card - Clickable */}
            <button
              onClick={() => router.push('/admin/subjects')}
              className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-teal-100 hover:border-teal-300 text-start group ${mounted ? 'animate-slide-up stagger-4' : 'opacity-0'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Subjects</h3>
                  <p className="text-sm text-gray-600">Manage subjects & curriculum</p>
                </div>
                <svg className="w-6 h-6 text-teal-500 flex-shrink-0 ms-2 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Classes Card - Clickable */}
            <button
              onClick={() => router.push('/admin/classes')}
              className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-cyan-100 hover:border-cyan-300 text-start group ${mounted ? 'animate-slide-up stagger-4' : 'opacity-0'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                      <path d="M3.5 9.289l6.106 2.617a1 1 0 00.788 0L16.5 9.29V13.5a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 013.5 13.5V9.289z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.admin.classes}</h3>
                  <p className="text-sm text-gray-600">{t.admin.classesDesc}</p>
                </div>
                <svg className="w-6 h-6 text-cyan-500 flex-shrink-0 ms-2 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>


            {/* Homework Card - Clickable */}
            <button
              onClick={() => router.push('/admin/homework')}
              className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-orange-100 hover:border-orange-300 text-start group ${mounted ? 'animate-slide-up stagger-5' : 'opacity-0'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Review Homework</h3>
                  <p className="text-sm text-gray-600">Review and approve teacher evaluations</p>
                </div>
                <svg className="w-6 h-6 text-orange-500 flex-shrink-0 ms-2 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Grades Card */}
            <div className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-blue-100 hover:border-blue-300 group ${mounted ? 'animate-slide-up stagger-6' : 'opacity-0'}`}>
              <div className="w-12 h-12 gradient-secondary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t.admin.grades}</h3>
              <p className="text-sm text-gray-600">{t.admin.gradesDesc}</p>
            </div>

            {/* Announcements Card */}
            <div className={`bg-white overflow-hidden rounded-xl hover-lift p-6 sm:p-7 border-2 border-red-100 hover:border-red-300 group ${mounted ? 'animate-slide-up stagger-7' : 'opacity-0'}`}>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t.admin.announcements}</h3>
              <p className="text-sm text-gray-600">{t.admin.announcementsDesc}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

