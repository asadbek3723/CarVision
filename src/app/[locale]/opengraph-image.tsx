import { ImageResponse } from 'next/og';
import { DEFAULT_LOCALE, isLocale } from '@/lib/seo/site';
import { SEO_COPY } from '@/lib/seo/copy';
import { OG_COLORS, OG_FONT_FAMILY, OG_SIZE, loadOgCar, loadOgFonts } from '@/lib/og/assets';

export const alt = 'CarVision — AI car tuning visualizer';
export const size = OG_SIZE;
export const contentType = 'image/png';

/**
 * Link preview for Telegram, WhatsApp, Instagram, X, Facebook, LinkedIn (1200x630).
 * One cinematic car on the right, the wordmark and a short line on the left. No frames, cards or boxes.
 */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Satori cannot shape Arabic script, so the Arabic preview uses the English line.
  const copy = SEO_COPY[!isLocale(locale) ? DEFAULT_LOCALE : locale === 'ar' ? 'en' : locale];
  const [fonts, car] = await Promise.all([loadOgFonts(), loadOgCar()]);
  // Long single words (Cyrillic) must still fit the left column without running into the car.
  const longestWord = Math.max(...copy.tagline.split(/\s+/).map((w) => w.length));
  const headlineSize = longestWord > 14 ? 42 : longestWord > 12 ? 46 : longestWord > 10 ? 50 : 54;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: OG_COLORS.page,
          fontFamily: OG_FONT_FAMILY,
          color: OG_COLORS.text,
        }}
      >
        <img src={car} alt="" width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: 'absolute', inset: 0 }} />
        {/* Quiet the left half so the type sits on pure black, and settle the floor. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: 'linear-gradient(90deg, rgba(10,10,10,0.96) 0%, rgba(10,10,10,0.7) 34%, rgba(10,10,10,0) 58%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: 'linear-gradient(0deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0) 22%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 84,
            top: 80,
            bottom: 80,
            width: 470,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
            <span>Car</span>
            <span style={{ color: OG_COLORS.accent }}>Vision</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 48, height: 3, background: OG_COLORS.accent, marginBottom: 30 }} />
            <div
              style={{
                display: 'flex',
                fontSize: headlineSize,
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: -1.5,
              }}
            >
              {copy.tagline}
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 26,
                fontSize: 24,
                fontWeight: 500,
                color: OG_COLORS.muted,
                letterSpacing: 0.5,
              }}
            >
              {copy.ogSubline}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
