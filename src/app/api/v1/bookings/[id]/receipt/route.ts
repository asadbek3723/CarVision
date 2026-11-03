import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';

export const maxDuration = 30;
const MAX_BYTES = 4 * 1024 * 1024;

function sniff(buf: Buffer): { type: string; ext: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: 'image/png', ext: 'png' };
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return { type: 'image/webp', ext: 'webp' };
  return null;
}

const fail = (status: number, code: string, error: string) => NextResponse.json({ success: false, code, error }, { status });

/**
 * Receipt upload. The server stores the file itself (private bucket) and hashes it to
 * catch the same receipt being reused. It only moves the booking to the admin queue:
 * the workshop's contact details are released after the admin approves the deposit.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return fail(404, 'NOT_FOUND', 'Bron topilmadi');

    const db = createAdminClient();
    const { data: booking } = await db.from('bookings').select('id, status').eq('id', id).eq('user_id', guard.value.userId).maybeSingle();
    if (!booking) return fail(404, 'NOT_FOUND', 'Bron topilmadi');
    if (booking.status !== 'AWAITING_PAYMENT' && booking.status !== 'REJECTED') {
      return fail(409, 'INVALID_STATE', 'Bu bron uchun chek yuborib bo‘lmaydi');
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return fail(400, 'NO_FILE', 'Chek rasmini yuklang');
    if (file.size > MAX_BYTES) return fail(413, 'TOO_LARGE', 'Rasm hajmi 4MB dan oshmasligi kerak');
    const buffer = Buffer.from(await file.arrayBuffer());
    const kind = sniff(buffer);
    if (!kind) return fail(415, 'BAD_TYPE', 'Faqat JPEG, PNG yoki WebP rasm yuklang');

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const { data: dup } = await db.from('bookings').select('id').eq('receipt_hash', hash).neq('id', id).maybeSingle();
    if (dup) return fail(409, 'DUPLICATE_RECEIPT', 'Bu chek avval boshqa bronda ishlatilgan');

    const path = `${id}/${crypto.randomUUID()}.${kind.ext}`;
    const { error: upErr } = await db.storage.from('receipts').upload(path, buffer, { contentType: kind.type });
    if (upErr) {
      console.error('receipt upload failed:', upErr.message);
      return fail(500, 'UPLOAD_FAILED', 'Chekni yuklab bo‘lmadi');
    }

    const { data: updated, error } = await db
      .from('bookings')
      .update({ status: 'PENDING_ADMIN_APPROVAL', receipt_path: path, receipt_hash: hash, receipt_submitted_at: new Date().toISOString(), rejected_reason: null })
      .eq('id', id)
      .eq('user_id', guard.value.userId)
      .in('status', ['AWAITING_PAYMENT', 'REJECTED'])
      .select('id')
      .maybeSingle();
    if (error || !updated) return fail(409, 'INVALID_STATE', 'Holat o‘zgargan, sahifani yangilang');

    return NextResponse.json({ success: true, status: 'PENDING_ADMIN_APPROVAL' });
  } catch (err) {
    console.error('receipt error:', err);
    return fail(500, 'INTERNAL', 'Serverda xatolik yuz berdi');
  }
}
