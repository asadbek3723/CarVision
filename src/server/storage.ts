import { createAdminClient } from '@/lib/supabase/server';
import { isAllowedRemoteImageUrl } from '@/server/providers/ai/direct-fitment-engine';
import { sniffImage } from '@/server/providers/ai/image-info';
import { cropToAspect } from '@/server/image-fit';

const BUCKET = 'generations';
const MAX_BYTES = 15 * 1024 * 1024;

interface DecodedImage {
  buffer: Buffer;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

async function decodeImage(source: string): Promise<DecodedImage | null> {
  let buffer: Buffer | null = null;
  const dataMatch = source.match(/^data:image\/(?:jpeg|png|webp);base64,(.+)$/i);
  if (dataMatch) {
    buffer = Buffer.from(dataMatch[1] ?? '', 'base64');
  } else if (source.startsWith('https://') && isAllowedRemoteImageUrl(source)) {
    const res = await fetch(source, { signal: AbortSignal.timeout(15_000), redirect: 'error' });
    if (!res.ok) return null;
    buffer = Buffer.from(await res.arrayBuffer());
  }
  if (!buffer || buffer.length === 0 || buffer.length > MAX_BYTES) return null;
  // The real format comes from the bytes, never from a label: a provider answer that is not an
  // image (HTML error page, truncated text) must not be stored, shown, or charged for.
  const contentType = sniffImage(buffer);
  return contentType ? { buffer, contentType } : null;
}

export type PersistResult = { ok: true; url: string } | { ok: false; reason: 'invalid' | 'upload' };

/**
 * Persists a rendered image into the public `generations` bucket and returns its
 * permanent URL. Provider URLs expire, so every finished render is copied here.
 * `invalid` = the provider's answer is not a real image; `upload` = storage failed (one retry is made).
 */
export async function persistGenerationImage(
  userId: string,
  generationId: string,
  source: string,
  /** Width / height of the customer's photo: the render is cropped to it (centred) when it differs. */
  photoAspect: number | null = null
): Promise<PersistResult> {
  let decoded: DecodedImage | null;
  try {
    decoded = await decodeImage(source);
  } catch {
    return { ok: false, reason: 'upload' };
  }
  if (!decoded) return { ok: false, reason: 'invalid' };
  decoded = { ...decoded, ...(await cropToAspect(decoded.buffer, decoded.contentType, photoAspect)) };

  const ext = decoded.contentType === 'image/png' ? 'png' : decoded.contentType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${generationId}.${ext}`;
  const db = createAdminClient();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { error } = await db.storage.from(BUCKET).upload(path, decoded.buffer, {
        contentType: decoded.contentType,
        upsert: true,
        cacheControl: '31536000',
      });
      if (!error) return { ok: true, url: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
      console.error('generation upload failed:', error.message);
    } catch (err) {
      console.error('generation upload error:', err instanceof Error ? err.message : 'unknown');
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
  }
  return { ok: false, reason: 'upload' };
}
