'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n-context';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        (typeof window !== 'undefined'
          ? `${window.location.origin}/api`
          : 'http://localhost:3001/api');

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.username,
          password: formData.password,
        }),
      });

      // Safely parse JSON, but fall back to plain text for non-JSON errors
      const rawText = await response.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        // Ignore JSON parse error; we'll use rawText below
      }

      if (!response.ok) {
        const message =
          data?.message ||
          (typeof data === 'string' ? data : '') ||
          rawText ||
          'Login failed';
        throw new Error(message);
      }

      // If we reach here, we expect a valid JSON structure
      if (!data || !data.data) {
        throw new Error('Unexpected response from server. Please try again.');
      }

      // Store tokens and user data
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('userId', data.data.user.id);
      localStorage.setItem('userRole', data.data.user.role);
      
      // Redirect based on role
      const user = data.data.user;
      switch (user.role) {
        case 'ADMIN':
          router.push('/admin');
          break;
        case 'SUPERVISOR':
          router.push('/supervisor');
          break;
        case 'TEACHER':
          router.push('/teacher');
          break;
        case 'STUDENT':
          router.push('/student');
          break;
        default:
          router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen gradient-bg relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Book Icon */}
        <div className="absolute top-10 left-10 text-indigo-200 opacity-20 animate-float">
          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        </div>
        
        {/* Graduation Cap */}
        <div className="absolute bottom-20 right-16 text-teal-200 opacity-20 animate-float [animation-delay:0.5s]">
          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
          </svg>
        </div>

        {/* Pencil Icon */}
        <div className="absolute top-1/3 right-10 text-purple-200 opacity-15 animate-bounce-subtle">
          <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </div>

        {/* Light bulb */}
        <div className="absolute bottom-1/4 left-20 text-yellow-200 opacity-20 animate-pulse-slow">
          <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
          </svg>
        </div>
      </div>

      {/* Login Card with Animation */}
      <Card className={`w-full max-w-md p-8 space-y-6 relative z-10 shadow-2xl ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
        {/* Language Switcher */}
        <div className="flex justify-end gap-2 rtl:justify-start">
          <button
            onClick={() => setLocale('en')}
            className={`px-4 py-1.5 text-sm rounded-lg transition-all duration-300 font-medium ${
              locale === 'en' 
                ? 'gradient-primary text-white shadow-md transform scale-105' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLocale('ar')}
            className={`px-4 py-1.5 text-sm rounded-lg transition-all duration-300 font-medium ${
              locale === 'ar' 
                ? 'gradient-primary text-white shadow-md transform scale-105' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            AR
          </button>
        </div>

        {/* Header with Icon */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {t.login.title}
          </h1>
          <p className="text-gray-600 font-medium">{t.login.welcomeMessage}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 text-sm text-red-700 bg-red-50 border-l-4 border-red-500 rounded-lg animate-slide-down">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username" className="text-gray-700 font-medium">
              {t.login.username}
            </Label>
            <Input
              id="username"
              type="text"
              placeholder={t.login.usernamePlaceholder}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={loading}
              className="transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 font-medium">
              {t.login.password}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={t.login.passwordPlaceholder}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={loading}
              className="transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full gradient-primary text-white font-semibold py-6 rounded-lg hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                <span>{t.login.signingIn}</span>
              </div>
            ) : (
              t.login.signIn
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-500 border-t pt-4">
          <p>{t.login.contactAdmin}</p>
        </div>

        {/* Educational Quote */}
        <div className="text-center text-xs italic text-gray-400 border-t pt-3">
          <p>&ldquo;{t.login.quote}&rdquo;</p>
        </div>
      </Card>
    </div>
  );
}

