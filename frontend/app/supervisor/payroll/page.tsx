'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';

export default function SupervisorPayrollPage() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    // Redirect supervisors back to their dashboard since payroll is not available
    router.replace('/supervisor');
  }, [router]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M4.93 4.93l14.14 14.14M9.17 9.17c-.76.76-1.17 1.76-1.17 2.83 0 2.21 1.79 4 4 4 .99 0 1.9-.37 2.6-.98" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t.supervisor.cards?.payroll?.title || 'Payroll Management'}
        </h1>
        <p className="text-gray-600 mb-6">
          {t.supervisor.messages?.restrictedFeature ||
            'Payroll management is not available for the supervisor role. Please contact an administrator if you believe this is a mistake.'}
        </p>
        <button
          onClick={() => router.push('/supervisor')}
          className="gradient-secondary text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          {t.common?.back || 'Back to Dashboard'}
        </button>
      </div>
    </div>
  );
}

