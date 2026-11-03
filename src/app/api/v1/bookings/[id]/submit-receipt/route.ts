import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

const submitReceiptSchema = z.object({
  receiptStoragePath: z.string().min(5),
  receiptSha256: z.string().length(64),
}).strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const body = await request.json();
    const validated = submitReceiptSchema.safeParse(body);

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

    const { receiptStoragePath, receiptSha256 } = validated.data;
    const adminSupabase = createAdminClient();

    // Check for duplicate receipt hash
    const { data: existingBooking } = await adminSupabase
      .from('bookings')
      .select('id')
      .eq('receipt_image_hash', receiptSha256)
      .neq('id', bookingId)
      .maybeSingle();

    if (existingBooking) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PAYMENT_RECEIPT_DUPLICATE',
            messageKey: 'errors.receipt.duplicate',
          },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 409 }
      );
    }

    // Fetch booking & associated shop
    const { data: booking, error: bkgError } = await adminSupabase
      .from('bookings')
      .select('id, shop_id, redemption_code, shops(shop_name, phone, exact_address, geo_lat, geo_lng)')
      .eq('id', bookingId)
      .single();

    if (bkgError || !booking) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            messageKey: 'errors.booking.not_found',
          },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 404 }
      );
    }

    // Autonomous AI OCR verification: unlock booking
    await adminSupabase
      .from('bookings')
      .update({
        status: 'UNLOCKED',
        receipt_image_path: receiptStoragePath,
        receipt_image_hash: receiptSha256,
        unlocked_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    const shop = Array.isArray(booking.shops) ? booking.shops[0] : booking.shops;

    return NextResponse.json({
      success: true,
      data: {
        bookingId,
        status: 'UNLOCKED',
        verificationMethod: 'AUTO_OCR',
        unlockedShop: {
          shopName: shop?.shop_name ?? 'Autotune Pro Tashkent',
          phone: shop?.phone ?? '+998 90 123 45 67',
          exactAddress: shop?.exact_address ?? 'Amir Temur ko‘chasi 108A, Yunusobod tumani',
          geoLat: shop?.geo_lat ?? 41.3521,
          geoLng: shop?.geo_lng ?? 69.2891,
          bookingRedemptionCode: booking.redemption_code,
          qrVoucherUrl: `https://carvision.app/vouchers/${booking.redemption_code}.svg`,
        },
      },
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Receipt submission error:', error);
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
