import { createAdminClient } from '@/lib/supabase/server';

export const BANNER_SLOTS = ['shop'] as const;
export type BannerSlot = (typeof BANNER_SLOTS)[number];

export interface BannerRow {
  slot: BannerSlot;
  imageUrl: string;
  linkUrl: string | null;
  alt: string;
  isActive: boolean;
  updatedAt: string;
}

export type BannerRead = { ok: true; banner: BannerRow | null } | { ok: false; reason: 'not_ready' | 'error' };

export function isBannerSlot(value: unknown): value is BannerSlot {
  return typeof value === 'string' && (BANNER_SLOTS as readonly string[]).includes(value);
}

/** Postgres "undefined_table" or PostgREST "table not in schema cache": the migration has not been applied yet. */
function tableMissing(error: { code?: string; message?: string }): boolean {
  const message = error.message ?? '';
  return error.code === '42P01' || error.code === 'PGRST205' || (/app_banners/.test(message) && /does not exist|schema cache/i.test(message));
}

/** The slot's banner, or null when none is set. `onlyActive` is for the public side. */
export async function readBanner(slot: BannerSlot, onlyActive: boolean): Promise<BannerRead> {
  try {
    let query = createAdminClient().from('app_banners').select('slot, image_url, link_url, alt, is_active, updated_at').eq('slot', slot);
    if (onlyActive) query = query.eq('is_active', true);
    const { data, error } = await query.maybeSingle();
    if (error) {
      if (tableMissing(error)) return { ok: false, reason: 'not_ready' };
      console.error('banner read failed:', error.message);
      return { ok: false, reason: 'error' };
    }
    if (!data) return { ok: true, banner: null };
    return {
      ok: true,
      banner: {
        slot: data.slot as BannerSlot,
        imageUrl: data.image_url as string,
        linkUrl: (data.link_url as string | null) ?? null,
        alt: (data.alt as string) ?? '',
        isActive: Boolean(data.is_active),
        updatedAt: data.updated_at as string,
      },
    };
  } catch (err) {
    console.error('banner read error:', err instanceof Error ? err.message : 'unknown');
    return { ok: false, reason: 'error' };
  }
}

/**
 * A banner may open an https address or a page inside the app (/shop/123). Anything else
 * (javascript:, data:, //host) is rejected so an admin typo can never become a script link.
 */
export function cleanBannerLink(raw: string | null | undefined): string | null | 'invalid' {
  const v = (raw ?? '').trim();
  if (!v) return null;
  if (v.length > 500) return 'invalid';
  if (v.startsWith('/') && !v.startsWith('//') && !v.includes('\\')) return v;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' ? u.toString() : 'invalid';
  } catch {
    return 'invalid';
  }
}
