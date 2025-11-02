'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SettingsMenu from '@/components/SettingsMenu';
import { getMyPointSummary } from '@/lib/api-client';
import { Card } from '@/components/ui/card';

interface User {
  name: string;
  role: string;
}

interface PointSummary {
  total: number;
  daily: number;
  bySubject: {
    subjectId: string | null;
    subjectName: string;
    total: number;
    daily: number;
  }[];
}

export default function StudentPointsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<PointSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

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
    fetchPointsSummary();
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchPointsSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyPointSummary();
      // Handle both direct response and wrapped response
      const pointSummary = Array.isArray(data) 
        ? { total: 0, daily: 0, bySubject: [] }
        : (data?.data || data || { total: 0, daily: 0, bySubject: [] });
      
      setSummary({
        total: pointSummary.total || 0,
        daily: pointSummary.daily || 0,
        bySubject: pointSummary.bySubject || []
      });
    } catch (err: any) {
      if (err?.response?.status === 401) {
        localStorage.clear();
        router.push('/login');
        return;
      }
      setError(err?.response?.data?.message || 'Failed to load points summary');
      setSummary({ total: 0, daily: 0, bySubject: [] });
    } finally {
      setLoading(false);
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
    <div className="min-h-screen gradient-bg pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl relative">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 relative z-10">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-1 sm:mb-2 tracking-tight truncate">
                {t.points.titleStudent}
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm lg:text-base leading-tight">
                {t.points.viewPointsBySubject}
              </p>
            </div>
            <div className="flex-shrink-0">
              <SettingsMenu onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Total Points Card */}
              <Card className={`p-6 bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg hover-lift ${mounted ? 'animate-slide-up stagger-1' : 'opacity-0'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">{t.points.totalPoints}</p>
                    <p className="text-4xl sm:text-5xl font-bold">{summary?.total || 0}</p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                </div>
              </Card>

              {/* Daily Points Card */}
              <Card className={`p-6 bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg hover-lift ${mounted ? 'animate-slide-up stagger-2' : 'opacity-0'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium mb-1">{t.points.todayPoints}</p>
                    <p className="text-4xl sm:text-5xl font-bold">{summary?.daily || 0}</p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>

            {/* Points by Subject */}
            {summary && summary.bySubject.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                  {t.points.pointsBySubject}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {summary.bySubject.map((subject, idx) => (
                    <Card 
                      key={subject.subjectId || 'general'} 
                      className={`p-6 bg-white shadow-md hover:shadow-lg transition-all duration-300 border-2 border-gray-100 hover:border-blue-200 ${mounted ? `animate-slide-up stagger-${idx + 3}` : 'opacity-0'}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                            {subject.subjectName}
                          </h3>
                          <p className="text-xs text-gray-500">Subject Points</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">{t.points.today}</span>
                          </div>
                          <span className="text-lg font-bold text-blue-600">{subject.daily || 0}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">{t.points.total}</span>
                          </div>
                          <span className="text-lg font-bold text-gray-900">{subject.total || 0}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">{t.points.noPointsYet}</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {t.points.noPointsDesc}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

