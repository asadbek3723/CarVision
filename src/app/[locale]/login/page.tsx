'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  AuthShell,
  GlassCard,
  FloatingInput,
  PhoneInput,
  GoldButton,
} from '@/features/auth/components/AuthShell';
import { DEFAULT_DIGITS, nationalLength } from '@/features/auth/lib/phone-countries';
import { playLock, vibrate } from '@/features/camera/lib/fx';

export default function LoginPage() {
  const t = useTranslations('login');
  const router = useRouter();
  const params = useParams();
  const locale = (params['locale'] as string) || 'uz';
  const { user, signIn } = useAuth();

  const [phone, setPhone] = React.useState(DEFAULT_DIGITS);
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [errors, setErrors] = React.useState<{ phone?: string; pwd?: string }>({});
  const [shake, setShake] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  // Warm up the pages the user is most likely to open next.
  React.useEffect(() => {
    router.prefetch(`/${locale}/seller`);
    router.prefetch(`/${locale}/register`);
  }, [router, locale]);

  // If already authenticated, redirect to the Veloce App
  React.useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') {
        router.replace(`/${locale}/admin`);
      } else {
        router.replace(`/${locale}/seller`);
      }
    }
  }, [user, locale, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { phone?: string; pwd?: string } = {};

    if (nationalLength(phone) < 7) {
      errs.phone = t('errPhone');
    }
    if (password.length < 8) {
      errs.pwd = t('errPassword');
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setShake((prev) => prev + 1);
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+${phone}`;
      const res = await signIn(fullPhone, password);
      if (res.success) {
        playLock();
        vibrate(25);
      } else {
        setErrors({
          phone: res.error || t('errFailed'),
        });
        setShake((prev) => prev + 1);
      }
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
          <PhoneInput
            label={t('phone')}
            value={phone}
            onChange={setPhone}
            error={errors.phone}
          />

          <FloatingInput
            icon={<Lock className="h-4 w-4" />}
            type="password"
            label={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.pwd}
            maxLength={64}
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
          transition={{ delay: 0.15 }}
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
