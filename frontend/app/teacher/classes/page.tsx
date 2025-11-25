"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { getTeacherProfile } from '@/lib/api-client';

interface TeacherProfile {
  id: string;
  subjects: Array<{
    subject: {
      id: string;
      name: string;
      class: {
        id: string;
        name: string;
        grade: string;
      };
    };
  }>;
}

export default function TeacherClassesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await getTeacherProfile();
        if (isMounted) setProfile(data as any);
      } catch (e: any) {
        if (isMounted) setError(e?.response?.data?.message || 'Failed to load classes');
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

  // Group subjects by class
  const classesMap = new Map<string, { id: string; name: string; grade: string; subjects: string[] }>();
  
  if (profile?.subjects) {
    profile.subjects.forEach((item) => {
      const classId = item.subject.class.id;
      if (!classesMap.has(classId)) {
        classesMap.set(classId, {
          id: classId,
          name: item.subject.class.name,
          grade: item.subject.class.grade,
          subjects: []
        });
      }
      classesMap.get(classId)?.subjects.push(item.subject.name);
    });
  }

  const classes = Array.from(classesMap.values());

  return (
    <div className="min-h-screen gradient-bg">
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
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">{t.teacher.myClasses}</h1>
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

        {classes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <svg className="mx-auto h-20 w-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No classes assigned</h3>
            <p className="mt-2 text-sm text-gray-500">You haven't been assigned to any classes yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {classes.map((cls) => (
              <Card key={cls.id} className="p-5 bg-white rounded-xl shadow-lg hover-lift border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{cls.name}</h3>
                    <div className="mt-1 text-sm text-gray-500">Grade: {cls.grade}</div>
                    
                    <div className="mt-4">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subjects Taught</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {cls.subjects.map((subject, idx) => (
                          <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>
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
