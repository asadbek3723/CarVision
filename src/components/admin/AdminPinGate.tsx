'use client';

import * as React from 'react';
import { Shield, Lock, AlertCircle, ArrowLeft, Loader2, Delete, RefreshCw } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface AdminPinGateProps {
  onSuccess: () => void;
  adminEmail?: string;
}

export function AdminPinGate({ onSuccess, adminEmail }: AdminPinGateProps) {
  const [pin, setPin] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [remainingAttempts, setRemainingAttempts] = React.useState<number | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = React.useState<number | null>(null);
  const [shake, setShake] = React.useState(false);

  // Countdown timer for lockout
  React.useEffect(() => {
    if (!lockoutSeconds || lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(interval);
          setError(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  // Handle PIN submission to server
  const submitPin = React.useCallback(async (candidatePin: string) => {
    if (candidatePin.length < 4 || isSubmitting || lockoutSeconds) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/admin/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: candidatePin }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShake(false);
        onSuccess();
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin('');

        if (data.error?.code === 'RATE_LIMIT_EXCEEDED') {
          setLockoutSeconds(data.error.retryAfterSeconds || 900);
          setError(data.error.message);
        } else {
          setError(data.error?.message || 'PIN kod noto‘g‘ri kiritildi.');
          if (typeof data.error?.remainingAttempts === 'number') {
            setRemainingAttempts(data.error.remainingAttempts);
          }
        }
      }
    } catch {
      setError('Server bilan bog‘lanishda xatolik. Qaytadan urinib ko‘ring.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, lockoutSeconds, onSuccess]);

  // Auto-submit when 4 digits reached
  React.useEffect(() => {
    if (pin.length === 4) {
      submitPin(pin);
    }
  }, [pin, submitPin]);

  // Physical keyboard listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lockoutSeconds || isSubmitting) return;

      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          setPin((prev) => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        setError(null);
      } else if (e.key === 'Escape') {
        setPin('');
        setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, lockoutSeconds, isSubmitting]);

  const handleKeyPress = (num: string) => {
    if (lockoutSeconds || isSubmitting) return;
    if (pin.length < 4) {
      setPin((prev) => prev + num);
      setError(null);
    }
  };

  const handleBackspace = () => {
    if (lockoutSeconds || isSubmitting) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    if (lockoutSeconds || isSubmitting) return;
    setPin('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#07080B] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background radial gold glow */}
      <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-[#D4AE62]/5 rounded-full blur-[130px] pointer-events-none" />

      {/* Top back navigation */}
      <div className="absolute top-6 start-6 z-10">
        <Link
          href="/seller"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#94A3B8] hover:text-[#E6C687] transition-colors px-3 py-2 rounded-xl bg-[#0D0F14]/80 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Atelye Kabinetiga Qaytish</span>
        </Link>
      </div>

      {/* Main Security Card */}
      <div
        className={`w-full max-w-sm z-10 bg-[#0B0C10]/95 backdrop-blur-2xl rounded-3xl p-8 sm:p-9 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(212,174,98,0.08)] border border-[#D4AE62]/20 transition-transform ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#1C1F29] to-[#0F1117] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_20px_rgba(0,0,0,0.6)]">
              <Shield className="w-8 h-8 text-[#D4AE62]" />
            </div>
            <div className="absolute -bottom-1 -end-1 w-6 h-6 rounded-full bg-[#1A1308] border border-[#D4AE62]/40 flex items-center justify-center">
              <Lock className="w-3 h-3 text-[#E5C378]" />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">CarVision Security Vault</h1>
            <p className="text-xs text-[#94A3B8] mt-1 font-medium">
              Administrator Master PIN orqali tasdiqlash
            </p>
            {adminEmail && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#12141C] text-[11px] font-mono text-[#D4AE62]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{adminEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* PIN Dots Display */}
        <div className="my-8">
          <div className="flex items-center justify-center gap-4">
            {[0, 1, 2, 3].map((idx) => {
              const filled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    filled
                      ? 'bg-gradient-to-r from-[#D4AE62] to-[#F3DE9D] scale-125 shadow-[0_0_14px_rgba(212,174,98,0.7)]'
                      : 'bg-[#1C1F29] shadow-inner scale-100'
                  }`}
                />
              );
            })}
          </div>

          {/* Status / Error Message */}
          <div className="h-6 mt-4 text-center">
            {isSubmitting && (
              <div className="inline-flex items-center gap-2 text-xs text-[#D4AE62]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Serverda tekshirilmoqda...</span>
              </div>
            )}
            {!isSubmitting && error && (
              <div className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {!isSubmitting && !error && lockoutSeconds && (
              <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Qayta urinish: {lockoutSeconds} soniya</span>
              </div>
            )}
            {!isSubmitting && !error && !lockoutSeconds && remainingAttempts !== null && (
              <span className="text-[11px] text-[#94A3B8]">
                Qolgan urinishlar: {remainingAttempts}
              </span>
            )}
          </div>
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isSubmitting || !!lockoutSeconds}
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-gradient-to-b from-[#141720] to-[#0E1017] text-xl font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] hover:from-[#1D212E] hover:to-[#141720] hover:text-[#D4AE62] active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center font-mono"
            >
              {digit}
            </button>
          ))}

          {/* Clear Key */}
          <button
            type="button"
            disabled={isSubmitting || !!lockoutSeconds || pin.length === 0}
            onClick={handleClear}
            className="h-14 rounded-2xl bg-[#0E1017]/80 text-xs font-semibold uppercase tracking-wider text-[#94A3B8] hover:text-white hover:bg-[#141720] active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center"
          >
            Tozalash
          </button>

          {/* Zero Key */}
          <button
            type="button"
            disabled={isSubmitting || !!lockoutSeconds}
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-gradient-to-b from-[#141720] to-[#0E1017] text-xl font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] hover:from-[#1D212E] hover:to-[#141720] hover:text-[#D4AE62] active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center font-mono"
          >
            0
          </button>

          {/* Backspace Key */}
          <button
            type="button"
            disabled={isSubmitting || !!lockoutSeconds || pin.length === 0}
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-[#0E1017]/80 text-[#94A3B8] hover:text-white hover:bg-[#141720] active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-7 pt-5 border-t border-[#D4AE62]/10 text-center">
          <p className="text-[10px] text-[#64748B] leading-relaxed">
            256-bit HMAC sessiya tokeni • Maksimal 5 ta urinish • IP darajasidagi doimiy audit
          </p>
        </div>
      </div>
    </div>
  );
}
