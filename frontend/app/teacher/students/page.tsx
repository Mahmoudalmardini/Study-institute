"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { TeacherStudentSummary } from '@/types';
import { getTeacherMyStudents } from '@/lib/api-client';

export default function TeacherStudentsPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [students, setStudents] = useState<TeacherStudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await getTeacherMyStudents();
        if (isMounted) setStudents(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (isMounted) setError(e?.response?.data?.message || 'Failed to load students');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

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
      <nav className="gradient-secondary shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1 gap-3">
              <button
                onClick={() => router.push('/teacher')}
                className="text-white hover:text-white/80 transition-colors flex-shrink-0"
                aria-label={t.teacher.backToDashboard}
              >
                <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">{t.teacher.students}</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <SettingsMenu onLogout={() => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                router.push('/login');
              }} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2 rtl:mr-0 rtl:ml-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {students.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <svg className="mx-auto h-20 w-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 7a3 3 0 11-6 0 3 3 0 016 0zM23 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">{t.teacher.noStudents || 'No students found'}</h3>
            <p className="mt-2 text-sm text-gray-500">{t.teacher.noStudentsDesc || 'Students will appear when you are assigned to a class or subject.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {students.map((s, idx) => (
              <Card key={s.id} className={`p-5 bg-white rounded-xl shadow-lg hover-lift border border-gray-100 ${idx < 6 ? `animate-slide-up stagger-${idx + 1}` : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                    {`${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1">
                      <Label className="text-sm text-gray-500">{t.teacher.name}</Label>
                      <div className="font-semibold text-gray-900 truncate">{s.firstName} {s.lastName}</div>
                    </div>
                    {s.subjects && s.subjects.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1">
                        <Label className="text-sm text-gray-500">{t.teacher.subjects}</Label>
                        <div className="flex flex-wrap gap-2">
                          {s.subjects.map((sub, i) => (
                            <span key={i} className="px-2 py-1 rounded-full bg-teal-50 text-teal-700 text-xs border border-teal-100">
                              {sub.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {s.classNames?.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1">
                        <Label className="text-sm text-gray-500">{t.teacher.classes}</Label>
                        <div className="flex flex-wrap gap-2">
                          {s.classNames.map((cn, i) => (
                            <span key={i} className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs border">
                              {cn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


