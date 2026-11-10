'use client';

import { useParams } from 'next/navigation';
import { WifiOff } from 'lucide-react';
import { buttonClasses } from '@/components/ui';

const COPY: Record<string, { title: string; body: string; retry: string }> = {
  uz: { title: 'Internet yo‘q', body: 'Aloqa tiklangach davom etasiz. Olingan rasmlar yo‘qolmaydi.', retry: 'Qayta urinish' },
  ru: { title: 'Нет интернета', body: 'Продолжите, когда связь восстановится. Снятые фото сохранятся.', retry: 'Повторить' },
  en: { title: 'You are offline', body: 'Continue once you are back online. Your photos are kept.', retry: 'Try again' },
  ar: { title: 'لا يوجد اتصال بالإنترنت', body: 'تابع عند عودة الاتصال. صورك محفوظة.', retry: 'حاول مجددًا' },
  tr: { title: 'İnternet yok', body: 'Bağlantı gelince devam edin. Çektiğiniz fotoğraflar korunur.', retry: 'Tekrar dene' },
  kk: { title: 'Интернет жоқ', body: 'Байланыс қалпына келгенде жалғастырыңыз. Түсірілген суреттер сақталады.', retry: 'Қайталау' },
  ky: { title: 'Интернет жок', body: 'Байланыш калыбына келгенде улантыңыз. Тартылган сүрөттөр сакталат.', retry: 'Кайра аракет' },
  tg: { title: 'Интернет нест', body: 'Пас аз барқарор шудани алоқа идома диҳед. Аксҳо нигоҳ дошта мешаванд.', retry: 'Бори дигар' },
};

/** Precached by the service worker and shown instead of the browser's dinosaur when a page cannot load offline. */
export default function OfflinePage() {
  const params = useParams();
  const c = COPY[(params?.['locale'] as string) ?? 'uz'] ?? COPY['uz']!;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[#07080B] p-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gold-500/15 text-gold-500"><WifiOff className="h-9 w-9" /></span>
      <h1 className="text-balance font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-3xl">{c.title}</h1>
      <p className="max-w-xs text-sm text-white/55">{c.body}</p>
      <button type="button" onClick={() => window.location.reload()} className={buttonClasses({ size: 'md' })}>{c.retry}</button>
    </main>
  );
}
