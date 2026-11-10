import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { centsToUsd } from '@/domain/catalog';
import { notifyUser } from '@/server/push';
import { CANCEL_REFUND_BPS, CANCEL_WINDOW_HOURS, cancelRefundCents } from '@/domain/money';

type Db = ReturnType<typeof createAdminClient>;

export function newBookingNumber(): string {
  return `CV-${crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase()}`;
}

/**
 * The so'm amount to pay (cards in Uzbekistan are paid in so'm). Orders store the exact amount
 * fixed when they were created; only very old orders fall back to today's rate.
 */
export function withUzs<T extends { payUSD: number; payUZS: number | null }>(dtos: T[], uzsRate: number): Array<T & { payUZS: number }> {
  return dtos.map((b) => ({ ...b, payUZS: b.payUZS ?? Math.round(b.payUSD * uzsRate) }));
}

/** Unpaid orders are closed after this many hours (nothing was paid, nothing to refund). */
export const UNPAID_EXPIRY_HOURS = 48;

/** Closes stale unpaid orders. Cheap and idempotent; called lazily from the order lists. */
export async function expireUnpaid(db: Db): Promise<void> {
  const { error } = await db.rpc('expire_unpaid_bookings', { p_hours: UNPAID_EXPIRY_HOURS });
  if (error) console.warn('expire_unpaid_bookings failed:', error.message);
}

/** When the workshop payout may be sent: right away once handed over, else after the cancel window. */
export function payoutAllowedFrom(r: Pick<BookingRow, 'status' | 'unlocked_at'>): string | null {
  if (r.status === 'REDEEMED' || !r.unlocked_at) return null;
  return new Date(new Date(r.unlocked_at).getTime() + CANCEL_WINDOW_HOURS * 3600_000).toISOString();
}

export function newRedemptionCode(): string {
  return `${crypto.randomInt(100, 1000)}-${crypto.randomInt(100, 1000)}`;
}

/** Where customers send the payment. Configured in env; never hard-coded or invented. */
export function paymentDetails(): { cardNumber: string; holder: string; bank: string } | null {
  const cardNumber = process.env.ESCROW_CARD_NUMBER?.trim();
  const holder = process.env.ESCROW_CARD_HOLDER?.trim();
  if (!cardNumber || !holder) return null;
  return { cardNumber, holder, bank: process.env.ESCROW_BANK?.trim() || '' };
}

export type ReviewResult = { ok: true; status: string } | { ok: false; error: 'NOT_FOUND' | 'INVALID_STATE' | 'OUT_OF_STOCK' | 'FAILED'; item?: string };

/** Single confirmation point for payments: used by the website admin panel and the Telegram bot. */
export async function reviewBooking(
  db: Db,
  args: {
    adminId: string;
    bookingId: string;
    approve: boolean;
    reason?: string | null | undefined;
    ip: string;
    /** So'm amount actually seen on the receipt / bank statement. */
    paidUzs?: number | null | undefined;
    /** Bank transaction id from the receipt. */
    reference?: string | null | undefined;
  }
): Promise<ReviewResult> {
  const { data, error } = await db.rpc('admin_review_booking', {
    p_admin_id: args.adminId,
    p_booking_id: args.bookingId,
    p_approve: args.approve,
    p_reason: args.reason ?? null,
    p_ip: args.ip.slice(0, 45),
    p_paid_uzs: args.paidUzs ?? null,
    p_reference: args.reference ?? null,
  });
  const r = data as { success?: boolean; error?: string; status?: string; item?: string } | null;
  if (error || !r) {
    if (error) console.error('admin_review_booking failed:', error.message);
    return { ok: false, error: 'FAILED' };
  }
  if (r.success) {
    await pushBookingEvent(db, args.bookingId, args.approve ? 'approved' : 'rejected');
    return { ok: true, status: r.status ?? '' };
  }
  if (r.error === 'OUT_OF_STOCK') return { ok: false, error: 'OUT_OF_STOCK', ...(r.item ? { item: r.item } : {}) };
  return { ok: false, error: r.error === 'INVALID_STATE' ? 'INVALID_STATE' : 'NOT_FOUND' };
}

/**
 * Tells the people involved in an order about a change, by push notification (best effort: it never
 * throws and never blocks the change itself). `approved` also tells the workshop it has a new paid order.
 */
export async function pushBookingEvent(db: Db, bookingId: string, event: 'approved' | 'rejected' | 'refund_done' | 'payout_paid'): Promise<void> {
  try {
    const { data: b } = await db.from('bookings').select('user_id, shop_id').eq('id', bookingId).maybeSingle();
    if (!b) return;
    const customerPath = `/profile/bookings/${bookingId}`;
    if (event === 'approved') {
      await notifyUser(b.user_id as string, 'order_approved', { path: customerPath, tag: `order-${bookingId}` });
    } else if (event === 'rejected') {
      await notifyUser(b.user_id as string, 'order_rejected', { path: customerPath, tag: `order-${bookingId}` });
    } else if (event === 'refund_done') {
      await notifyUser(b.user_id as string, 'refund_done', { path: customerPath, tag: `order-${bookingId}` });
    }
    if (event === 'approved' || event === 'payout_paid') {
      const { data: shop } = await db.from('shops').select('owner_id').eq('id', b.shop_id as string).maybeSingle();
      if (shop?.owner_id) {
        await notifyUser(shop.owner_id as string, event === 'approved' ? 'new_paid_order' : 'payout_paid', { path: `/seller/orders/${bookingId}`, tag: `shop-order-${bookingId}` });
      }
    }
  } catch (err) {
    console.warn('pushBookingEvent failed', err);
  }
}

export type BookingStatus = 'AWAITING_PAYMENT' | 'PENDING_ADMIN_APPROVAL' | 'UNLOCKED' | 'REDEEMED' | 'REJECTED' | 'CANCELLED';

export interface BookingDTO {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  /** The full price; this is also exactly what the customer pays. */
  totalUSD: number;
  /** The amount to transfer to the payment card (equals totalUSD). */
  payUSD: number;
  /** Exact so'm amount fixed at order time (null on very old orders). */
  payUZS: number | null;
  createdAt: string;
  rejectedReason: string | null;
  /** Until when a paid purchase can still be cancelled (null when it cannot). */
  cancellableUntil: string | null;
  /** Amount returned if cancelled now; only present while cancellable or once cancelled after payment. */
  refundUSD: number | null;
  refundDone: boolean;
  items: Array<{ name: string; brand: string; image: string | null; unitUSD: number; quantity: number }>;
  /** Contact details appear only after the payment is approved. */
  workshop: {
    label: string;
    unlocked: boolean;
    name?: string;
    phone?: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  redemptionCode: string | null;
}

export const BOOKING_COLUMNS =
  'id, booking_number, user_id, shop_id, status, total_cents, amount_cents, commission_cents, payout_cents, payout_status, payout_paid_at, cancelled_at, refund_cents, refund_status, refunded_at, redemption_code, customer_name, customer_phone, customer_note, rejected_reason, created_at, unlocked_at, redeemed_at, receipt_path, receipt_hash, receipt_submitted_at, amount_uzs, fx_rate, paid_amount_uzs, bank_reference';

export type PayoutStatus = 'NONE' | 'PENDING' | 'PAID' | 'VOID';
export type RefundStatus = 'NONE' | 'PENDING' | 'DONE';

export interface BookingRow {
  id: string;
  booking_number: string;
  user_id: string;
  shop_id: string;
  status: BookingStatus;
  total_cents: number;
  /** What the customer transfers (full price; 3% on bookings from the old deposit model). */
  amount_cents: number;
  /** Internal split. NULL on bookings from the old deposit model. Never sent to customers. */
  commission_cents: number | null;
  payout_cents: number | null;
  payout_status: PayoutStatus;
  payout_paid_at: string | null;
  cancelled_at: string | null;
  refund_cents: number | null;
  refund_status: RefundStatus;
  refunded_at: string | null;
  redemption_code: string;
  customer_name: string;
  customer_phone: string;
  customer_note: string | null;
  rejected_reason: string | null;
  created_at: string;
  unlocked_at: string | null;
  redeemed_at: string | null;
  receipt_path: string | null;
  receipt_hash: string | null;
  receipt_submitted_at: string | null;
  /** So'm amount the customer was asked to pay, fixed at order time. */
  amount_uzs: number | null;
  fx_rate: number | null;
  /** So'm amount the admin confirmed on approval. */
  paid_amount_uzs: number | null;
  bank_reference: string | null;
}

export async function fetchBookingRows(db: Db, filter: { userId?: string | undefined; shopId?: string | undefined; id?: string | undefined; ids?: string[] | undefined; statuses?: BookingStatus[] | undefined; limit?: number | undefined }): Promise<BookingRow[]> {
  let q = db.from('bookings').select(BOOKING_COLUMNS).order('created_at', { ascending: false }).limit(filter.limit ?? 100);
  if (filter.userId) q = q.eq('user_id', filter.userId);
  if (filter.shopId) q = q.eq('shop_id', filter.shopId);
  if (filter.id) q = q.eq('id', filter.id);
  if (filter.ids?.length) q = q.in('id', filter.ids);
  if (filter.statuses?.length) q = q.in('status', filter.statuses);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as BookingRow[];
}

export async function fetchBookingItems(db: Db, bookingIds: string[]) {
  if (bookingIds.length === 0) return [];
  const { data } = await db.from('booking_items').select('booking_id, name, brand, image_url, unit_cents, quantity').in('booking_id', bookingIds);
  return (data ?? []) as Array<{ booking_id: string; name: string; brand: string | null; image_url: string | null; unit_cents: number; quantity: number }>;
}

/** End of the customer's cancel window for a paid purchase, or null when it cannot be cancelled. */
export function cancellableUntil(r: BookingRow, now = Date.now()): string | null {
  if (r.status !== 'UNLOCKED' || r.payout_cents === null || r.payout_status !== 'PENDING' || !r.unlocked_at) return null;
  const until = new Date(r.unlocked_at).getTime() + CANCEL_WINDOW_HOURS * 3600_000;
  return until > now ? new Date(until).toISOString() : null;
}

export type CancelResult = { ok: true; refundCents: number } | { ok: false; error: 'NOT_FOUND' | 'CANNOT_CANCEL' | 'FAILED' };

/** Customer cancels a paid purchase inside the window; the database re-checks every rule. */
export async function cancelPurchase(db: Db, userId: string, bookingId: string): Promise<CancelResult> {
  const { data, error } = await db.rpc('customer_cancel_purchase', {
    p_user_id: userId,
    p_booking_id: bookingId,
    p_window_hours: CANCEL_WINDOW_HOURS,
    p_refund_bps: CANCEL_REFUND_BPS,
  });
  const r = data as { success?: boolean; error?: string; refundCents?: number } | null;
  if (error || !r) return { ok: false, error: 'FAILED' };
  if (r.success) return { ok: true, refundCents: r.refundCents ?? 0 };
  return { ok: false, error: r.error === 'NOT_FOUND' ? 'NOT_FOUND' : 'CANNOT_CANCEL' };
}

/** Customer-facing view of bookings (contact details only after approval, no internal split). */
export async function toCustomerDTOs(db: Db, rows: BookingRow[]): Promise<BookingDTO[]> {
  if (rows.length === 0) return [];
  const items = await fetchBookingItems(db, rows.map((r) => r.id));
  const shopIds = [...new Set(rows.map((r) => r.shop_id))];
  const { data: shops } = await db.from('shops').select('id, shop_name, phone, city, district, exact_address, geo_lat, geo_lng').in('id', shopIds);
  const shopById = new Map((shops ?? []).map((s) => [s.id as string, s]));

  return rows.map((r) => {
    const unlocked = r.status === 'UNLOCKED' || r.status === 'REDEEMED';
    const shop = shopById.get(r.shop_id);
    const label = `Verified Partner #${r.shop_id.slice(0, 4).toUpperCase()}`;
    const until = cancellableUntil(r);
    return {
      id: r.id,
      bookingNumber: r.booking_number,
      status: r.status,
      totalUSD: centsToUsd(r.total_cents),
      payUSD: centsToUsd(r.amount_cents),
      payUZS: r.amount_uzs !== null ? Number(r.amount_uzs) : null,
      createdAt: r.created_at,
      rejectedReason: r.rejected_reason,
      cancellableUntil: until,
      refundUSD: until ? centsToUsd(cancelRefundCents(r.amount_cents)) : r.refund_cents !== null ? centsToUsd(r.refund_cents) : null,
      refundDone: r.refund_status === 'DONE',
      items: items
        .filter((i) => i.booking_id === r.id)
        .map((i) => ({ name: i.name, brand: i.brand ?? '', image: i.image_url, unitUSD: centsToUsd(i.unit_cents), quantity: i.quantity })),
      workshop:
        unlocked && shop
          ? {
              label,
              unlocked: true,
              name: shop.shop_name as string,
              phone: shop.phone as string,
              address: [shop.exact_address, shop.district, shop.city].filter(Boolean).join(', '),
              lat: Number(shop.geo_lat) || 0,
              lng: Number(shop.geo_lng) || 0,
            }
          : { label, unlocked: false },
      redemptionCode: unlocked ? r.redemption_code : null,
    };
  });
}
