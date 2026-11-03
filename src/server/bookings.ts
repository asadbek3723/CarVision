import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { centsToUsd } from '@/domain/catalog';
import { calculateDepositCents } from '@/domain/money';

type Db = ReturnType<typeof createAdminClient>;

/** Minimum deposit: $1 (the old $10 floor made small parts impossible to book). */
export function depositFor(totalCents: number): number {
  return calculateDepositCents(totalCents, 100);
}

export function newBookingNumber(): string {
  return `CV-${crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase()}`;
}

export function newRedemptionCode(): string {
  return `${crypto.randomInt(100, 1000)}-${crypto.randomInt(100, 1000)}`;
}

/** Where customers send the 3% deposit. Configured in env; never hard-coded or invented. */
export function escrowDetails(): { cardNumber: string; holder: string; bank: string } | null {
  const cardNumber = process.env.ESCROW_CARD_NUMBER?.trim();
  const holder = process.env.ESCROW_CARD_HOLDER?.trim();
  if (!cardNumber || !holder) return null;
  return { cardNumber, holder, bank: process.env.ESCROW_BANK?.trim() || '' };
}

export type ReviewResult = { ok: true; status: string } | { ok: false; error: 'NOT_FOUND' | 'INVALID_STATE' | 'FAILED' };

/** Single confirmation point for deposits: used by the website admin panel and the Telegram bot. */
export async function reviewBooking(
  db: Db,
  args: { adminId: string; bookingId: string; approve: boolean; reason?: string | null | undefined; ip: string }
): Promise<ReviewResult> {
  const { data, error } = await db.rpc('admin_review_booking', {
    p_admin_id: args.adminId,
    p_booking_id: args.bookingId,
    p_approve: args.approve,
    p_reason: args.reason ?? null,
    p_ip: args.ip.slice(0, 45),
  });
  const r = data as { success?: boolean; error?: string; status?: string } | null;
  if (error || !r) return { ok: false, error: 'FAILED' };
  if (r.success) return { ok: true, status: r.status ?? '' };
  return { ok: false, error: r.error === 'INVALID_STATE' ? 'INVALID_STATE' : 'NOT_FOUND' };
}

export type BookingStatus = 'AWAITING_PAYMENT' | 'PENDING_ADMIN_APPROVAL' | 'UNLOCKED' | 'REDEEMED' | 'REJECTED' | 'CANCELLED';

export interface BookingDTO {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  totalUSD: number;
  depositUSD: number;
  createdAt: string;
  rejectedReason: string | null;
  items: Array<{ name: string; brand: string; image: string | null; unitUSD: number; quantity: number }>;
  /** Contact details appear only after the deposit is approved. */
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

const BOOKING_COLUMNS =
  'id, booking_number, user_id, shop_id, status, total_cents, deposit_cents, redemption_code, customer_name, customer_phone, customer_note, rejected_reason, created_at, unlocked_at, redeemed_at, receipt_path, receipt_hash, receipt_submitted_at';

export interface BookingRow {
  id: string;
  booking_number: string;
  user_id: string;
  shop_id: string;
  status: BookingStatus;
  total_cents: number;
  deposit_cents: number;
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

/** Customer-facing view of bookings (contact details only after approval). */
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
    return {
      id: r.id,
      bookingNumber: r.booking_number,
      status: r.status,
      totalUSD: centsToUsd(r.total_cents),
      depositUSD: centsToUsd(r.deposit_cents),
      createdAt: r.created_at,
      rejectedReason: r.rejected_reason,
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
