import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { calculateDepositCents } from '@/domain/money';

const createBookingSchema = z.object({
  sessionId: z.string().uuid(),
  shopId: z.string().uuid(),
  selectedInventoryIds: z.array(z.string().uuid()).min(1),
  preferredAppointmentDate: z.string().datetime(),
  customerNote: z.string().max(500).optional(),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
    const body = await request.json();
    const validated = createBookingSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            messageKey: 'errors.validation.invalid_input',
            details: validated.error.flatten(),
          },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    const { sessionId, shopId, selectedInventoryIds, preferredAppointmentDate } = validated.data;

    const userId = guard.value.userId;
    const adminSupabase = createAdminClient();

    // Prices come from the database only: never from the client, never a fallback amount.
    const { data: items } = await adminSupabase
      .from('shop_inventory')
      .select('price_cents, labor_cost_cents')
      .in('id', selectedInventoryIds)
      .eq('shop_id', shopId)
      .eq('is_active', true);

    if (!items || items.length !== new Set(selectedInventoryIds).size) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVENTORY_NOT_FOUND', messageKey: 'errors.validation.invalid_input' },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    const totalPriceCents = items.reduce((sum, item) => sum + item.price_cents + item.labor_cost_cents, 0);

    const depositAmountCents = calculateDepositCents(totalPriceCents);
    const bookingId = crypto.randomUUID();
    const bookingNumber = `CV-BKG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const redemptionCode = `${crypto.randomInt(100, 1000)}-${crypto.randomInt(100, 1000)}`;

    await adminSupabase.from('bookings').insert({
      id: bookingId,
      booking_number: bookingNumber,
      session_id: sessionId,
      user_id: userId,
      shop_id: shopId,
      total_price_cents: totalPriceCents,
      deposit_amount_cents: depositAmountCents,
      status: 'AWAITING_PAYMENT',
      redemption_code: redemptionCode,
      appointment_date: preferredAppointmentDate,
    });

    const uzsRate = 13000;
    const amountLocalFormatted = `${new Intl.NumberFormat('uz-UZ').format(
      Math.round((depositAmountCents / 100) * uzsRate)
    )} UZS`;

    return NextResponse.json(
      {
        success: true,
        data: {
          bookingId,
          bookingNumber,
          status: 'AWAITING_PAYMENT',
          totalPriceCents,
          depositAmountCents,
          paymentDetails: {
            recipientName: 'CarVision Escrow LLC',
            cardPanMasked: '8600 •••• •••• 9921',
            bankName: 'Kapitalbank',
            currency: 'UZS',
            amountLocalFormatted,
            exchangeRateUsed: uzsRate,
          },
          depositExpiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        },
        meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          messageKey: 'errors.common.server_error',
        },
        meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}
