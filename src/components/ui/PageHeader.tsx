'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type PageHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode | undefined;
  /** Back link shown before the title; label defaults to common.back. */
  back?: { href: string; label?: string | undefined } | undefined;
  /** Actions on the end side (at most one gold Button). */
  actions?: React.ReactNode | undefined;
  className?: string | undefined;
};

/** The one page title style: h1 + optional subtitle, back link and actions. */
export function PageHeader({ title, subtitle, back, actions, className }: PageHeaderProps) {
  const t = useTranslations('common');
  const backLabel = back?.label ?? t('back');
  return (
    <header className={cn('mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 sm:mb-8', className)}>
      <div className="flex min-w-0 items-start gap-2">
        {back && (
          <Link
            href={back.href}
            aria-label={backLabel}
            className="-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-micro hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-500/40"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        )}
        <div className={cn('min-w-0', back && 'pt-1')}>
          <h1 className="text-balance font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-prose text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
