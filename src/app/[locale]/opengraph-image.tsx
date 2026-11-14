import { ImageResponse } from 'next/og';
import { DEFAULT_LOCALE, isLocale } from '@/lib/seo/site';
import { SEO_COPY } from '@/lib/seo/copy';
import { OG_COLORS, OG_FONT_FAMILY, OG_SIZE, loadOgCar, loadOgFonts } from '@/lib/og/assets';

export const alt = 'CarVision — AI car tuning visualizer';
export const size = OG_SIZE;
export const contentType = 'image/png';

/**
 * Link preview for Telegram, WhatsApp, Instagram, X, Facebook, LinkedIn (1200x630).
 * A large, sharp car fills the right, the CAR / VISION wordmark holds the left. Almost no text, no boxes.
 */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Satori cannot shape Arabic script, so the Arabic preview uses the English line.
  const copy = SEO_COPY[!isLocale(locale) ? DEFAULT_LOCALE : locale === 'ar' ? 'en' : locale];
  const [fonts, car] = await Promise.all([loadOgFonts(), loadOgCar()]);

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

        <div
          style={{
            position: 'absolute',
            left: 76,
            top: 0,
            bottom: 0,
            width: 380,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, lineHeight: 0.92, letterSpacing: -2 }}>CAR</div>
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 0.92,
              letterSpacing: -2,
              color: OG_COLORS.accent,
            }}
          >
            VISION
          </div>
          <div style={{ width: 56, height: 2, background: OG_COLORS.accent, marginTop: 40, marginBottom: 22 }} />
          <div
            style={{
              display: 'flex',
              fontSize: 17,
              fontWeight: 500,
              lineHeight: 1.6,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: OG_COLORS.muted,
              width: 330,
            }}
          >
            {copy.tagline}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
