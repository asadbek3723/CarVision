import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401, ipOf } from '@/server/admin';

const adminAssignPlanSchema = z.object({
  shopId: z.string().uuid(),
  planCode: z.enum(['PRO_800', 'MAX_4000', 'ULTRA_10000', 'CUSTOM']),
  /** One id per form submission: a retried or double-clicked request is applied once. */
  requestId: z.string().uuid(),
  creditsToAdd: z.number().int().min(0).max(50000),
  /** Amount x100 in the payment currency (cents, tiyin...). BIGINT on the database side. */
  paidAmountMinor: z.number().int().min(0).max(1_000_000_000_000),
  paymentReference: z.string().trim().max(120).optional(),
  paymentCurrency: z.enum(['USD', 'UZS', 'AED', 'EUR']),
  paymentMethod: z.enum(['BANK_TRANSFER', 'CASH', 'OCTO', 'CLICK_PAYME_MANUAL']),
  durationDays: z.number().int().min(1).max(365).default(30),
  adminNotes: z.string().min(3).max(500),
}).strict();

export async function POST(request: NextRequest) {
  try {
    // 0. Verify admin PIN session cookie AND that the account is still a live super_admin
    const auth = await adminLiveOr401(request);
    if ('response' in auth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED_ADMIN_SESSION',
            message: 'Ruxsat berilmagan. Admin PIN kodi orqali xavfsizlik sessiyasini tasdiqlang.',
          },
        },
        { status: 401 }
      );
    }
    const body = await request.json().catch(() => null);
    const validated = adminAssignPlanSchema.safeParse(body);

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

    const { shopId, planCode, requestId, creditsToAdd, paidAmountMinor, paymentReference, paymentCurrency, paymentMethod, durationDays, adminNotes } = validated.data;
    const adminId = auth.adminId;

    // One database transaction: balance + ledger + audit log (see admin_assign_plan SQL function).
    const { data, error: rpcError } = await createAdminClient().rpc('admin_assign_plan', {
      p_admin_id: adminId,
      p_shop_id: shopId,
      p_plan_code: planCode,
      p_credits: creditsToAdd,
      p_duration_days: durationDays,
      p_paid_minor: paidAmountMinor,
      p_currency: paymentCurrency,
      p_method: paymentMethod,
      p_notes: adminNotes,
      p_ip: ipOf(request),
      p_request_id: requestId,
      p_reference: paymentReference ?? null,
    });

    const result = data as { success?: boolean; error?: string; newCreditsBalance?: number; planCode?: string; planExpiresAt?: string; auditLogId?: string; replayed?: boolean } | null;
    if (!rpcError && result && !result.success && result.error !== 'SHOP_NOT_FOUND') {
      return NextResponse.json({ success: false, error: { code: result.error ?? 'INVALID_INPUT' } }, { status: 409 });
    }
    if (rpcError || !result?.success) {
      const notFound = result?.error === 'SHOP_NOT_FOUND';
      if (rpcError) console.error('admin_assign_plan failed:', rpcError.message);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: notFound ? 'RESOURCE_NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
            messageKey: notFound ? 'errors.shop.not_found' : 'errors.common.server_error',
          },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: notFound ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        shopId,
        newCreditsBalance: result.newCreditsBalance,
        planCode: result.planCode,
        planExpiresAt: result.planExpiresAt,
        replayed: Boolean(result.replayed),
        auditLogId: result.auditLogId,
      },
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Admin billing error:', error);
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
