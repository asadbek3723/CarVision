'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Check, ChevronDown, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { CreditHistory } from '@/features/account/ProfileExtras';
import { ProfileSection } from '@/features/account/ProfileSection';
import { CURRENCIES, LANGUAGES, focusRing, localizedPath, pageWrap } from '@/features/account/preferences';

function Choice({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 text-start transition ${
        active ? 'bg-gold-500/10 text-gold-300' : 'text-white/75 hover:bg-white/[0.05] hover:text-white'
      } ${focusRing}`}
    >
      <span className="min-w-0 truncate text-base font-medium">{label}</span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-white/35">
        {hint}
        {active && <Check className="h-4 w-4 text-gold-500" />}
      </span>
    </button>
  );
}

/** Language, currency, credit history and sign out — kept off the profile itself. */
export function ProfileSettings() {
  const t = useTranslations('profilePage');
  const tx = useTranslations('profileExtras');
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [historyOpen, setHistoryOpen] = React.useState(false);

  if (!user) return null;

  const changeLanguage = (code: string) => {
    if (code === locale) return;
    void fetch('/api/v1/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLocale: code }),
    }).catch(() => undefined);
    router.push(localizedPath(pathname, code));
  };

  return (
    <div className={pageWrap}>
      <PageHeader title={t('settings')} subtitle={t('settingsSub')} back={{ href: `/${locale}/profile` }} />

      <ProfileSection title={t('language')}>
        <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-4">
          {LANGUAGES.map((l) => (
            <Choice key={l.code} active={l.code === locale} onClick={() => changeLanguage(l.code)} label={l.name} hint={l.code.toUpperCase()} />
          ))}
        </div>
      </ProfileSection>

      <ProfileSection title={t('currency')}>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {CURRENCIES.map((c) => (
            <Choice key={c} active={c === currency} onClick={() => setCurrency(c)} label={c} />
          ))}
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

      <ProfileSection title={t('account')}>
        <button
          type="button"
          onClick={signOut}
          className={`inline-flex min-h-11 items-center gap-3 rounded-lg text-base font-medium text-red-300/90 transition hover:text-red-300 ${focusRing}`}
        >
          <LogOut className="h-5 w-5 shrink-0 rtl:rotate-180" />
          {t('signOut')}
        </button>
      </ProfileSection>
    </div>
  );
}
