'use client';

import * as React from 'react';
import { useApiError } from '@/lib/api-error';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowLeft, Loader2, Lock, Shield } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface Props {
  onSuccess: () => void;
  adminName: string;
}

/** Second factor: the admin PIN (6-32 characters). Works with the phone keyboard and the Enter key. */
export function AdminPinGate({ onSuccess, adminName }: Props) {
  const t = useTranslations('adm.gate');
  const apiError = useApiError();
  const tn = useTranslations('adm.nav');
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [lockedFor, setLockedFor] = React.useState(0);

  React.useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setInterval(() => setLockedFor((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [lockedFor]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 6 || submitting || lockedFor > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onSuccess();
        return;
      }
      if (data.error?.code !== 'ADMIN_NOT_CONFIGURED') setPin('');
      if (data.error?.code === 'RATE_LIMIT_EXCEEDED') setLockedFor(Number(data.error.retryAfterSeconds) || 900);
      setError(
        data.error?.code === 'INVALID_PIN' && typeof data.error?.remainingAttempts === 'number'
          ? t('wrongLeft', { remaining: data.error.remainingAttempts })
          : apiError({ code: data.error?.code, error: data.error?.message }, t('wrong'))
      );
    } catch {
      setError(t('network'));
    } finally {
      setSubmitting(false);
    }
  };

  const mm = String(Math.floor(lockedFor / 60)).padStart(2, '0');
  const ss = String(lockedFor % 60).padStart(2, '0');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07080B] p-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[32px] bg-white/[0.04] p-7 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gold-500/15 text-gold-500"><Shield className="h-8 w-8" /></span>
        <h1 className="mt-5 text-xl font-bold text-white">{t('title')}</h1>
        <p className="mt-1 text-sm text-white/50">{adminName}</p>

        <label className="mt-6 block">
          <span className="sr-only">{t('pinLabel')}</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={32}
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(null); }}
            disabled={lockedFor > 0}
            placeholder="••••••"
            className="w-full rounded-2xl bg-white/[0.07] px-4 py-4 text-center text-2xl tracking-[0.4em] text-white outline-none placeholder:text-white/25 focus:bg-white/[0.1] disabled:opacity-50"
          />
        </label>

        {lockedFor > 0 ? (
          <p role="alert" className="mt-4 flex items-center justify-center gap-2 text-sm text-red-300"><Lock className="h-4 w-4" />{t('locked', { time: `${mm}:${ss}` })}</p>
        ) : error ? (
          <p role="alert" className="mt-4 flex items-start justify-center gap-2 text-sm text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>
        ) : null}

        <button type="submit" disabled={pin.length < 6 || submitting || lockedFor > 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 py-4 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-40">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('submit')}
        </button>
        <Link href="/seller" className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          {tn('backToApp')}
        </Link>
      </form>
    </div>
  );
}
