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
import apiClient from '@/lib/api-client';
import { createPoint, getPointSummary, getBatchPointSummaries, getStudentSubjects } from '@/lib/api-client';

interface SubjectOption {
  id: string;
  name: string;
  code?: string;
  teacherName?: string;
  teacherEmail?: string;
}

interface StudentSubjectRelation {
  subject?: {
    id: string;
    name: string;
    code?: string;
  };
  teacher?: {
    id: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  } | null;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  subjects?: StudentSubjectRelation[];
}

export default function AdminPointsPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [query, setQuery] = useState<string>('');
  const [subjectsByStudent, setSubjectsByStudent] = useState<Record<string, SubjectOption[]>>({});
  const [subjectForStudent, setSubjectForStudent] = useState<Record<string, string | undefined>>({});
  const [summary, setSummary] = useState<{ total: number; daily: number; bySubject: { subjectId: string | null; subjectName: string; total: number; daily: number }[] } | null>(null);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [studentSummaries, setStudentSummaries] = useState<Record<string, { total: number; daily: number; bySubject: { subjectId: string | null; subjectName: string; total: number; daily: number }[] }>>({});

  const mapSubjectsToOptions = (entries: any[]): SubjectOption[] => {
    return (entries || [])
      .map((row) => {
        const subject = row?.subject;
        if (!subject?.id || !subject?.name) return null;
        const teacherUser = row?.teacher?.user;
        const teacherName = `${teacherUser?.firstName || ''} ${teacherUser?.lastName || ''}`.trim();
        return {
          id: subject.id,
          name: subject.name,
          code: subject.code,
          teacherName: teacherName || undefined,
          teacherEmail: teacherUser?.email,
        };
      })
      .filter((entry): entry is SubjectOption => Boolean(entry));
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await apiClient.get('/students', {
          params: {
            assignedSubjectsOnly: true,
            includeSubjects: true,
          },
        });
        const studentsList = Array.isArray(list) ? list : (list?.data ?? []);
        // Map student data to match expected format
        const mappedStudents = studentsList.map((s: any) => ({
          id: s.id,
          firstName: s.user?.firstName || '',
          lastName: s.user?.lastName || '',
          email: s.user?.email || '',
          user: s.user,
          subjects: s.subjects || []
        }));
        if (mounted) {
          setStudents(mappedStudents);
          const initialSubjects: Record<string, SubjectOption[]> = {};
          mappedStudents.forEach((student) => {
            const subjectOptions = mapSubjectsToOptions(student.subjects || []);
            if (subjectOptions.length > 0) {
              initialSubjects[student.id] = subjectOptions;
            }
          });
          setSubjectsByStudent(initialSubjects);
        }
        
        // Load summaries for all students using batch endpoint
        if (mounted && mappedStudents.length > 0) {
          try {
            const studentIds = mappedStudents.map(s => s.id);
            const batchSummaries = await getBatchPointSummaries(studentIds) as any;
            if (mounted && batchSummaries) {
              // Ensure all students have a summary entry (default to empty if missing)
              const summaries: Record<string, { total: number; daily: number; bySubject: { subjectId: string | null; subjectName: string; total: number; daily: number }[] }> = {};
              mappedStudents.forEach(student => {
                summaries[student.id] = batchSummaries[student.id] || { total: 0, daily: 0, bySubject: [] };
              });
              setStudentSummaries(summaries);
            }
          } catch (err: any) {
            console.error('Failed to load batch summaries:', err);
            // Fallback: set empty summaries for all students
            const summaries: Record<string, { total: number; daily: number; bySubject: { subjectId: string | null; subjectName: string; total: number; daily: number }[] }> = {};
            mappedStudents.forEach(student => {
              summaries[student.id] = { total: 0, daily: 0, bySubject: [] };
            });
            if (mounted) setStudentSummaries(summaries);
          }
        }
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

  const setStudentProcessingState = (studentId: string, value: boolean) => {
    setProcessing((prev) => ({ ...prev, [studentId]: value }));
  };

  const resetStudentForm = (studentId: string) => {
    setSubjectForStudent((prev) => ({ ...prev, [studentId]: undefined }));
    setAmount(0);
    setSelectedStudentId(null);
  };

  const applyPointDelta = (studentId: string, subjectId: string, delta: number) => {
    setStudentSummaries(prev => {
      const current = prev[studentId] || { total: 0, daily: 0, bySubject: [] };
      const subjectIndex = current.bySubject.findIndex(s => s.subjectId === subjectId);
      const newBySubject = [...current.bySubject];

      if (subjectIndex >= 0) {
        newBySubject[subjectIndex] = {
          ...newBySubject[subjectIndex],
          daily: (newBySubject[subjectIndex].daily || 0) + delta,
          total: (newBySubject[subjectIndex].total || 0) + delta,
        };
      } else if (delta > 0) {
        newBySubject.push({
          subjectId,
          subjectName: (subjectsByStudent[studentId] || []).find(s => s.id === subjectId)?.name || 'Unknown',
          daily: delta,
          total: delta,
        });
      }

      const normalizedBySubject = newBySubject.map((entry) => ({
        ...entry,
        daily: entry.daily < 0 ? 0 : entry.daily,
        total: entry.total < 0 ? 0 : entry.total,
      }));

      return {
        ...prev,
        [studentId]: {
          total: Math.max(0, (current.total || 0) + delta),
          daily: Math.max(0, (current.daily || 0) + delta),
          bySubject: normalizedBySubject,
        },
      };
    });

    if (selectedStudentId === studentId) {
      setSummary(prev => {
        if (!prev) return prev;
        const subjectIndex = prev.bySubject.findIndex(s => s.subjectId === subjectId);
        const newBySubject = [...prev.bySubject];

        if (subjectIndex >= 0) {
          newBySubject[subjectIndex] = {
            ...newBySubject[subjectIndex],
            daily: (newBySubject[subjectIndex].daily || 0) + delta,
            total: (newBySubject[subjectIndex].total || 0) + delta,
          };
        } else if (delta > 0) {
          newBySubject.push({
            subjectId,
            subjectName: (subjectsByStudent[studentId] || []).find(s => s.id === subjectId)?.name || 'Unknown',
            daily: delta,
            total: delta,
          });
        }

        return {
          ...prev,
          total: Math.max(0, (prev.total || 0) + delta),
          daily: Math.max(0, (prev.daily || 0) + delta),
          bySubject: newBySubject.map((entry) => ({
            ...entry,
            daily: entry.daily < 0 ? 0 : entry.daily,
            total: entry.total < 0 ? 0 : entry.total,
          })),
        };
      });
    }
  };

  const refreshStudentSummary = async (studentId: string) => {
    try {
      const updatedSummary = await getPointSummary(studentId) as any;
      if (updatedSummary) {
        setStudentSummaries(prev => ({
          ...prev,
          [studentId]: {
            total: updatedSummary.total || 0,
            daily: updatedSummary.daily || 0,
            bySubject: updatedSummary.bySubject || [],
          },
        }));

        if (selectedStudentId === studentId) {
          setSummary(updatedSummary);
        }
      }
    } catch {
      // ignore refresh errors
    }
  };

  const handleAddPoints = async (studentId: string, subjectId: string) => {
    if (processing[studentId]) return;
    if (!subjectId) {
      setError(t.points.selectSubject);
      return;
    }
    if (amount <= 0) {
      setError('Amount must be greater than 0 to add points');
      return;
    }
    
    const pointAmount = Math.abs(Number(amount));
    setStudentProcessingState(studentId, true);
    setError(null);
    applyPointDelta(studentId, subjectId, pointAmount);

    try {
      await createPoint({ studentId, subjectId, amount: pointAmount });
      await refreshStudentSummary(studentId);
    } catch (err: any) {
      if (err?.response?.status !== 429) {
        setError(err?.response?.data?.message || 'Failed to add points');
      }
      await refreshStudentSummary(studentId);
    } finally {
      resetStudentForm(studentId);
      setStudentProcessingState(studentId, false);
    }
  };

  const handleDeletePoints = async (studentId: string, subjectId: string) => {
    if (processing[studentId]) return;
    if (!subjectId) {
      setError(t.points.selectSubject);
      return;
    }
    if (amount <= 0) {
      setError('Amount must be greater than 0 to remove points');
      return;
    }
    
    const pointAmount = Math.abs(Number(amount));
    setStudentProcessingState(studentId, true);
    setError(null);
    applyPointDelta(studentId, subjectId, -pointAmount);

    try {
      await createPoint({ studentId, subjectId, amount: -pointAmount });
      await refreshStudentSummary(studentId);
    } catch (err: any) {
      if (err?.response?.status !== 429) {
        setError(err?.response?.data?.message || 'Failed to remove points');
      }
      await refreshStudentSummary(studentId);
    } finally {
      resetStudentForm(studentId);
      setStudentProcessingState(studentId, false);
    }
  };

  const ensureStudentSubjects = async (studentId: string) => {
    if (subjectsByStudent[studentId]) return;
    try {
      const res = await getStudentSubjects(studentId);
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      const subjects = mapSubjectsToOptions(list || []);
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
      <nav className="gradient-primary shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1 gap-3">
              <button onClick={() => router.push('/admin')} className="text-white hover:text-white/80 transition-colors flex-shrink-0" aria-label="Back to dashboard">
                <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">{t.points.title}</h1>
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
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <Label className="text-gray-700 font-semibold mb-2 block">{t.points.searchStudents}</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <Input 
                  placeholder={t.points.searchPlaceholder} 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {query && (
                <p className="mt-2 text-sm text-gray-500">
                  {(() => {
                    const filteredCount = students.filter((s) => {
                      const hay = `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase();
                      return hay.includes(query.toLowerCase());
                    }).length;
                    return `${filteredCount} student${filteredCount !== 1 ? 's' : ''} found`;
                  })()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Student cards */}
        {(() => {
          const filteredStudents = students.filter((s) => {
            const hay = `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase();
            return hay.includes(query.toLowerCase());
          });
          
          if (filteredStudents.length === 0 && students.length > 0) {
            return (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg mb-6">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">{t.points.studentNotFound}</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {t.points.noStudentsMatch} "{query}"
                </p>
                <div className="mt-4">
                  <Button onClick={() => setQuery('')} variant="outline">
                    {t.points.clearSearch}
                  </Button>
                </div>
              </div>
            );
          }
          
          if (filteredStudents.length > 0) {
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                {filteredStudents.map((s, idx) => {
                  const subjectOptions = subjectsByStudent[s.id] || [];
                  const selectedSubjectOption = subjectOptions.find(sub => sub.id === subjectForStudent[s.id]);
                  const isProcessing = !!processing[s.id];
                  const disableActions = isProcessing || !subjectForStudent[s.id] || amount <= 0;
                  return (
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
                      <div className="mt-3">
                        <Label className="text-xs text-gray-500 mb-2 block">Points by Subject</Label>
                        {studentSummaries[s.id]?.bySubject && studentSummaries[s.id].bySubject.length > 0 ? (
                          <div className="space-y-2">
                            {studentSummaries[s.id].bySubject.slice(0, 3).map((subj, idx) => (
                              <div key={idx} className="text-xs bg-gray-50 px-2 py-1 rounded">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-700 font-medium truncate flex-1">{subj.subjectName}</span>
                                  <span className="text-teal-600 font-semibold ml-2">{subj.daily}d</span>
                                  <span className="text-blue-600 font-semibold ml-2">{subj.total}t</span>
                                </div>
                                {subj.subjectId && (() => {
                                  const teacherDetails = subjectOptions.find(opt => opt.id === subj.subjectId);
                                  if (!teacherDetails?.teacherName) return null;
                                  return (
                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                      Teacher: {teacherDetails.teacherName}
                                    </div>
                                  );
                                })()}
                              </div>
                            ))}
                            {studentSummaries[s.id].bySubject.length > 3 && (
                              <div className="text-xs text-gray-500 text-center pt-1">
                                +{studentSummaries[s.id].bySubject.length - 3} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic py-2">No points yet</div>
                        )}
                        <div className="mt-2 pt-2 border-t flex gap-4">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500">Daily Total</Label>
                            <div className="text-sm font-bold text-teal-600">
                              {studentSummaries[s.id]?.daily ?? 0}
                            </div>
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500">Total Points</Label>
                            <div className="text-sm font-bold text-blue-600">
                              {studentSummaries[s.id]?.total ?? 0}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div>
                          <Label className="text-sm text-gray-700">Subject *</Label>
                          <select
                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            onFocus={() => {
                              ensureStudentSubjects(s.id);
                              setSelectedStudentId(s.id);
                            }}
                            value={subjectForStudent[s.id] || ''}
                            onChange={(e) => {
                              const value = e.target.value || undefined;
                              setSubjectForStudent((m) => ({ ...m, [s.id]: value }));
                              if (value) {
                                setSelectedStudentId(s.id);
                              }
                            }}
                            required
                          >
                            <option value="">{t.points.selectSubject}</option>
                            {(subjectsByStudent[s.id] || []).map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name}{sub.teacherName ? ` — ${sub.teacherName}` : ''}
                              </option>
                            ))}
                          </select>
                          {!subjectForStudent[s.id] && (subjectsByStudent[s.id] || []).length === 0 && (
                            <p className="text-xs text-gray-500 mt-1">{t.points.loadSubjects}</p>
                          )}
                          {subjectForStudent[s.id] && selectedSubjectOption?.teacherName && (
                            <p className="text-xs text-gray-500 mt-2">
                              Teacher: {selectedSubjectOption.teacherName}
                              {selectedSubjectOption.teacherEmail ? ` (${selectedSubjectOption.teacherEmail})` : ''}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-700">{t.points.amount} *</Label>
                          <Input 
                            type="number" 
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={amount > 0 ? amount.toString() : ''} 
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              if (inputValue === '') {
                                setAmount(0);
                                return;
                              }
                              const val = parseInt(inputValue, 10);
                              if (!isNaN(val) && val > 0) {
                                setAmount(val);
                              }
                            }}
                            onKeyDown={(e) => {
                              // Allow typing numbers (including numpad), backspace, delete, arrow keys, tab
                              const isNumber = /^[0-9]$/.test(e.key);
                              const isNumpad = /^Numpad[0-9]$/.test(e.key);
                              const isAllowedKey = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'].includes(e.key);
                              const isCopyPaste = (e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase());
                              
                              if (!isNumber && !isNumpad && !isAllowedKey && !isCopyPaste) {
                                e.preventDefault();
                              }
                            }}
                            placeholder={t.points.amountPlaceholder}
                            className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                            onClick={() => handleAddPoints(s.id, subjectForStudent[s.id] || '')}
                            disabled={disableActions}
                          >
                            {t.points.addPoints}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none"
                            onClick={() => handleDeletePoints(s.id, subjectForStudent[s.id] || '')}
                            disabled={disableActions}
                          >
                            {t.points.deletePoints}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                  );
                })}
              </div>
            );
          }
          
          // Original empty state (no students at all)
          return null;
        })()}

        {/* When no students found */}
        {students.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg mb-6">
            <h3 className="mt-2 text-lg font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">No students are registered in the system.</p>
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
                      {selectedStudentId && b.subjectId && (() => {
                        const teacherDetails = (subjectsByStudent[selectedStudentId] || []).find(opt => opt.id === b.subjectId);
                        if (!teacherDetails?.teacherName) return null;
                        return (
                          <div className="text-xs text-gray-500 mt-1">
                            Teacher: {teacherDetails.teacherName}
                          </div>
                        );
                      })()}
                      {selectedStudentId && b.subjectId && (
                        <div className="mt-2 flex gap-2">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleAddPoints(selectedStudentId, b.subjectId!)}
                            disabled={!selectedStudentId || processing[selectedStudentId] || amount <= 0}
                          >
                            Add {amount} pts
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => handleDeletePoints(selectedStudentId, b.subjectId!)}
                            disabled={!selectedStudentId || processing[selectedStudentId] || amount <= 0}
                          >
                            Remove {amount} pts
                          </Button>
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

