import { createAdminClient } from '@/lib/supabase/server';
import { isAllowedRemoteImageUrl } from '@/server/providers/ai/direct-fitment-engine';

const BUCKET = 'generations';
const MAX_BYTES = 15 * 1024 * 1024;

interface DecodedImage {
  buffer: Buffer;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

async function decodeImage(source: string): Promise<DecodedImage | null> {
  const dataMatch = source.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);
  if (dataMatch) {
    const buffer = Buffer.from(dataMatch[2] ?? '', 'base64');
    if (buffer.length === 0 || buffer.length > MAX_BYTES) return null;
    return { buffer, contentType: dataMatch[1]!.toLowerCase() as DecodedImage['contentType'] };
  }
  if (source.startsWith('https://') && isAllowedRemoteImageUrl(source)) {
    const res = await fetch(source, { signal: AbortSignal.timeout(15_000), redirect: 'error' });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || '').split(';')[0]!.trim().toLowerCase();
    if (type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/webp') return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_BYTES) return null;
    return { buffer, contentType: type };
  }
  return null;
}

/**
 * Persists a rendered image into the public `generations` bucket and returns its
 * permanent URL. Provider URLs expire, so every finished render is copied here.
 * Returns null when the upload is not possible (caller falls back to the provider URL).
 */
export async function persistGenerationImage(userId: string, generationId: string, source: string): Promise<string | null> {
  try {
    const decoded = await decodeImage(source);
    if (!decoded) return null;
    const ext = decoded.contentType === 'image/png' ? 'png' : decoded.contentType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/${generationId}.${ext}`;
    const db = createAdminClient();
    const { error } = await db.storage.from(BUCKET).upload(path, decoded.buffer, {
      contentType: decoded.contentType,
      upsert: true,
      cacheControl: '31536000',
    });
    if (error) return null;
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
