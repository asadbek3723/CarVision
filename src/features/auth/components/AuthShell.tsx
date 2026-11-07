'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_DIGITS,
  MAX_PHONE_DIGITS,
  detectCountry,
  formatInternational,
} from '../lib/phone-countries';
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion';
import {
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
  return (
    <motion.div
      key={shake}
      initial={shake ? { x: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
      animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : { opacity: 1, y: 0, scale: 1 }}
      transition={
        shake
          ? { duration: 0.45 }
          : { duration: 0.4, delay: 0, ease: [0.22, 1, 0.36, 1] }
      }
      className="glass-card w-full max-w-[390px] sm:max-w-[410px] overflow-hidden rounded-[24px] px-6 py-6 sm:px-8 sm:py-7"
    >
      {children}
    </motion.div>
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
  const isFloating = Boolean(label && (isFocused || hasValue));

  return (
    <div>
      <label
        className={`auth-input relative flex h-12 items-center gap-2.5 rounded-xl px-4 ${
          error ? 'auth-input-error' : ''
        }`}
      >
        <span
          className={`transition-colors duration-300 ${
            isFocused ? 'text-gold' : 'text-foreground/80'
          }`}
        >
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
          className={`h-full flex-1 bg-transparent outline-none placeholder:text-foreground/50 ${
            isFloating ? 'pt-3.5' : ''
          } text-[14px] text-foreground`}
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
            className={`pointer-events-none absolute start-[44px] transition-all duration-300 ${
              isFloating
                ? 'top-1 text-[9px] uppercase tracking-[0.16em] text-gold font-medium'
                : 'top-1/2 -translate-y-1/2 text-[13.5px] text-foreground/55'
            }`}
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
        className={`auth-input relative flex h-12 items-center gap-2.5 rounded-xl px-4 ${
          error ? 'auth-input-error' : ''
        }`}
      >
        <span className="w-6 text-center text-lg leading-none" aria-hidden={true}>
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
          className="h-full flex-1 bg-transparent pt-3.5 text-[14px] tabular-nums text-foreground outline-none"
        />
        <span
          className={`pointer-events-none absolute start-[52px] top-1 text-[9px] font-medium uppercase tracking-[0.16em] transition-colors duration-300 ${
            isFocused ? 'text-gold' : 'text-gold/80'
          }`}
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
    <div className="dark relative h-screen max-h-screen w-full overflow-hidden bg-ink text-foreground flex flex-col items-center justify-center select-none">
      {/* 1:1 Porsche 911 Master Artwork Background */}
      <motion.img
        src="/images/golden/hero-car.jpg"
        alt={t('heroAlt')}
        width={1920}
        height={1088}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.95 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
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
          transition={{ delay: 0.1 }}
          onClick={onBack}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          aria-label={tc('back')}
          className="glass-card absolute start-4 top-4 sm:start-8 sm:top-6 z-20 grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-xl text-foreground/90 transition hover:text-gold cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </motion.button>
      )}

      {/* Center Layout Container - Strict 100vh lock */}
      <div className="relative z-10 flex h-full max-h-screen w-full flex-col items-center justify-center px-4 py-3 sm:py-4 overflow-hidden">
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
