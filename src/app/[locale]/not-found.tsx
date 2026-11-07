import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <div className="min-h-screen bg-[#07080B] text-white flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-[#E6C687]">404</h1>
        <p className="text-sm text-neutral-400">{t('title')}</p>
        <Link
          href="/"
          className="inline-block rounded-full bg-gold-500 px-6 py-2.5 text-xs font-bold text-black transition-transform hover:scale-105 active:scale-95"
        >
          {t('home')}
        </Link>
      </div>
    </div>
  );
}
