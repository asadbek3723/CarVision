import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401, ipOf } from '@/server/admin';
import { BANNER_SLOTS, cleanBannerLink, isBannerSlot, readBanner, type BannerSlot } from '@/server/banners';
import { CATALOG_BUCKET } from '@/server/catalog';
import { sniffImage } from '@/server/providers/ai/image-info';

export const dynamic = 'force-dynamic';

/** The browser shrinks the picture first; this is only the safety net (Vercel's body limit is ~4.5MB). */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;

const bad = (error: string, code = 'INVALID_INPUT', status = 400) => NextResponse.json({ success: false, code, error }, { status });

/** The storage path of one of our own banner pictures, or null for anything else. */
function ownPath(url: string): string | null {
  const marker = `/storage/v1/object/public/${CATALOG_BUCKET}/`;
  const i = url.indexOf(marker);
  const path = i >= 0 ? url.slice(i + marker.length) : '';
  return path.startsWith('banners/') ? path : null;
}

/** Writes the audit row; returns false when it could not be written (the caller then refuses). */
async function audit(adminId: string, action: string, before: unknown, after: unknown, ip: string): Promise<boolean> {
  const { error } = await createAdminClient().from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_entity: 'app_banners',
    payload_before: before ?? null,
    payload_after: after ?? null,
    ip_address: ip,
  });
  if (error) console.error('banner audit failed:', error.message);
  return !error;
}

/** The current banner of a slot for the editor (also an inactive one). */
export async function GET(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  const slot = request.nextUrl.searchParams.get('slot') ?? 'shop';
  if (!isBannerSlot(slot)) return bad('Noto‘g‘ri joy');

  const read = await readBanner(slot, false);
  if (!read.ok) {
    return read.reason === 'not_ready'
      ? bad('Baza hali tayyor emas: 20261115000000_app_banners.sql migratsiyasini ishga tushiring', 'BANNERS_NOT_READY', 503)
      : bad('Serverda xatolik', 'INTERNAL', 500);
  }
  return NextResponse.json({ success: true, banner: read.banner });
}

const putSchema = z
  .object({
    slot: z.enum(BANNER_SLOTS),
    image: z.string().max(5_000_000).optional(),
    linkUrl: z.string().max(600).nullable().optional(),
    alt: z.string().trim().max(160).optional(),
    isActive: z.boolean(),
  })
  .strict();

/** Sets or updates the banner: a new picture is optional once one exists. */
export async function PUT(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad('Ma’lumotlar noto‘g‘ri');
  const { slot, image, alt, isActive } = parsed.data;

  const link = cleanBannerLink(parsed.data.linkUrl);
  if (link === 'invalid') return bad('Havola https:// bilan yoki / bilan boshlanishi kerak', 'INVALID_LINK');

  const current = await readBanner(slot, false);
  if (!current.ok) {
    return current.reason === 'not_ready'
      ? bad('Baza hali tayyor emas: 20261115000000_app_banners.sql migratsiyasini ishga tushiring', 'BANNERS_NOT_READY', 503)
      : bad('Serverda xatolik', 'INTERNAL', 500);
  }
  const before = current.banner;

  try {
    const db = createAdminClient();
    let imageUrl = before?.imageUrl ?? '';
    let uploadedPath: string | null = null;

    if (image) {
      const m = image.match(/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!m) return bad('Faqat JPEG, PNG yoki WebP rasm yuklang', 'BAD_TYPE', 415);
      const buffer = Buffer.from(m[1] ?? '', 'base64');
      if (buffer.length > MAX_IMAGE_BYTES) return bad('Rasm hajmi 3MB dan oshmasligi kerak', 'TOO_LARGE', 413);
      // The real format comes from the bytes, never from the label the browser sent.
      const type = sniffImage(buffer);
      if (!type) return bad('Faqat JPEG, PNG yoki WebP rasm yuklang', 'BAD_TYPE', 415);

      uploadedPath = `banners/${slot}-${crypto.randomUUID()}.${EXT[type]}`;
      const { error: upErr } = await db.storage.from(CATALOG_BUCKET).upload(uploadedPath, buffer, { contentType: type, cacheControl: '31536000' });
      if (upErr) {
        console.error('banner upload failed:', upErr.message);
        return bad('Rasmni yuklab bo‘lmadi', 'UPLOAD_FAILED', 500);
      }
      imageUrl = db.storage.from(CATALOG_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
    }
    if (!imageUrl) return bad('Avval banner rasmini tanlang', 'IMAGE_REQUIRED');

    const row = {
      slot,
      image_url: imageUrl,
      link_url: link,
      alt: alt ?? before?.alt ?? '',
      is_active: isActive,
      updated_by: auth.adminId,
      updated_at: new Date().toISOString(),
    };
    // Audit first: a change that cannot be put on record is not made.
    const audited = await audit(
      auth.adminId,
      'SET_BANNER',
      before ? { slot, link: before.linkUrl, active: before.isActive } : null,
      { slot, link, active: isActive, imageChanged: Boolean(image) },
      ipOf(request)
    );
    if (!audited) {
      if (uploadedPath) await db.storage.from(CATALOG_BUCKET).remove([uploadedPath]).catch(() => undefined);
      return bad('Saqlab bo‘lmadi', 'INTERNAL', 500);
    }
    const { error } = await db.from('app_banners').upsert(row, { onConflict: 'slot' });
    if (error) {
      console.error('banner save failed:', error.message);
      if (uploadedPath) await db.storage.from(CATALOG_BUCKET).remove([uploadedPath]).catch(() => undefined);
      return bad('Saqlab bo‘lmadi', 'INTERNAL', 500);
    }

    // The replaced picture is no longer used anywhere: free the storage.
    const oldPath = uploadedPath && before ? ownPath(before.imageUrl) : null;
    if (oldPath) await db.storage.from(CATALOG_BUCKET).remove([oldPath]).catch(() => undefined);

    const saved = await readBanner(slot, false);
    return NextResponse.json({ success: true, banner: saved.ok ? saved.banner : null });
  } catch (err) {
    console.error('banner save error:', err);
    return bad('Serverda xatolik', 'INTERNAL', 500);
  }
}

/** Removes the banner and its picture. */
export async function DELETE(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  const slot = request.nextUrl.searchParams.get('slot') ?? 'shop';
  if (!isBannerSlot(slot)) return bad('Noto‘g‘ri joy');

  const current = await readBanner(slot as BannerSlot, false);
  if (!current.ok) return bad('Serverda xatolik', 'INTERNAL', 500);
  if (!current.banner) return NextResponse.json({ success: true });

  try {
    const db = createAdminClient();
    if (!(await audit(auth.adminId, 'REMOVE_BANNER', { slot, link: current.banner.linkUrl }, null, ipOf(request)))) {
      return bad('O‘chirib bo‘lmadi', 'INTERNAL', 500);
    }
    const { error } = await db.from('app_banners').delete().eq('slot', slot);
    if (error) {
      console.error('banner delete failed:', error.message);
      return bad('O‘chirib bo‘lmadi', 'INTERNAL', 500);
    }
    const path = ownPath(current.banner.imageUrl);
    if (path) await db.storage.from(CATALOG_BUCKET).remove([path]).catch(() => undefined);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('banner delete error:', err);
    return bad('Serverda xatolik', 'INTERNAL', 500);
  }
}
