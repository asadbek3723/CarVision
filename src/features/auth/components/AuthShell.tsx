'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_DIGITS,
  MAX_PHONE_DIGITS,
  detectCountry,
  formatInternational,
} from '../lib/phone-countries';
import { motion, AnimatePresence, useAnimationControls, type HTMLMotionProps } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

export function BrandHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mb-4 sm:mb-5 flex flex-col items-center select-none"
    >
      <svg
        viewBox="0 0 60 44"
        className="h-8 w-11 sm:h-9 sm:w-12"
        aria-hidden={true}
        style={{ filter: 'drop-shadow(0 0 10px oklch(0.86 0.07 85 / 0.45))' }}
      >
        <defs>
          <linearGradient id="cv-gold-lg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--gold)" />
            <stop offset="1" stopColor="var(--gold-deep)" />
          </linearGradient>
        </defs>
        <path d="M58 2H22L4 22l18 20h36l-6-6H25L13 22 25 8h27z" fill="url(#cv-gold-lg)" />
      </svg>
      <h1 className="font-display mt-2 text-3xl sm:text-[34px] tracking-[0.32em] text-foreground leading-none">
        CARVISION
      </h1>
      <p className="mt-1.5 text-[9px] tracking-[0.6em] text-foreground/70">
        DRIVE YOUR VISION
      </p>
    </motion.div>
  );
}

export function GlassCard({
  children,
  shake,
}: {
  children: React.ReactNode;
  shake?: number | undefined;
}) {
  const controls = useAnimationControls();

  // Only the shake is driven by hand. The intro is declarative (initial -> animate) so it can never
  // be skipped: a ref-guarded imperative intro was lost when React re-ran the effect (Strict Mode,
  // a Suspense boundary re-showing the page), leaving the form stuck invisible at opacity 0.
  React.useEffect(() => {
    if (shake) void controls.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.45 } });
  }, [shake, controls]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[390px] sm:max-w-[410px]"
    >
      <motion.div animate={controls} className="glass-card w-full rounded-[24px] px-6 py-6 sm:px-8 sm:py-7">
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Visible, screen-reader announced error/notice shown at the top of an auth form. */
export function AuthAlert({ message }: { message?: string | null | undefined }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key={message}
          role="alert"
          aria-live="assertive"
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          className="flex items-start gap-2.5 overflow-hidden rounded-xl bg-red-500/15 px-3.5 py-3 text-start text-[13px] leading-snug text-red-200 ring-1 ring-red-400/40"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
  label?: string | undefined;
  error?: string | undefined;
  prefix?: string | undefined;
}

export function FloatingInput({
  icon,
  error,
  type,
  prefix,
  label,
  ...props
}: FloatingInputProps) {
  const t = useTranslations('authShell');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const isPassword = type === 'password';
  const hasValue = typeof props.value === 'string' && props.value.length > 0;
  // Same layout as PhoneInput: the label always sits on top, the value below it.
  const isFloating = Boolean(label);
  void hasValue;

  return (
    <div>
      <label
        className={`auth-input relative flex h-14 items-center gap-3 rounded-xl px-4 ${error ? 'auth-input-error' : ''}`}
      >
        <span className={`grid h-5 w-5 shrink-0 place-items-center transition-colors duration-300 ${isFocused ? 'text-gold' : 'text-foreground/70'}`}>
          {icon}
        </span>
        {prefix && isFloating && (
          <span className="text-xs text-gold">{prefix}</span>
        )}
        <input
          {...props}
          type={isPassword && showPassword ? 'text' : type}
          placeholder={label ? ' ' : props.placeholder}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={`h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-foreground/35 ${isFloating ? 'pt-4' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="text-foreground/70 transition hover:text-gold cursor-pointer"
            aria-label={t('togglePassword')}
          >
            {showPassword ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
        )}
        {label && (
          <span
            className={`pointer-events-none absolute start-12 top-2 text-[10px] font-medium uppercase tracking-[0.16em] transition-colors duration-300 ${isFocused ? 'text-gold' : 'text-gold/75'}`}
          >
            {label}
          </span>
        )}
      </label>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1 ps-4 text-[11px] text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface PhoneInputProps {
  label: string;
  /** Full international digits, e.g. "998901234567". */
  value: string;
  onChange: (digits: string) => void;
  error?: string | undefined;
}

/**
 * One field for the whole number. Starts as +998 (Uzbekistan); typing or pasting another
 * country code switches the flag automatically.
 */
export function PhoneInput({ label, value, onChange, error }: PhoneInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const country = detectCountry(value);
  return (
    <div>
      <label
        className={`auth-input relative flex h-14 items-center gap-3 rounded-xl px-4 ${error ? 'auth-input-error' : ''}`}
      >
        <span className="grid h-5 w-5 shrink-0 place-items-center text-[17px] leading-none" aria-hidden={true}>
          {country ? country.flag : '🌐'}
        </span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={formatInternational(value)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS);
            onChange(digits || DEFAULT_DIGITS);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="h-full min-w-0 flex-1 bg-transparent pt-4 text-base tabular-nums text-foreground outline-none"
        />
        <span
          className={`pointer-events-none absolute start-12 top-2 text-[10px] font-medium uppercase tracking-[0.16em] transition-colors duration-300 ${isFocused ? 'text-gold' : 'text-gold/75'}`}
        >
          {label}
        </span>
      </label>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1 ps-4 text-[11px] text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface GoldButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: React.ReactNode;
  loading?: boolean | undefined;
}

export function GoldButton({
  children,
  loading,
  className = '',
  disabled,
  ...props
}: GoldButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      disabled={disabled || loading}
      {...props}
      className={`gold-btn flex h-12 w-full items-center justify-center rounded-full text-xs font-semibold tracking-[0.28em] disabled:opacity-60 cursor-pointer ${className}`}
    >
      <span className="relative z-10 flex-1 ps-7 text-center">
        {loading ? (
          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
        ) : (
          children
        )}
      </span>
      <ArrowRight className="relative z-10 me-5 h-4 w-4 opacity-60 rtl:rotate-180" />
    </motion.button>
  );
}

export function AuthShell({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack?: () => void;
}) {
  const t = useTranslations('authShell');
  const tc = useTranslations('common');
  return (
    <div className="dark relative min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto bg-ink text-foreground flex flex-col items-center justify-center">
      {/* 1:1 Porsche 911 Master Artwork Background */}
      <motion.img
        src="/images/golden/hero-car.jpg"
        alt={t('heroAlt')}
        width={1920}
        height={1088}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.95 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 h-full w-full object-cover select-none pointer-events-none"
      />
      {/* Cinematic Vignette Overlay so the sports car is crisp and visible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(10, 11, 15, 0.4) 0%, rgba(10, 11, 15, 0.75) 70%, #0A0B0F 100%), linear-gradient(180deg, rgba(10, 11, 15, 0.5) 0%, transparent 30%, transparent 70%, rgba(10, 11, 15, 0.75) 100%)',
        }}
      />

      {/* Aurora Ambient Blobs */}
      <div className="pointer-events-none absolute -start-40 top-1/4 h-[24rem] w-[24rem] rounded-full bg-gold/15 blur-[60px]" />
      <div className="pointer-events-none absolute -end-32 bottom-0 h-[20rem] w-[20rem] rounded-full bg-gold-deep/15 blur-[60px] [animation-delay:-4.5s]" />

      {/* Vertical Golden Laser Beams */}
      <div className="pointer-events-none absolute end-[12%] top-0 h-full w-[3px] bg-gold/80" />

      {/* Back button */}
      {onBack && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onBack}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          aria-label={tc('back')}
          className="glass-card absolute start-4 top-4 sm:start-8 sm:top-6 z-20 grid h-11 w-11 sm:h-11 sm:w-11 place-items-center rounded-xl text-foreground/90 transition hover:text-gold cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </motion.button>
      )}

      {/* Center layout: scrolls when the on-screen keyboard shrinks the viewport */}
      <div className="relative z-10 flex min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-6 sm:py-8">
        <BrandHeader />
        {children}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 sm:mt-5 text-[9px] tracking-[0.35em] text-foreground/40 select-none"
        >
          PREMIUM AUTO TUNING · EST. 2026
        </motion.p>
      </div>
    </div>
  );
}
