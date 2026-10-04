'use client';

import { useI18n } from '@/lib/i18n-context';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  variant?: 'chip' | 'bare';
  className?: string;
}

export function Logo({ size = 40, variant = 'chip', className }: LogoProps) {
  const { t } = useI18n();

  const img = (extra?: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- images are unoptimized in next.config; <img> keeps it simple
    <img src="/logo.jpg" alt={t.common.appName} width={size} height={size} className={cn('h-full w-full object-contain', extra)} />
  );

  // The JPG has a solid black background; lighten blending drops it out on dark surfaces.
  if (variant === 'bare') {
    return (
      <div className={cn('flex-shrink-0', className)} style={{ width: size, height: size }}>
        {img('mix-blend-lighten')}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex-shrink-0 overflow-hidden rounded-lg bg-gray-950 p-0.5 ring-1 ring-gold-500/50 shadow-[0_0_12px_rgba(212,160,23,0.25)]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {img()}
    </div>
  );
}
