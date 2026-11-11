import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { reviewBooking } from '@/server/bookings';
import {
  REJECT_REASONS,
  answerCallback,
  isAllowedAdminChat,
  loadBookingForTelegram,
  markDecided,
  parseCallbackData,
  reviewCaption,
  showRejectReasons,
  showReviewButtons,
  telegramAdminProfile,
} from '@/server/telegram';

interface TgCallbackQuery {
  id: string;
  from?: { id?: number; username?: string };
  data?: string;
  message?: { message_id: number; chat: { id: number }; caption?: string };
}

const ok = () => NextResponse.json({ ok: true });

/**
 * Telegram bot webhook: admin taps Approve / Reject under a receipt. Lives outside /api/v1/admin
 * (no PIN cookie exists here), so it is protected by Telegram's secret header AND an allowlist of
 * admin chat ids. The decision goes through the same RPC as the website admin panel.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ success: false, error: 'Webhook not configured' }, { status: 503 });
    const provided = Buffer.from(request.headers.get('x-telegram-bot-api-secret-token') ?? '');
    const expected = Buffer.from(secret);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const update = (await request.json().catch(() => null)) as { callback_query?: TgCallbackQuery } | null;
    const cq = update?.callback_query;
    if (!cq) return ok();

    // Both the person tapping and the chat holding the message must be allowed admins.
    const chatId = cq.message?.chat.id;
    if (!isAllowedAdminChat(cq.from?.id) || !isAllowedAdminChat(chatId)) {
      await answerCallback(cq.id, 'Ruxsat yo‘q');
      return ok();
    }
    const messageId = cq.message?.message_id;
    const action = parseCallbackData(cq.data);
    if (!action || chatId === undefined || messageId === undefined) {
      await answerCallback(cq.id, 'Noto‘g‘ri so‘rov');
      return ok();
    }

    if (action.kind === 'askReject') {
      await showRejectReasons(chatId, messageId, action.bookingId);
      await answerCallback(cq.id, 'Rad etish sababini tanlang');
      return ok();
    }
    if (action.kind === 'back') {
      await showReviewButtons(chatId, messageId, action.bookingId);
      await answerCallback(cq.id, '');
      return ok();
    }

    const adminId = await telegramAdminProfile(cq.from?.id);
    if (!adminId) {
      await answerCallback(cq.id, 'Telegram ID admin profiliga bog‘lanmagan (TELEGRAM_ADMIN_MAP)');
      return ok();
    }

    const approve = action.kind === 'approve';
    const reason = action.kind === 'reject' ? REJECT_REASONS[action.code] : null;
    const db = createAdminClient();
    // The review caption shows the order's so'm amount; tapping "approve" confirms that amount was received.
    let paidUzs: number | null = null;
    if (approve) {
      const { data: row } = await db.from('bookings').select('amount_uzs').eq('id', action.bookingId).maybeSingle();
      paidUzs = row?.amount_uzs === null || row?.amount_uzs === undefined ? null : Number(row.amount_uzs);
    }
    const result = await reviewBooking(db, {
      adminId,
      bookingId: action.bookingId,
      approve,
      reason,
      ip: `tg:${cq.from?.id ?? '?'}`,
      paidUzs,
    });

    const { booking } = await loadBookingForTelegram(action.bookingId);
    const base = booking ? await reviewCaption(db, booking) : (cq.message?.caption ?? '');

    if (!result.ok) {
      if (result.error === 'AMOUNT_MISMATCH') {
        await answerCallback(cq.id, 'Summa topilmadi yoki mos emas: saytdagi admin paneldan tasdiqlang');
      } else if (result.error === 'OUT_OF_STOCK') {
        await answerCallback(cq.id, `Omborda yetarli emas: ${result.item ?? ''}`.slice(0, 190));
      } else if (result.error === 'INVALID_STATE') {
        await markDecided(chatId, messageId, base, 'ℹ️ Bu chek allaqachon ko‘rib chiqilgan');
        await answerCallback(cq.id, 'Allaqachon ko‘rib chiqilgan');
      } else {
        await answerCallback(cq.id, result.error === 'NOT_FOUND' ? 'Bron topilmadi' : 'Xatolik, qayta urinib ko‘ring');
      }
      return ok();
    }

    await markDecided(chatId, messageId, base, approve ? '✅ Tasdiqlandi' : `❌ Rad etildi: ${reason}`);
    await answerCallback(cq.id, approve ? 'Tasdiqlandi' : 'Rad etildi');
    return ok();
  } catch (err) {
    console.error('Telegram webhook error:', err instanceof Error ? err.message : 'unknown');
    // 200 so Telegram doesn't hammer retries on a persistent bug.
    return ok();
  }
}
