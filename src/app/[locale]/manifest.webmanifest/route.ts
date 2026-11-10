import { NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { APP_BACKGROUND, APP_THEME } from '@/lib/pwa-theme';
import { SEO_COPY } from '@/lib/seo/copy';
import { DEFAULT_LOCALE, SITE_NAME, isLocale } from '@/lib/seo/site';


export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const SHORTCUTS: Record<string, { customize: [string, string]; shop: [string, string]; profile: [string, string] }> = {
  uz: { customize: ['Mashinamni sozlash', 'Mashinani suratga oling va detallarni sinang'], shop: ['Do‘kon', 'Mos detallarni toping'], profile: ['Profil', 'Bronlar va kreditlar'] },
  ru: { customize: ['Подобрать для авто', 'Сфотографируйте авто и примерьте детали'], shop: ['Магазин', 'Найдите подходящие детали'], profile: ['Профиль', 'Заказы и кредиты'] },
  en: { customize: ['Customize my car', 'Take a photo and try parts on it'], shop: ['Shop', 'Find parts that fit'], profile: ['Profile', 'Bookings and credits'] },
  ar: { customize: ['خصّص سيارتي', 'صوّر سيارتك وجرّب القطع'], shop: ['المتجر', 'اعثر على القطع المناسبة'], profile: ['الملف الشخصي', 'الحجوزات والرصيد'] },
  tr: { customize: ['Aracımı özelleştir', 'Aracın fotoğrafını çek, parçaları dene'], shop: ['Mağaza', 'Uygun parçaları bul'], profile: ['Profil', 'Rezervasyonlar ve krediler'] },
  kk: { customize: ['Көлігімді таңдау', 'Көлікті суретке түсіріп, бөлшектерді сынаңыз'], shop: ['Дүкен', 'Сай бөлшектерді табыңыз'], profile: ['Профиль', 'Брондар мен кредиттер'] },
  ky: { customize: ['Унаамды тандоо', 'Унааны сүрөткө тартып, тетиктерди сынаңыз'], shop: ['Дүкөн', 'Ылайыктуу тетиктерди табыңыз'], profile: ['Профиль', 'Брондор жана кредиттер'] },
  tg: { customize: ['Мошинамро танзим кунед', 'Мошинро аксбардорӣ карда, қисмҳоро санҷед'], shop: ['Мағоза', 'Қисмҳои мувофиқро ёбед'], profile: ['Профил', 'Брон ва кредитҳо'] },
};

/**
 * One web app manifest per language, so the home-screen name, description and long-press shortcuts
 * match the language the app was installed from. Every one shares the same `id`, so it is one app.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const sc = SHORTCUTS[l] ?? SHORTCUTS['uz']!;
  const icon = [{ src: '/icons/icon-192.png?v=2', sizes: '192x192', type: 'image/png' }];
  const shot = (n: number, label: string) => ({
    src: `/screenshots/shot-${n}.png`,
    sizes: '1080x1920',
    type: 'image/png',
    form_factor: 'narrow',
    label,
  });

  const manifest = {
    id: '/',
    name: `${SITE_NAME} — AI Tuning`,
    short_name: SITE_NAME,
    description: SEO_COPY[l].home.description,
    lang: l,
    dir: l === 'ar' ? 'rtl' : 'ltr',
    start_url: `/${l}/seller?source=pwa`,
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    // No `orientation`: the camera needs landscape, everything else follows the phone.
    background_color: APP_BACKGROUND,
    theme_color: APP_THEME,
    prefer_related_applications: false,
    icons: [
      { src: '/icons/icon-192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [shot(1, SITE_NAME), shot(2, sc.shop[0]), shot(3, sc.customize[0])],
    categories: ['automotive', 'shopping', 'business'],
    shortcuts: [
      { name: sc.customize[0], short_name: sc.customize[0].slice(0, 12), url: `/${l}/customize?source=shortcut`, description: sc.customize[1], icons: icon },
      { name: sc.shop[0], short_name: sc.shop[0], url: `/${l}/shop?source=shortcut`, description: sc.shop[1], icons: icon },
      { name: sc.profile[0], short_name: sc.profile[0], url: `/${l}/profile?source=shortcut`, description: sc.profile[1], icons: icon },
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
