'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Input, PageHeader, buttonClasses } from '@/components/ui';
import { useAuth } from '@/features/auth/context/AuthContext';
import { PasswordForm } from '@/features/account/ProfileExtras';
import { ProfileSection } from '@/features/account/ProfileSection';
import { initialsOf, pageWrap } from '@/features/account/preferences';

/** Edit the account: display name (phone / email are the login and stay read-only) and password. */
export function ProfileEdit() {
  const t = useTranslations('profilePage');
  const tx = useTranslations('profileExtras');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user, updateProfile } = useAuth();

  const [name, setName] = React.useState(user?.full_name ?? '');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (user?.full_name) setName(user.full_name);
  }, [user?.full_name]);

  if (!user) return null;
  const profileHref = `/${locale}/profile`;
  const contact = user.phone || user.email;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = name.trim();
    if (fullName.length < 2) return setError(true);
    if (fullName === user.full_name) return router.push(profileHref);
    setSaving(true);
    setError(false);
    try {
      const res = await fetch('/api/v1/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName }),
      });
      if (!res.ok) throw new Error('save failed');
      updateProfile({ full_name: fullName });
      router.push(profileHref);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={pageWrap}>
      <PageHeader title={t('editProfile')} subtitle={t('editSub')} back={{ href: profileHref }} />

      <div className="flex items-center gap-5 pb-4 pt-2">
        <div aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gold-gradient text-2xl font-semibold uppercase text-black md:h-24 md:w-24 md:text-3xl">
          {initialsOf(name || user.full_name)}
        </div>
        <p className="min-w-0 truncate font-heading text-xl font-semibold text-white md:text-3xl">{name.trim() || t('guest')}</p>
      </div>

      <ProfileSection title={t('nameLabel')}>
        <form onSubmit={save} className="max-w-xl space-y-4">
          <Input
            label={t('nameLabel')}
            autoComplete="name"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            error={error ? t('saveError') : undefined}
          />
          <button type="submit" disabled={saving} className={buttonClasses({ size: 'md', className: 'px-8' })}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('save')}
          </button>
        </form>
      </ProfileSection>

      {contact && (
        <ProfileSection title={t('contactLabel')} hint={t('contactHint')}>
          <p dir="ltr" className="text-lg text-white/80 rtl:text-end">{contact}</p>
        </ProfileSection>
      )}

      <ProfileSection title={t('passwordTitle')} hint={tx('security')}>
        <div className="max-w-xl">
          <PasswordForm />
        </div>
      </ProfileSection>
    </div>
  );
}
