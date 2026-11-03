import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaidSeller } from '@/server/auth/guards';
import { CATALOG_BUCKET } from '@/server/catalog';

export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024; // Vercel request limit is ~4.5MB; the client compresses first

function sniff(buf: Buffer): { type: 'image/jpeg' | 'image/png' | 'image/webp'; ext: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: 'image/png', ext: 'png' };
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return { type: 'image/webp', ext: 'webp' };
  return null;
}

/** Uploads one product photo into the shop's folder and returns its public URL. */
export async function POST(request: NextRequest) {
  const guard = await requirePaidSeller();
  if (!guard.ok) return guard.response;

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: 'Fayl topilmadi' }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: 'Rasm hajmi 4MB dan oshmasligi kerak' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const kind = sniff(buffer);
    if (!kind) return NextResponse.json({ success: false, error: 'Faqat JPEG, PNG yoki WebP rasm yuklang' }, { status: 415 });

    const path = `${guard.value.shopId}/${crypto.randomUUID()}.${kind.ext}`;
    const db = createAdminClient();
    const { error } = await db.storage.from(CATALOG_BUCKET).upload(path, buffer, {
      contentType: kind.type,
      cacheControl: '31536000',
    });
    if (error) {
      console.error('catalog upload failed:', error.message);
      return NextResponse.json({ success: false, error: 'Rasmni yuklab bo‘lmadi' }, { status: 500 });
    }
    const url = db.storage.from(CATALOG_BUCKET).getPublicUrl(path).data.publicUrl;
    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error('upload error:', err);
    return NextResponse.json({ success: false, error: 'Serverda xatolik yuz berdi' }, { status: 500 });
  }
}
