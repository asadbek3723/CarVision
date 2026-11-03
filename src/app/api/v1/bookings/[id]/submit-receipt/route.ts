import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';

const submitReceiptSchema = z.object({
  receiptStoragePath: z.string().min(5),
  receiptSha256: z.string().length(64),
}).strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
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
      .select('id, status')
      .eq('id', bookingId)
      .eq('user_id', guard.value.userId)
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

    if (booking.status !== 'AWAITING_PAYMENT') {
      return NextResponse.json(
        { success: false, error: { code: 'BOOKING_STATE_INVALID', messageKey: 'errors.booking.invalid_state' } },
        { status: 409 }
      );
    }

    // A receipt only moves the booking to the admin approval queue. The shop's contact
    // details are released after approval, never by the client's own upload.
    await adminSupabase
      .from('bookings')
      .update({
        status: 'PENDING_ADMIN_APPROVAL',
        receipt_image_path: receiptStoragePath,
        receipt_image_hash: receiptSha256,
      })
      .eq('id', bookingId)
      .eq('user_id', guard.value.userId);

    return NextResponse.json({
      success: true,
      data: { bookingId, status: 'PENDING_ADMIN_APPROVAL', verificationMethod: 'ADMIN_REVIEW' },
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
