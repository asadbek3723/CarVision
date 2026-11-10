import { NextResponse, type NextRequest } from 'next/server';
import { isBannerSlot, readBanner } from '@/server/banners';

/**
 * Public: the active advertising banner of a slot (`?slot=shop`), or `banner: null`.
 * Any problem (no banner, table not created yet, database down) answers `null`, so the shop
 * simply shows no banner instead of an error.
 */
export async function GET(request: NextRequest) {
  const slot = request.nextUrl.searchParams.get('slot') ?? 'shop';
  const cache = { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' };
  if (!isBannerSlot(slot)) return NextResponse.json({ success: true, banner: null }, { headers: cache });

  const read = await readBanner(slot, true);
  if (!read.ok || !read.banner) {
    return NextResponse.json({ success: true, banner: null }, { headers: read.ok ? cache : { 'Cache-Control': 'no-store' } });
  }
  const { imageUrl, linkUrl, alt, updatedAt } = read.banner;
  return NextResponse.json({ success: true, banner: { imageUrl, linkUrl, alt, updatedAt } }, { headers: cache });
}
