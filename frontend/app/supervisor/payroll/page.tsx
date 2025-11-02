'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import apiClient from '@/lib/api-client';
import { Teacher, MonthlyPayrollRecord } from '@/types';

interface TeacherWithSalary extends Teacher {
  currentSalary: {
    id: string;
    monthlySalary?: number | string;
    hourlyWage?: number | string;
    effectiveFrom: string;
  } | null;
}

export default function SupervisorPayrollPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [teachers, setTeachers] = useState<TeacherWithSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherWithSalary | null>(null);
  const [payrollRecords, setPayrollRecords] = useState<MonthlyPayrollRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchTeachers();
  }, [router]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/payroll/salaries', {
        params: searchTerm ? { search: searchTerm } : {},
      });
      setTeachers((response as any) || []);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm !== undefined) {
      fetchTeachers();
    }
  }, [searchTerm]);

  const handleViewRecords = async (teacher: TeacherWithSalary) => {
    setSelectedTeacher(teacher);
    setShowRecordsModal(true);
    setLoadingRecords(true);

    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const records: MonthlyPayrollRecord[] = [];

      // Try current year and previous year
      for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
        const targetYear = currentYear - yearOffset;
        for (let month = 1; month <= 12; month++) {
          try {
            const response = await apiClient.get(`/payroll/records/${teacher.id}/${month}/${targetYear}`);
            records.push(response as MonthlyPayrollRecord);
          } catch {
            // Record doesn't exist for this month
          }
        }
      }

      setPayrollRecords(records.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      }));
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const filteredTeachers = teachers.filter(teacher =>
    `${teacher.user.firstName} ${teacher.user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen gradient-bg">
      <nav className="gradient-primary shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/supervisor')}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-white">Payroll Overview</h1>
            </div>
            <SettingsMenu onLogout={() => router.push('/login')} />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search teachers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Teachers List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {teacher.user.firstName} {teacher.user.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{teacher.user.email}</p>
                  </div>
                  <button
                    onClick={() => handleViewRecords(teacher)}
                    className="text-indigo-600 hover:text-indigo-800"
                    title="View Records"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Monthly Salary:</span>
                    <span className="text-sm font-medium">
                      {teacher.currentSalary?.monthlySalary
                        ? `${Number(teacher.currentSalary.monthlySalary).toFixed(2)} SYP`
                        : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Hourly Wage:</span>
                    <span className="text-sm font-medium">
                      {teacher.currentSalary?.hourlyWage
                        ? `${Number(teacher.currentSalary.hourlyWage).toFixed(2)} SYP/hr`
                        : 'Not set'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredTeachers.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-600">
            No teachers found
          </div>
        )}
      </main>

      {/* Records Modal */}
      {showRecordsModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Payroll Records - {selectedTeacher.user.firstName} {selectedTeacher.user.lastName}
                </h3>
                <button
                  onClick={() => setShowRecordsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingRecords ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-4">
                  {payrollRecords.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No payroll records found</p>
                  ) : (
                    payrollRecords.map((record) => (
                      <div
                        key={record.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">
                            {monthNames[record.month - 1]} {record.year}
                          </h4>
                          <span className="text-lg font-bold text-indigo-600">
                            {Number(record.totalEntitlement).toFixed(2)} SYP
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Monthly:</span> {Number(record.monthlySalary).toFixed(2)} SYP
                          </div>
                          <div>
                            <span className="font-medium">Hours:</span> {Number(record.totalHours).toFixed(2)}h
                          </div>
                          <div>
                            <span className="font-medium">Hourly:</span> {Number(record.hourlyWage).toFixed(2)} SYP/hr
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

