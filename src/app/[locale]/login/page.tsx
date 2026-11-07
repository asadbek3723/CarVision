'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Lock, Check } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  AuthShell,
  GlassCard,
  FloatingInput,
  GoldButton,
  AuthAlert,
} from '@/features/auth/components/AuthShell';
import { playLock, vibrate } from '@/features/camera/lib/fx';
import { COUNTRIES, DEFAULT_COUNTRY, buildE164, isPlausibleNational, type Country } from '@/features/auth/phone-input';

function formatUzPhone(val: string): string {
  const chunks = [2, 3, 2, 2];
  const parts: string[] = [];
  let r = 0;
  for (const c of chunks) {
    if (r >= val.length) break;
    parts.push(val.slice(r, r + c));
    r += c;
  }
  if (r < val.length) parts.push(val.slice(r));
  return parts.join(' ');
}

type FieldErrors = { phone?: string | undefined; pwd?: string | undefined };

export default function LoginPage() {
  const t = useTranslations('login');
  const tReg = useTranslations('register');
  const router = useRouter();
  const params = useParams();
  const locale = (params['locale'] as string) || 'uz';
  const { user, signIn } = useAuth();

  const [country, setCountry] = React.useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [shake, setShake] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  // If already authenticated, redirect to the Veloce App
  React.useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') {
        router.push(`/${locale}/admin`);
      } else {
        router.push(`/${locale}/seller`);
      }
    }
  }, [user, locale, router]);

  const fail = (next: FieldErrors = {}, banner: string | null = null) => {
    setErrors(next);
    setFormError(banner);
    setShake((prev) => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const errs: FieldErrors = {};

    if (!isPlausibleNational(phone, country)) errs.phone = t('errPhone');
    if (password.length < 8) errs.pwd = t('errPassword');

    if (Object.keys(errs).length > 0) {
      fail(errs);
      return;
    }

    setErrors({});
    setFormError(null);
    setLoading(true);
    try {
      const res = await signIn(buildE164(country, phone), password);
      if (res.success) {
        playLock();
        vibrate(25);
        return;
      }
      // Real reason, shown prominently: wrong credentials, blocked, rate-limited, offline, server.
      const message =
        res.code === 'NETWORK'
          ? t('errNetwork')
          : res.code === 'SERVER' || res.code === 'INTERNAL'
            ? t('errServer')
            : res.code === 'INVALID_CREDENTIALS'
              ? t('errInvalid')
              : res.error || t('errFailed');
      fail({}, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell onBack={() => router.push(`/${locale}`)}>
      <GlassCard shake={shake}>
        <div className="text-center">
          <p className="text-[9px] tracking-[0.45em] text-gold uppercase">
            {t('eyebrow')}
          </p>
          <h2 className="font-display mt-1 text-3xl sm:text-[32px] text-foreground leading-tight">
            {t('title')}
          </h2>
          <p className="mt-1 text-xs text-foreground/65">
            {t('subtitle')}
          </p>
        </div>

        <AuthAlert message={formError} />

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-3.5">
          <div className="flex gap-2">
            <label className="auth-input relative flex h-14 shrink-0 items-center rounded-xl ps-3 pe-2">
              <span className="sr-only">{tReg('searchCountry')}</span>
              <select
                value={country.id}
                onChange={(e) => {
                  setCountry(COUNTRIES.find((c) => c.id === e.target.value) ?? DEFAULT_COUNTRY);
                  setErrors((p) => ({ ...p, phone: undefined }));
                }}
                className="h-full cursor-pointer appearance-none bg-transparent pe-1 text-base text-foreground outline-none"
                aria-label={tReg('searchCountry')}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#12141A] text-white">
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </label>
            <div className="min-w-0 flex-1">
              <FloatingInput
                icon={<Smartphone className="h-4 w-4" />}
                label={t('phone')}
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => {
                  const raw = e.target.value;
                  setPhone(country.code === '+998' && !raw.trim().startsWith('+') && raw.replace(/\D/g, '').length <= 9 ? formatUzPhone(raw.replace(/\D/g, '')) : raw.slice(0, 20));
                  if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
                }}
                error={errors.phone}
              />
            </div>
          </div>

          <FloatingInput
            icon={<Lock className="h-4 w-4" />}
            type="password"
            label={t('password')}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.pwd) setErrors((p) => ({ ...p, pwd: undefined }));
            }}
            autoComplete="current-password"
            error={errors.pwd}
            maxLength={72}
          />

          <motion.button
            type="button"
            onClick={() => setRememberMe((v) => !v)}
            className="flex items-center gap-2 text-xs text-foreground/70 transition hover:text-foreground cursor-pointer pt-0.5"
          >
            <span
              className={`grid h-4 w-4 place-items-center rounded border transition-colors duration-300 ${
                rememberMe
                  ? 'border-gold bg-gold text-ink'
                  : 'border-foreground/30 bg-transparent'
              }`}
            >
              <AnimatePresence>
                {rememberMe && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            {t('remember')}
          </motion.button>

          <div className="pt-1.5">
            <GoldButton type="submit" loading={loading}>
              {t('submit')}
            </GoldButton>
          </div>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-5 space-y-2.5 text-center text-xs"
        >
          <div>
            <button
              type="button"
              onClick={() =>
                alert(t('forgotHelp'))
              }
              className="text-foreground/75 transition hover:text-gold cursor-pointer"
            >
              {t('forgot')}
            </button>
          </div>
          <p className="text-foreground/60">
            {t('noAccount')}{' '}
            <Link
              href={`/${locale}/register`}
              className="font-medium text-gold transition hover:brightness-125 ms-1"
            >
              {t('registerLink')}
            </Link>
          </p>
        </motion.div>
      </GlassCard>
    </AuthShell>
  );
}
