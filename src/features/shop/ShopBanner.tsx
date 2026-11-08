'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProductImage } from '@/components/ui/ProductImage';

export interface ShopBannerData {
  imageUrl: string;
  linkUrl: string | null;
  alt: string;
}

/** Same shape in the shop and in the admin preview: 16:7, recommended upload 1280×560. */
export const BANNER_FRAME = 'relative aspect-[16/7] w-full overflow-hidden rounded-[20px] bg-[#161616]';

/** One request per tab: the answer is shared by every banner on the page and by later visits. */
let pending: Promise<ShopBannerData | null> | null = null;
let loaded: ShopBannerData | null | undefined;

function loadBanner(): Promise<ShopBannerData | null> {
  pending ??= fetch('/api/v1/banners?slot=shop')
    .then((r) => r.json())
    .then((d): ShopBannerData | null => {
      const b = d?.success && d.banner && typeof d.banner.imageUrl === 'string' ? d.banner : null;
      return b ? { imageUrl: b.imageUrl, linkUrl: b.linkUrl ?? null, alt: b.alt ?? '' } : null;
    })
    .catch(() => null)
    .then((b) => {
      loaded = b;
      return b;
    });
  return pending;
}

/** The advertising banner the admin set for the shop; renders nothing when there is none. */
export function ShopBanner({ className = '' }: { className?: string }) {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const [banner, setBanner] = React.useState<ShopBannerData | null | undefined>(loaded);

  React.useEffect(() => {
    let cancelled = false;
    void loadBanner().then((b) => {
      if (!cancelled) setBanner(b);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!banner) return null;

  const frame = (
    <div className={BANNER_FRAME}>
      <ProductImage src={banner.imageUrl} alt={banner.alt} sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" />
    </div>
  );
  const link = banner.linkUrl;

  return (
    <div className={className}>
      {!link ? (
        frame
      ) : link.startsWith('/') ? (
        <Link href={`/${locale}${link}`} className="block rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-[#FDC902]/70">
          {frame}
        </Link>
      ) : (
        <a href={link} target="_blank" rel="noopener noreferrer sponsored" className="block rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-[#FDC902]/70">
          {frame}
        </a>
      )}
    </div>
  );
}
