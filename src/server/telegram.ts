import { createAdminClient } from '@/lib/supabase/server';
import { centsToUsd } from '@/domain/catalog';

/**
 * Telegram review of booking deposits. Every function here is best-effort: a Telegram outage or a
 * missing configuration must never break the customer's receipt upload or the website admin panel.
 */

const API = 'https://api.telegram.org';

/** Reject reasons offered as buttons; the code is what travels in callback_data (64 byte limit). */
export const REJECT_REASONS = {
  b: 'Chek aniq emas (blur)',
  s: 'Summa mos kelmadi',
  d: 'Takroriy chek',
  o: 'Chek tasdiqlanmadi',
} as const;
export type RejectCode = keyof typeof REJECT_REASONS;

export type CallbackAction =
  | { kind: 'approve'; bookingId: string }
  | { kind: 'askReject'; bookingId: string }
  | { kind: 'reject'; bookingId: string; code: RejectCode }
  | { kind: 'back'; bookingId: string };

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const CALLBACK_RE = new RegExp(`^([arcx]):(${UUID})(?::([bsdo]))?$`);

export function parseCallbackData(data: string | undefined): CallbackAction | null {
  const m = CALLBACK_RE.exec(data ?? '');
  if (!m) return null;
  const [, op, bookingId, code] = m as unknown as [string, string, string, RejectCode | undefined];
  if (op === 'a' && !code) return { kind: 'approve', bookingId };
  if (op === 'r' && !code) return { kind: 'askReject', bookingId };
  if (op === 'c' && !code) return { kind: 'back', bookingId };
  if (op === 'x' && code) return { kind: 'reject', bookingId, code };
  return null;
}

export function adminChatIds(): number[] {
  return (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isSafeInteger(n) && n !== 0);
}

export function isAllowedAdminChat(id: number | undefined): boolean {
  return id !== undefined && adminChatIds().includes(id);
}

function token(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export function telegramConfigured(): boolean {
  return !!token() && adminChatIds().length > 0;
}

interface TgResult<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

async function call<T>(method: string, body: Record<string, unknown> | FormData): Promise<T | null> {
  const t = token();
  if (!t) return null;
  try {
    const isForm = body instanceof FormData;
    const res = await fetch(`${API}/bot${t}/${method}`, {
      method: 'POST',
      ...(isForm ? { body } : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json()) as TgResult<T>;
    if (!json.ok) {
      console.error(`telegram ${method} failed:`, json.description);
      return null;
    }
    return json.result ?? null;
  } catch (err) {
    // Never log the URL: it contains the bot token.
    console.error(`telegram ${method} error:`, err instanceof Error ? err.message : 'unknown');
    return null;
  }
}

const usd = (cents: number) => `$${centsToUsd(cents).toFixed(2)}`;

function reviewKeyboard(bookingId: string) {
  return { inline_keyboard: [[{ text: '✅ Tasdiqlash', callback_data: `a:${bookingId}` }, { text: '❌ Rad etish', callback_data: `r:${bookingId}` }]] };
}

function rejectKeyboard(bookingId: string) {
  const rows: Array<Array<{ text: string; callback_data: string }>> = (Object.keys(REJECT_REASONS) as RejectCode[]).map((c) => [
    { text: REJECT_REASONS[c], callback_data: `x:${bookingId}:${c}` },
  ]);
  rows.push([{ text: '⬅️ Orqaga', callback_data: `c:${bookingId}` }]);
  return { inline_keyboard: rows };
}

interface BookingForMessage {
  id: string;
  booking_number: string;
  shop_id: string;
  total_cents: number;
  deposit_cents: number;
  customer_name: string;
  customer_phone: string;
  receipt_path: string | null;
  telegram_chat_id: number | null;
  telegram_message_id: number | null;
}

async function loadBooking(bookingId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from('bookings')
    .select('id, booking_number, shop_id, total_cents, deposit_cents, customer_name, customer_phone, receipt_path, telegram_chat_id, telegram_message_id')
    .eq('id', bookingId)
    .maybeSingle();
  return { db, booking: (data as BookingForMessage | null) ?? null };
}

export async function reviewCaption(db: ReturnType<typeof createAdminClient>, b: BookingForMessage): Promise<string> {
  const { data: shop } = await db.from('shops').select('shop_name').eq('id', b.shop_id).maybeSingle();
  return [
    `🧾 Yangi chek: ${b.booking_number}`,
    `Mijoz: ${b.customer_name} (${b.customer_phone})`,
    `Ustaxona: ${(shop?.shop_name as string | undefined) ?? '—'}`,
    `Depozit: ${usd(b.deposit_cents)}  |  Jami: ${usd(b.total_cents)}`,
  ].join('\n');
}

/** Sends the receipt photo with approve/reject buttons to every configured admin chat. */
export async function sendReceiptForReview(bookingId: string): Promise<void> {
  try {
    if (!telegramConfigured()) return;
    const { db, booking } = await loadBooking(bookingId);
    if (!booking?.receipt_path) return;

    const { data: file } = await db.storage.from('receipts').download(booking.receipt_path);
    if (!file) return;
    const bytes = await file.arrayBuffer();
    const caption = await reviewCaption(db, booking);

    let first: { chatId: number; messageId: number } | null = null;
    for (const chatId of adminChatIds()) {
      const form = new FormData();
      form.set('chat_id', String(chatId));
      form.set('caption', caption);
      form.set('reply_markup', JSON.stringify(reviewKeyboard(booking.id)));
      form.set('photo', new Blob([bytes], { type: file.type || 'image/jpeg' }), 'receipt');
      const sent = await call<{ message_id: number }>('sendPhoto', form);
      if (sent && !first) first = { chatId, messageId: sent.message_id };
    }
    // Only the first chat's message is tracked for website-side sync; other chats' buttons
    // simply answer "already reviewed" if pressed later.
    if (first) await db.from('bookings').update({ telegram_chat_id: first.chatId, telegram_message_id: first.messageId }).eq('id', booking.id);
  } catch (err) {
    console.error('telegram sendReceiptForReview error:', err instanceof Error ? err.message : 'unknown');
  }
}

export async function answerCallback(callbackId: string, text: string): Promise<void> {
  await call('answerCallbackQuery', { callback_query_id: callbackId, text: text.slice(0, 190) });
}

export async function showRejectReasons(chatId: number, messageId: number, bookingId: string): Promise<void> {
  await call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: rejectKeyboard(bookingId) });
}

export async function showReviewButtons(chatId: number, messageId: number, bookingId: string): Promise<void> {
  await call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: reviewKeyboard(bookingId) });
}

/** Rewrites a review message with the final decision and removes its buttons. */
export async function markDecided(chatId: number, messageId: number, baseCaption: string, line: string): Promise<void> {
  await call('editMessageCaption', {
    chat_id: chatId,
    message_id: messageId,
    caption: `${baseCaption}\n\n${line}`.slice(0, 1024),
    reply_markup: { inline_keyboard: [] },
  });
}

/** Called after a decision made on the website so the Telegram message stops offering buttons. */
export async function syncDecisionToTelegram(bookingId: string, approved: boolean, reason?: string | null): Promise<void> {
  try {
    if (!token()) return;
    const { db, booking } = await loadBooking(bookingId);
    if (!booking?.telegram_chat_id || !booking.telegram_message_id) return;
    const caption = await reviewCaption(db, booking);
    await markDecided(booking.telegram_chat_id, booking.telegram_message_id, caption, approved ? '✅ Tasdiqlandi (sayt orqali)' : `❌ Rad etildi (sayt orqali)${reason ? `: ${reason}` : ''}`);
  } catch (err) {
    console.error('telegram sync error:', err instanceof Error ? err.message : 'unknown');
  }
}

export { loadBooking as loadBookingForTelegram };
