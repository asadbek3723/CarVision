import { ImageResponse } from 'next/og';
import { getPublishedItem } from '@/server/catalog-public';
import { OG_COLORS, OG_FONT_FAMILY, OG_SIZE, loadOgCar, loadOgFonts } from '@/lib/og/assets';

export const alt = 'CarVision product';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** Satori (next/og) decodes only JPEG, PNG and GIF; catalog photos are mostly WebP. */
const DECODABLE = /\.(jpe?g|png|gif)(\?|$)/i;

/**
 * Product link preview in the same look as the brand one: type on black, a photo bleeding in from the right.
 * When the part's photo is WebP the brand car stands in, so the preview never shows an empty half.
 */
export default async function ProductOpengraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, fonts, car] = await Promise.all([getPublishedItem(id), loadOgFonts(), loadOgCar()]);
  const name = item ? `${item.brand ? `${item.brand} ` : ''}${item.name}` : 'CarVision';
  const photo = [item?.coverImageUrl, ...(item?.images.map((i) => i.url) ?? [])].find((u) => u && DECODABLE.test(u));
  const price = item ? `$${item.priceUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: OG_COLORS.page,
          color: OG_COLORS.text,
          fontFamily: OG_FONT_FAMILY,
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            width={700}
            height={630}
            style={{ position: 'absolute', right: 0, top: 0, width: 700, height: 630, objectFit: 'cover' }}
          />
        ) : (
          <img src={car} alt="" width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: 'absolute', inset: 0 }} />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: photo
              ? 'linear-gradient(90deg, #0A0A0A 0%, #0A0A0A 42%, rgba(10,10,10,0.55) 55%, rgba(10,10,10,0) 75%)'
              : 'linear-gradient(90deg, rgba(10,10,10,0.96) 0%, rgba(10,10,10,0.7) 34%, rgba(10,10,10,0) 58%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 76,
            top: 80,
            bottom: 80,
            width: 340,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, letterSpacing: -0.5 }}>
            <span>CAR</span>
            <span style={{ color: OG_COLORS.accent }}>VISION</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {item ? (
              <div style={{ display: 'flex', fontSize: 22, fontWeight: 500, color: OG_COLORS.muted, letterSpacing: 0.5 }}>
                {item.categoryLabel}
              </div>
            ) : null}
            <div
              style={{
                display: 'flex',
                marginTop: 14,
                fontSize: name.length > 34 ? 32 : name.length > 22 ? 38 : 46,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: -1.5,
              }}
            >
              {name.slice(0, 70)}
            </div>
            {price ? (
              <div style={{ display: 'flex', marginTop: 28, fontSize: 48, fontWeight: 700, color: OG_COLORS.accent }}>
                {price}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
