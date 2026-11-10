import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';
import { sendSupportRequest, telegramConfigured, tgEscape } from '@/server/telegram';
import { centsToUsd } from '@/domain/catalog';
import { SUPPORT_TOPICS, type SupportTopic } from '@/features/account/support-topics';

export const runtime = 'nodejs';

const TOPIC_LABEL: Record<SupportTopic, string> = {
  order: '📦 Buyurtma',
  payment: '💳 To‘lov / chek',
  render: '🎨 Vizualizatsiya (render)',
  account: '👤 Hisob va kirish',
  seller: '🏪 Ustaxona (sotuvchi)',
  bug: '🐞 Texnik nosozlik',
  other: '💬 Boshqa',
};

const ROLE_LABEL: Record<string, string> = { b2c_user: 'Mijoz', b2b_seller: 'Ustaxona egasi', super_admin: 'Admin' };

const STATUS_LABEL: Record<string, string> = {
  AWAITING_PAYMENT: 'To‘lov kutilmoqda',
  PENDING_ADMIN_APPROVAL: 'Chek tekshirilmoqda',
  UNLOCKED: 'Sotib olindi',
  REDEEMED: 'Topshirildi',
  REJECTED: 'Rad etilgan',
  CANCELLED: 'Bekor qilingan',
};

const schema = z.object({
  topic: z.enum(SUPPORT_TOPICS),
  message: z.string().trim().min(10).max(2000),
  bookingId: z.string().uuid().optional(),
  page: z.string().max(300).optional(),
  device: z.string().max(300).optional(),
  locale: z.string().max(8).optional(),
});

const MAX_PHOTO = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const HOURLY_LIMIT = 5;

const fail = (status: number, code: string, error: string) => NextResponse.json({ success: false, code, error }, { status });

function tashkentTime(d: Date): string {
  if (Number.isNaN(d.getTime())) return '—';
  const t = new Date(d.getTime() + 5 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(t.getUTCDate())}.${p(t.getUTCMonth() + 1)}.${t.getUTCFullYear()} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}

/** Sends a help-centre request to the admins' Telegram chats together with the account's details. */
export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { userId, role, profile, shop, plan } = guard.value;

  if (!telegramConfigured()) return fail(503, 'SUPPORT_UNAVAILABLE', 'Qo‘llab-quvvatlash vaqtincha ishlamayapti');

  const form = await request.formData().catch(() => null);
  if (!form) return fail(400, 'INVALID_INPUT', 'Ma’lumot noto‘g‘ri');
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === 'string' && v.trim() ? v : undefined;
  };
  const parsed = schema.safeParse({
    topic: str('topic'),
    message: str('message'),
    bookingId: str('bookingId'),
    page: str('page'),
    device: str('device'),
    locale: str('locale'),
  });
  if (!parsed.success) return fail(400, 'INVALID_INPUT', 'Muammoni kamida 10 belgida yozing');
  const input = parsed.data;

  const file = form.get('photo');
  let photo: { bytes: ArrayBuffer; type: string; name: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (!PHOTO_TYPES.has(file.type)) return fail(400, 'BAD_FILE_TYPE', 'Faqat JPG, PNG yoki WEBP rasm');
    if (file.size > MAX_PHOTO) return fail(400, 'FILE_TOO_LARGE', 'Rasm 5 MB dan oshmasin');
    photo = { bytes: await file.arrayBuffer(), type: file.type, name: 'screenshot' };
  }

  const ip = clientIp(request);
  const key = `support:${userId}`;
  if ((await recentFailures('login_key', key, 'support', 60 * 60 * 1000, true)) >= HOURLY_LIMIT) {
    return fail(429, 'RATE_LIMITED', 'Juda ko‘p murojaat. Birozdan keyin urinib ko‘ring');
  }

  const e = (v: string | null | undefined) => (v ? tgEscape(v) : '—');

  // Only the user's own order may be attached.
  let bookingLines: string[] = [];
  if (input.bookingId) {
    const db = createAdminClient();
    const { data: b } = await db
      .from('bookings')
      .select('booking_number, status, total_cents, created_at, shop_id, user_id')
      .eq('id', input.bookingId)
      .maybeSingle();
    if (b && b.user_id === userId) {
      const { data: s } = await db.from('shops').select('shop_name, phone').eq('id', b.shop_id as string).maybeSingle();
      bookingLines = [
        '',
        '<b>📦 Bog‘liq buyurtma</b>',
        `Raqam: <code>#${e(String(b.booking_number))}</code>`,
        `Holat: ${e(STATUS_LABEL[String(b.status)] ?? String(b.status))}`,
        `Summa: $${centsToUsd(Number(b.total_cents)).toFixed(2)}`,
        `Sana: ${tashkentTime(new Date(String(b.created_at)))}`,
        `Ustaxona: ${e(s?.shop_name as string | undefined)}${s?.phone ? ` (${e(String(s.phone))})` : ''}`,
        `ID: <code>${e(input.bookingId)}</code>`,
      ];
    }
  }

  const ticket = `S-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const header = [`🆘 <b>Yangi murojaat</b> · <code>${ticket}</code>`, `Mavzu: <b>${TOPIC_LABEL[input.topic]}</b>`, '', '<b>✉️ Xabar</b>'];
  const details = [
    '',
    '<b>👤 Foydalanuvchi</b>',
    `Ism: ${e(profile.full_name)}`,
    `Telefon: ${e(profile.phone)}${profile.phone_verified ? ' ✅' : ''}`,
    `Email: ${e(profile.email)}${profile.email_verified ? ' ✅' : ''}`,
    `Rol: ${e(ROLE_LABEL[role] ?? role)}`,
    `Kreditlar: ${profile.credits_balance >= 1_000_000 ? '∞' : profile.credits_balance}`,
    `Til: ${e(input.locale || profile.preferred_language)}`,
    `Ro‘yxatdan o‘tgan: ${profile.created_at ? tashkentTime(new Date(profile.created_at)) : '—'}`,
    `User ID: <code>${userId}</code>`,
    ...(shop
      ? [
          '',
          '<b>🏪 Ustaxona</b>',
          `Nomi: ${e(shop.shop_name)}`,
          `Manzil: ${e([shop.city, shop.district].filter(Boolean).join(', '))}`,
          `Telefon: ${e(shop.phone)}`,
          `Tarif: ${e(plan.code)}${plan.isPaid ? ' (faol)' : ''}${shop.is_verified ? ' · tasdiqlangan' : ''}`,
        ]
      : []),
    ...bookingLines,
    '',
    '<b>🖥 Texnik</b>',
    `Sahifa: ${e(input.page)}`,
    `Qurilma: ${e(input.device)}`,
    `IP: ${e(ip)}`,
    `Vaqt: ${tashkentTime(new Date())} (Toshkent)`,
  ];

  // Telegram caps a message at 4096 characters: shorten the user's text, never the details.
  const frame = header.join('\n').length + details.join('\n').length + 60;
  let body = tgEscape(input.message);
  if (frame + body.length > 4096) body = `${body.slice(0, Math.max(0, 4096 - frame)).replace(/&[a-z]*$/, '')}…`;
  const html = [...header, `<blockquote expandable>${body}</blockquote>`, ...details].join('\n');

  const ok = await sendSupportRequest(html, photo);
  if (!ok) return fail(502, 'SUPPORT_SEND_FAILED', 'Xabarni yuborib bo‘lmadi');

  await recordAttempt('support', key, ip, true);
  return NextResponse.json({ success: true, ticket });
}
