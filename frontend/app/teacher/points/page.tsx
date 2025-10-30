"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { TeacherStudentSummary } from '@/types';
import { getTeacherMyStudents, createPoint, getPointSummary } from '@/lib/api-client';
import { getStudentSubjects } from '@/lib/api-client';
import type { Subject } from '@/types';

export default function TeacherPointsPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [students, setStudents] = useState<TeacherStudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [query, setQuery] = useState<string>('');
  const [subjectsByStudent, setSubjectsByStudent] = useState<Record<string, Subject[]>>({});
  const [subjectForStudent, setSubjectForStudent] = useState<Record<string, string | undefined>>({});
  const [summary, setSummary] = useState<{ total: number; daily: number; bySubject: { subjectId: string | null; subjectName: string; total: number; daily: number }[] } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getTeacherMyStudents();
        if (mounted) setStudents(Array.isArray(list) ? list : (list?.data ?? []));
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      setSummary(null);
      return;
    }
    (async () => {
      try {
        const s = await getPointSummary(selectedStudentId);
        setSummary(s);
      } catch (e: any) {
        setSummary(null);
      }
    })();
  }, [selectedStudentId]);

  const handleAdjust = async (studentId: string, subjectId?: string) => {
    try {
      setError(null);
      await createPoint({ studentId, subjectId, amount: Number(amount) || 0 });
      // refresh summary
      const s = await getPointSummary(studentId);
      setSummary(s);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update points');
    }
  };

  const ensureStudentSubjects = async (studentId: string) => {
    if (subjectsByStudent[studentId]) return;
    try {
      const res = await getStudentSubjects(studentId);
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      const subjects: Subject[] = (list || [])
        .map((row: any) => row?.subject)
        .filter((s: any) => s && s.id && s.name);
      setSubjectsByStudent((m) => ({ ...m, [studentId]: subjects }));
    } catch {
      setSubjectsByStudent((m) => ({ ...m, [studentId]: [] }));
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
      <nav className="gradient-secondary shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1 gap-3">
              <button onClick={() => router.push('/teacher')} className="text-white hover:text-white/80 transition-colors flex-shrink-0" aria-label={t.teacher.backToDashboard}>
                <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">{t.teacher.grades || 'Points'}</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <SettingsMenu onLogout={() => { localStorage.clear(); router.push('/login'); }} />
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

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow p-4 sm:p-6 mb-6 border border-gray-100">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-gray-700 font-medium">Search students</Label>
              <Input placeholder="Type a name or email..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Student cards */}
        {students.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {students
              .filter((s) => {
                const hay = `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase();
                return hay.includes(query.toLowerCase());
              })
              .map((s, idx) => (
                <Card key={s.id} className={`p-5 bg-white rounded-2xl shadow-lg hover-lift border-2 border-gray-100 hover:border-teal-200 transition-colors ${idx < 6 ? `animate-slide-up stagger-${idx + 1}` : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {`${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-1">
                        <Label className="text-sm text-gray-500">Name</Label>
                        <div className="font-semibold text-gray-900 truncate">{s.firstName} {s.lastName}</div>
                      </div>
                      <div className="mt-2 flex flex-col gap-1">
                        <Label className="text-sm text-gray-500">Email</Label>
                        <div className="text-gray-700 break-all">{s.email || '-'}</div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                        <div className="sm:col-span-2">
                          <Label className="text-sm text-gray-700">Subject</Label>
                          <select
                            onFocus={() => ensureStudentSubjects(s.id)}
                            value={subjectForStudent[s.id] || ''}
                            onChange={(e) => setSubjectForStudent((m) => ({ ...m, [s.id]: e.target.value || undefined }))}
                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            <option value="">General</option>
                            {(subjectsByStudent[s.id] || []).map((sub) => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-sm text-gray-700">Amount (+/-)</Label>
                          <Input type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value, 10))} />
                        </div>
                        <div className="flex gap-2 sm:col-span-2 flex-wrap">
                          <Button
                            size="sm"
                            onClick={() => { setSelectedStudentId(s.id); ensureStudentSubjects(s.id); }}
                            className="bg-gray-600 hover:bg-gray-700 text-white"
                          >
                            View summary
                          </Button>
                          <Button
                            size="sm"
                            className="gradient-secondary text-white"
                            onClick={() => handleAdjust(s.id, subjectForStudent[s.id])}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}

        {/* When no students found */}
        {students.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg mb-6">
            <h3 className="mt-2 text-lg font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">Assign classes/subjects to see students here.</p>
            <div className="mt-4">
              <Button onClick={() => router.push('/teacher/students')}>View My Students</Button>
            </div>
          </div>
        )}

        {/* Summary */}
        {summary ? (
          <div className="grid grid-cols-1 gap-4">
            <Card className="p-5">
              <div className="flex flex-wrap gap-6">
                <div>
                  <Label className="text-sm text-gray-500">Daily</Label>
                  <div className="text-2xl font-bold text-gray-900">{summary.daily}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Total</Label>
                  <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
                </div>
              </div>
              {summary.bySubject?.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {summary.bySubject.map((b, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-gray-50">
                      <div className="font-semibold text-gray-800 mb-1">{b.subjectName}</div>
                      <div className="text-sm text-gray-600">Daily: {b.daily}</div>
                      <div className="text-sm text-gray-600">Total: {b.total}</div>
                      {selectedStudentId && (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => handleAdjust(selectedStudentId, b.subjectId || undefined)}>Apply here</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="text-gray-600 text-center py-8">Select a student to view points.</div>
        )}
      </main>
    </div>
  );
}
