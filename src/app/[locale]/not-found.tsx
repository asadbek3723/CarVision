import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <div className="min-h-dvh bg-[#07080B] text-white flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gold-300">404</h1>
        <p className="text-sm text-neutral-400">{t('title')}</p>
        <Link
          href="/"
          className={buttonClasses({ size: 'sm' })}
        >
          {t('home')}
        </Link>
      </div>
    </div>
  );
}
