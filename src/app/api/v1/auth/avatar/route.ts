import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';

export const dynamic = 'force-dynamic';

/**
 * Profile photos have their own public bucket. They used to live in `catalog` next to product
 * photos, and a catalog re-seed that emptied that bucket deleted every avatar with it.
 */
const BUCKET = 'avatars';
/** Where avatars were kept before; cleaned up when a user replaces or removes their photo. */
const LEGACY_BUCKET = 'catalog';
const MAX_BYTES = 1_500_000;

const fail = (status: number, code: string, error: string) => NextResponse.json({ success: false, code, error }, { status });

/** JPEG files start with FF D8 FF; the browser always sends a resized JPEG, anything else is refused. */
function isJpeg(b: Buffer): boolean {
  return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

/**
 * Profile photo. The browser crops it square, resizes it to 512 px and sends a JPEG; it is stored in the
 * public `avatars` bucket as <user id>.jpg (one file per user, replaced on every upload) and
 * its public URL is kept in the user's Supabase Auth metadata, so no database change is needed.
 */
export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const userId = guard.value.userId;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof Blob)) return fail(400, 'INVALID_INPUT', 'Rasm topilmadi');
  if (file.size > MAX_BYTES) return fail(413, 'TOO_LARGE', 'Rasm juda katta');
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isJpeg(bytes)) return fail(400, 'INVALID_IMAGE', 'Rasm formati noto‘g‘ri');

  const db = createAdminClient();
  const path = `${userId}.jpg`;
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
  if (upErr) {
    console.error('avatar upload failed:', upErr.message);
    return fail(500, 'UPLOAD_FAILED', 'Rasmni yuklab bo‘lmadi');
  }
  // A new query string on every upload, so phones and the CDN never show the old picture.
  const url = `${db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;

  const existing = await db.auth.admin.getUserById(userId);
  const meta = (existing.data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const { error } = await db.auth.admin.updateUserById(userId, { user_metadata: { ...meta, avatar_url: url } });
  if (error) {
    console.error('avatar metadata failed:', error.message);
    return fail(500, 'SAVE_FAILED', 'Saqlab bo‘lmadi');
  }
  await db.storage.from(LEGACY_BUCKET).remove([`avatars/${userId}.jpg`]).catch(() => undefined);
  return NextResponse.json({ success: true, avatar_url: url });
}

/** Removes the profile photo (the initials come back). */
export async function DELETE() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const userId = guard.value.userId;
  const db = createAdminClient();

  const existing = await db.auth.admin.getUserById(userId);
  const meta = { ...((existing.data.user?.user_metadata ?? {}) as Record<string, unknown>) };
  delete meta['avatar_url'];
  const { error } = await db.auth.admin.updateUserById(userId, { user_metadata: meta });
  if (error) return fail(500, 'SAVE_FAILED', 'Saqlab bo‘lmadi');
  await db.storage.from(BUCKET).remove([`${userId}.jpg`]).catch(() => undefined);
  await db.storage.from(LEGACY_BUCKET).remove([`avatars/${userId}.jpg`]).catch(() => undefined);
  return NextResponse.json({ success: true });
}
