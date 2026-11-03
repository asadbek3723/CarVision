'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Lock, Check } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  AuthShell,
  GlassCard,
  FloatingInput,
  GoldButton,
} from '@/features/auth/components/AuthShell';
import { playLock, vibrate } from '@/features/camera/lib/fx';

function formatPhone(val: string): string {
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

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params['locale'] as string) || 'uz';
  const { user, signIn } = useAuth();

  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [errors, setErrors] = React.useState<{ phone?: string; pwd?: string }>({});
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { phone?: string; pwd?: string } = {};

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) {
      errs.phone =
        locale === 'uz'
          ? "Telefon raqamini to'g'ri kiriting"
          : 'Please enter a valid phone number';
    }
    if (password.length < 8) {
      errs.pwd =
        locale === 'uz'
          ? "Parol kamida 8 belgi bo'lishi kerak"
          : 'Password must be at least 8 characters';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setShake((prev) => prev + 1);
      return;
    }

    setLoading(true);
    try {
      const fullPhone = digits.startsWith('998') ? `+${digits}` : `+998${digits}`;
      const res = await signIn(fullPhone, password);
      if (res.success) {
        playLock();
        vibrate(25);
      } else {
        setErrors({
          phone:
            res.error ||
            (locale === 'uz'
              ? 'Kirishda xatolik yuz berdi'
              : 'Sign in failed'),
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
            CARVISION HISOBI
          </p>
          <h2 className="font-display mt-1 text-3xl sm:text-[32px] text-foreground leading-tight">
            Xush kelibsiz
          </h2>
          <p className="mt-1 text-xs text-foreground/65">
            Hisobingizga kiring va davom eting
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
          <FloatingInput
            icon={<Smartphone className="h-4 w-4" />}
            label="Telefon raqam"
            inputMode="tel"
            value={phone}
            onChange={(e) =>
              setPhone(
                formatPhone(e.target.value.replace(/\D/g, '').slice(0, 9))
              )
            }
            error={errors.phone}
          />

          <FloatingInput
            icon={<Lock className="h-4 w-4" />}
            type="password"
            label="Parol"
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
            Meni eslab qol
          </motion.button>

          <div className="pt-1.5">
            <GoldButton type="submit" loading={loading}>
              KIRISH
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
                alert(
                  locale === 'uz'
                    ? "Yordam uchun administrator bilan bog'laning"
                    : 'Please contact admin for recovery'
                )
              }
              className="text-foreground/75 transition hover:text-gold cursor-pointer"
            >
              Parolni unutdingizmi?
            </button>
          </div>
          <p className="text-foreground/60">
            Hisobingiz yo&apos;qmi?{' '}
            <Link
              href={`/${locale}/register`}
              className="font-medium text-gold transition hover:brightness-125 ms-1"
            >
              Ro&apos;yxatdan o&apos;ting
            </Link>
          </p>
        </motion.div>
      </GlassCard>
    </AuthShell>
  );
}
