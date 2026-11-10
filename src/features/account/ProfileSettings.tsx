'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useParams, usePathname } from 'next/navigation';
import type { Locale } from '@/i18n/routing';
import { ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { CreditHistory } from '@/features/account/ProfileExtras';
import { ProfileSection } from '@/features/account/ProfileSection';
import { CURRENCIES, LANGUAGES, focusRing, localizedPath, pageWrap } from '@/features/account/preferences';

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: ReadonlyArray<{ value: string; label: string }> }) {
  const id = React.useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm text-white/55">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-12 w-full cursor-pointer appearance-none rounded-xl bg-white/[0.06] ps-4 pe-11 text-base font-medium text-white transition [color-scheme:dark] hover:bg-white/[0.09] ${focusRing}`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#161616] text-white">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
      </div>
    </div>
  );
}

/** Language and currency (as dropdowns) and the credit history — kept off the profile itself. */
export function ProfileSettings() {
  const t = useTranslations('profilePage');
  const tx = useTranslations('profileExtras');
  const params = useParams();
  const pathname = usePathname();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user, updateProfile } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [historyOpen, setHistoryOpen] = React.useState(false);

  if (!user) return null;

  const changeLanguage = (code: string) => {
    if (code === locale) return;
    // Saved first, so the next app launch (and the middleware) opens in this language.
    // updateProfile also writes the NEXT_LOCALE cookie and the cached user.
    updateProfile({ preferred_language: code as Locale });
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
    void fetch('/api/v1/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLocale: code }),
      keepalive: true,
    }).catch(() => undefined);
    // Full load: every part of the page (and the PWA manifest/lang/dir) switches together.
    window.location.assign(localizedPath(pathname, code) + window.location.search);
  };

  return (
    <div className={pageWrap}>
      <PageHeader title={t('settings')} subtitle={t('settingsSub')} back={{ href: `/${locale}/profile` }} />

      <ProfileSection title={t('langCurrency')}>
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <SelectField label={t('language')} value={locale} onChange={changeLanguage} options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))} />
          <SelectField label={t('currency')} value={currency} onChange={(c) => setCurrency(c as typeof currency)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        </div>
      </ProfileSection>

      <ProfileSection title={tx('creditHistory')} hint={tx('balance', { count: user.credits_balance })}>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          aria-expanded={historyOpen}
          aria-controls="credit-history"
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-gold-500 transition hover:text-gold-300 ${focusRing}`}
        >
          {tx('creditHistory')}
          <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
        </button>
        {historyOpen && (
          <div id="credit-history" className="mt-2 max-w-3xl">
            <CreditHistory />
          </div>
        )}
      </ProfileSection>
    </div>
  );
}
