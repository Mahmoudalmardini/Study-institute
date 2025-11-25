'use client';

import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';

interface SettingsMenuProps {
  onLogout: () => void;
}

export default function SettingsMenu({ onLogout }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t, locale, setLocale } = useI18n();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLanguageChange = (newLocale: 'en' | 'ar') => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Settings Button - Enhanced for light header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium bg-white/20 text-white border border-white/30 rounded-lg hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm transition-all duration-300 hover:scale-105"
        aria-label={t.common.settings}
      >
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span className="hidden sm:inline">{t.common.settings}</span>
      </button>

      {/* Dropdown Menu with Animation */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 rtl:right-auto rtl:left-2 sm:rtl:left-0 top-16 sm:top-auto z-[9999] mt-0 sm:mt-2 w-56 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none animate-scale-in">
          <div className="py-1">
            {/* Language Section */}
            <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
              {t.common.language}
            </div>
            
            <button
              onClick={() => handleLanguageChange('en')}
              className={`block w-full text-left px-4 py-3 text-sm transition-all duration-200 ${
                locale === 'en' 
                  ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>🇬🇧</span>
                  <span>{t.common.english}</span>
                </div>
                {locale === 'en' && (
                  <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>

            <button
              onClick={() => handleLanguageChange('ar')}
              className={`block w-full text-left px-4 py-3 text-sm transition-all duration-200 ${
                locale === 'ar' 
                  ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>🇸🇦</span>
                  <span>{t.common.arabic}</span>
                </div>
                {locale === 'ar' && (
                  <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>

            <div className="border-t border-gray-200 my-1"></div>

            {/* Logout */}
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-medium transition-all duration-200"
            >
              <div className="flex items-center gap-2 rtl:gap-reverse">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>{t.common.logout}</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

