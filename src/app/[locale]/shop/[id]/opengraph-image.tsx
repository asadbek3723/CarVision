import { ImageResponse } from 'next/og';
import { getPublishedItem } from '@/server/catalog-public';

export const alt = 'CarVision product';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function ProductOpengraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getPublishedItem(id);
  const name = item ? `${item.brand ? `${item.brand} ` : ''}${item.name}` : 'CarVision';
  const cover = item?.coverImageUrl ?? item?.images[0]?.url ?? null;
  const price = item ? `$${item.priceUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0A0B0F', color: '#fff', fontFamily: 'sans-serif' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: cover ? 640 : 1200,
            padding: 64,
          }}
        >
          <div style={{ fontSize: 30, letterSpacing: 6, color: '#D4AE62', textTransform: 'uppercase' }}>CarVision</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: name.length > 40 ? 52 : 68, fontWeight: 700, lineHeight: 1.1 }}>{name.slice(0, 70)}</div>
            {item ? (
              <div style={{ fontSize: 28, marginTop: 16, color: 'rgba(255,255,255,0.55)' }}>{item.categoryLabel}</div>
            ) : null}
          </div>
          {price ? <div style={{ fontSize: 64, fontWeight: 700, color: '#E6C687' }}>{price}</div> : <div />}
        </div>
        {cover ? (
          <img src={cover} alt="" width={560} height={630} style={{ width: 560, height: 630, objectFit: 'cover' }} />
        ) : null}
      </div>
    ),
    size
  );
}
