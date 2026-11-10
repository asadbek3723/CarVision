'use client';

import * as React from 'react';

const COPY: Record<string, { title: string; body: string; retry: string }> = {
  uz: { title: 'Nimadir xato ketdi', body: 'Sahifani ochib bo‘lmadi. Qayta urinib ko‘ring.', retry: 'Qayta urinish' },
  ru: { title: 'Что-то пошло не так', body: 'Не удалось открыть страницу. Попробуйте ещё раз.', retry: 'Повторить' },
  en: { title: 'Something went wrong', body: 'The page could not be opened. Please try again.', retry: 'Try again' },
  ar: { title: 'حدث خطأ ما', body: 'تعذّر فتح الصفحة. حاول مرة أخرى.', retry: 'حاول مجددًا' },
  tr: { title: 'Bir şeyler ters gitti', body: 'Sayfa açılamadı. Lütfen tekrar deneyin.', retry: 'Tekrar dene' },
  kk: { title: 'Бірдеңе дұрыс болмады', body: 'Бетті ашу мүмкін болмады. Қайталап көріңіз.', retry: 'Қайталау' },
  ky: { title: 'Бир нерсе туура эмес болду', body: 'Баракты ачуу мүмкүн болгон жок. Кайра аракет кылыңыз.', retry: 'Кайра аракет' },
  tg: { title: 'Хатое рух дод', body: 'Саҳифа кушода нашуд. Бори дигар кӯшиш кунед.', retry: 'Бори дигар' },
};

/**
 * Last resort: the root layout itself crashed, so nothing of the app (styles, translations) can be
 * relied on. Plain inline styles and its own short dictionary, like the offline page.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [locale, setLocale] = React.useState('uz');

  React.useEffect(() => {
    console.error('App crashed:', error);
    const first = window.location.pathname.split('/')[1] ?? '';
    if (COPY[first]) setLocale(first);
  }, [error]);

  const c = COPY[locale] ?? COPY['uz']!;
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: 24,
          textAlign: 'center',
          background: '#07080B',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{c.title}</h1>
        <p style={{ margin: 0, maxWidth: 320, fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>{c.body}</p>
        <button
          type="button"
          onClick={reset}
          style={{ minHeight: 48, padding: '0 24px', border: 0, borderRadius: 9999, background: '#E8BF74', color: '#0D0E12', fontSize: 15, fontWeight: 600 }}
        >
          {c.retry}
        </button>
      </body>
    </html>
  );
}
