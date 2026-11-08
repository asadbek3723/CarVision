'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { BadgeCheck, CircleAlert, Loader2 } from 'lucide-react';
import { Input, PageHeader, Sheet, buttonClasses } from '@/components/ui';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { UserProfile } from '@/features/auth/types';
import { PasswordForm } from '@/features/account/ProfileExtras';
import { ProfileSection } from '@/features/account/ProfileSection';
import { initialsOf, pageWrap } from '@/features/account/preferences';
import { cn } from '@/lib/utils';

type ContactKind = 'phone' | 'email';
type FieldErrors = Partial<Record<'name' | ContactKind | 'phoneCode' | 'emailCode' | 'form', string>>;

const RESEND_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "+998901234567" / "90 123 45 67" -> "998901234567" (same rule as the server: 9 digits = Uzbekistan). */
function phoneDigits(raw: string): string {
  const d = raw.replace(/\D/g, '');
  return d.length === 9 ? `998${d}` : d;
}

function isValidPhone(raw: string): boolean {
  const d = raw.replace(/\D/g, '');
  return d.length === 9 || (d.length >= 11 && d.length <= 15);
}

/** Pretty form for display: +998 90 123 45 67 for Uzbek numbers, +digits otherwise. */
function formatPhone(raw: string): string {
  const d = phoneDigits(raw);
  if (!d) return '';
  if (d.startsWith('998') && d.length === 12) return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  return `+${d}`;
}

/** Small state line under a contact field: verified, not verified yet, or "will be confirmed". */
function ContactStatus({ state, labels }: { state: 'verified' | 'unverified' | 'pending' | 'none'; labels: Record<'verified' | 'unverified' | 'pending', string> }) {
  if (state === 'none') return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px]',
        state === 'verified' && 'text-emerald-400',
        state === 'unverified' && 'text-amber-300/90',
        state === 'pending' && 'text-white/55'
      )}
    >
      {state === 'verified' ? <BadgeCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
      {labels[state]}
    </span>
  );
}

/** Edit the account in one form: name, phone and e-mail, saved with one button. Password has its own form. */
export function ProfileEdit() {
  const t = useTranslations('profilePage');
  const tx = useTranslations('profileExtras');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user, updateProfile } = useAuth();

  const [name, setName] = React.useState(user?.full_name ?? '');
  const [phone, setPhone] = React.useState(user?.phone ? formatPhone(user.phone) : '');
  const [email, setEmail] = React.useState(user?.email ?? '');
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  // Verification step (only while SMS / e-mail delivery is configured on the server).
  const [verify, setVerify] = React.useState<ContactKind[] | null>(null);
  const [codes, setCodes] = React.useState<Record<ContactKind, string>>({ phone: '', email: '' });
  const [cooldown, setCooldown] = React.useState<Record<ContactKind, number>>({ phone: 0, email: 0 });

  // Fill the form once the profile arrives (first paint can be before the session check finishes).
  const seeded = React.useRef(Boolean(user));
  React.useEffect(() => {
    if (!user || seeded.current) return;
    seeded.current = true;
    setName(user.full_name ?? '');
    setPhone(user.phone ? formatPhone(user.phone) : '');
    setEmail(user.email ?? '');
  }, [user]);

  React.useEffect(() => {
    if (cooldown.phone <= 0 && cooldown.email <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((c) => ({ phone: Math.max(0, c.phone - 1), email: Math.max(0, c.email - 1) }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown.phone, cooldown.email]);

  if (!user) return null;
  const profileHref = `/${locale}/profile`;

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const phoneChanged = phoneDigits(phone) !== phoneDigits(user.phone ?? '');
  const emailChanged = trimmedEmail !== (user.email ?? '').toLowerCase();
  const nameChanged = trimmedName !== (user.full_name ?? '');
  const dirty = nameChanged || phoneChanged || emailChanged;

  const statusLabels = { verified: t('verified'), unverified: t('unverified'), pending: t('willVerify') };
  const phoneState = phoneChanged ? 'pending' : user.phone_verified ? 'verified' : 'unverified';
  const emailState = emailChanged ? (trimmedEmail ? 'pending' : 'none') : user.email ? (user.email_verified ? 'verified' : 'unverified') : 'none';

  /** Maps a server error code to the field it belongs to. */
  const applyServerError = (code: string | undefined) => {
    switch (code) {
      case 'INVALID_PHONE':
        return setErrors({ phone: t('phoneInvalid') });
      case 'PHONE_TAKEN':
        return setErrors({ phone: t('phoneTaken') });
      case 'INVALID_EMAIL':
        return setErrors({ email: t('emailInvalid') });
      case 'EMAIL_TAKEN':
        return setErrors({ email: t('emailTaken') });
      case 'PHONE_CODE_INVALID':
      case 'PHONE_CODE_REQUIRED':
        return setErrors({ phoneCode: t('codeInvalid') });
      case 'EMAIL_CODE_INVALID':
      case 'EMAIL_CODE_REQUIRED':
        return setErrors({ emailCode: t('codeInvalid') });
      case 'RATE_LIMITED':
      case 'TOO_SOON':
        return setErrors({ form: t('tooManyRequests') });
      case 'SEND_FAILED':
        return setErrors({ form: t('sendFailed') });
      default:
        return setErrors({ form: t('saveFailed') });
    }
  };

  const sendCode = async (kind: ContactKind): Promise<{ required: boolean } | null> => {
    const res = await fetch('/api/v1/auth/contact/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, value: kind === 'phone' ? phone : trimmedEmail }),
    });
    const data = (await res.json().catch(() => null)) as { success?: boolean; code?: string; verificationRequired?: boolean; retryAfterSeconds?: number } | null;
    if (!res.ok || !data?.success) {
      if (data?.code === 'TOO_SOON' && data.retryAfterSeconds) {
        // A code was sent less than a minute ago: it is still valid, ask for it.
        setCooldown((c) => ({ ...c, [kind]: data.retryAfterSeconds ?? RESEND_SECONDS }));
        return { required: true };
      }
      applyServerError(data?.code);
      return null;
    }
    if (data.verificationRequired) setCooldown((c) => ({ ...c, [kind]: RESEND_SECONDS }));
    return { required: Boolean(data.verificationRequired) };
  };

  const submit = async (withCodes: Partial<Record<ContactKind, string>>) => {
    const body: Record<string, string | null> = {};
    if (nameChanged) body['fullName'] = trimmedName;
    if (phoneChanged) body['phone'] = phone;
    if (emailChanged) body['email'] = trimmedEmail || null;
    if (withCodes.phone) body['phoneCode'] = withCodes.phone;
    if (withCodes.email) body['emailCode'] = withCodes.email;
    const res = await fetch('/api/v1/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { success?: boolean; code?: string; user?: UserProfile } | null;
    if (!res.ok || !data?.success) {
      applyServerError(data?.code);
      // Wrong / expired code: stay on the code step; any other problem goes back to the form.
      if (!data?.code?.includes('_CODE_')) setVerify(null);
      return;
    }
    if (data.user) updateProfile(data.user);
    else updateProfile({ full_name: trimmedName });
    setVerify(null);
    router.push(profileHref);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const next: FieldErrors = {};
    if (trimmedName.length < 2) next.name = t('nameInvalid');
    if (!isValidPhone(phone)) next.phone = t('phoneInvalid');
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) next.email = t('emailInvalid');
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    if (!dirty) return router.push(profileHref);

    setSaving(true);
    try {
      const needed: ContactKind[] = [];
      for (const kind of ['phone', 'email'] as const) {
        const changed = kind === 'phone' ? phoneChanged : emailChanged && Boolean(trimmedEmail);
        if (!changed) continue;
        const sent = await sendCode(kind);
        if (!sent) return;
        if (sent.required) needed.push(kind);
      }
      if (needed.length > 0) {
        setCodes({ phone: '', email: '' });
        setVerify(needed);
        return;
      }
      await submit({});
    } catch {
      setErrors({ form: t('saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const confirmCodes = async () => {
    if (!verify || saving) return;
    const next: FieldErrors = {};
    for (const kind of verify) if (!/^\d{6}$/.test(codes[kind])) next[kind === 'phone' ? 'phoneCode' : 'emailCode'] = t('codeInvalid');
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      await submit({ ...(verify.includes('phone') ? { phone: codes.phone } : {}), ...(verify.includes('email') ? { email: codes.email } : {}) });
    } catch {
      setErrors({ form: t('saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const resend = async (kind: ContactKind) => {
    if (cooldown[kind] > 0) return;
    setErrors({});
    try {
      await sendCode(kind);
    } catch {
      setErrors({ form: t('sendFailed') });
    }
  };

  return (
    <div className={pageWrap}>
      <PageHeader title={t('editProfile')} subtitle={t('editSub')} back={{ href: profileHref }} />

      <div className="flex items-center gap-5 pb-4 pt-2">
        <div aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gold-gradient text-2xl font-semibold uppercase text-black md:h-24 md:w-24 md:text-3xl">
          {initialsOf(name || user.full_name)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-heading text-xl font-semibold text-white md:text-3xl">{trimmedName || t('guest')}</p>
          {(phone || user.email) && (
            <p dir="ltr" className="mt-1 truncate text-start text-sm text-white/50 rtl:text-end">
              {formatPhone(phone) || user.email}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={save} noValidate>
        <ProfileSection title={t('personalTitle')} hint={t('personalHint')}>
          <div className="max-w-xl space-y-5">
            <Input
              label={t('nameLabel')}
              autoComplete="name"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              error={errors.name}
            />

            <div className="space-y-2">
              <Input
                label={t('phoneLabel')}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s()-]/g, ''))}
                onBlur={() => isValidPhone(phone) && setPhone(formatPhone(phone))}
                placeholder="+998 90 123 45 67"
                error={errors.phone}
                className="tabular-nums rtl:text-end"
              />
              <ContactStatus state={phoneState} labels={statusLabels} />
            </div>

            <div className="space-y-2">
              <Input
                label={t('emailLabel')}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                dir="ltr"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                hint={!user.email && !email ? t('emailAddHint') : undefined}
                error={errors.email}
                className="rtl:text-end"
              />
              <ContactStatus state={emailState} labels={statusLabels} />
            </div>

            {errors.form && !verify && (
              <p role="alert" className="text-sm text-danger-soft">
                {errors.form}
              </p>
            )}

            <button type="submit" disabled={saving} className={buttonClasses({ size: 'lg', className: 'w-full px-10 sm:w-auto' })}>
              {saving && !verify && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('save')}
            </button>
          </div>
        </ProfileSection>
      </form>

      <ProfileSection title={t('passwordTitle')} hint={tx('security')}>
        <div className="max-w-xl">
          <PasswordForm />
        </div>
      </ProfileSection>

      <Sheet
        open={verify !== null}
        onClose={() => !saving && setVerify(null)}
        title={t('verifyTitle')}
        description={t('verifySub')}
        size="sm"
        footer={
          <button type="button" onClick={confirmCodes} disabled={saving} className={buttonClasses({ size: 'lg', className: 'w-full' })}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('confirm')}
          </button>
        }
      >
        <div className="space-y-6">
          {(verify ?? []).map((kind) => {
            const target = kind === 'phone' ? formatPhone(phone) : trimmedEmail;
            const err = kind === 'phone' ? errors.phoneCode : errors.emailCode;
            return (
              <div key={kind} className="space-y-2">
                <Input
                  label={kind === 'phone' ? t('codeSentPhone', { target }) : t('codeSentEmail', { target })}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  dir="ltr"
                  value={codes[kind]}
                  onChange={(e) => setCodes((c) => ({ ...c, [kind]: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                  placeholder="••••••"
                  error={err}
                  className="text-center font-mono text-2xl tracking-[0.5em]"
                />
                <button
                  type="button"
                  onClick={() => void resend(kind)}
                  disabled={cooldown[kind] > 0}
                  className="min-h-9 text-sm font-medium text-gold-500 transition hover:underline disabled:cursor-default disabled:text-white/40 disabled:no-underline"
                >
                  {cooldown[kind] > 0 ? t('resendIn', { seconds: cooldown[kind] }) : t('resend')}
                </button>
              </div>
            );
          })}
          {errors.form && verify && (
            <p role="alert" className="text-sm text-danger-soft">
              {errors.form}
            </p>
          )}
        </div>
      </Sheet>
    </div>
  );
}
