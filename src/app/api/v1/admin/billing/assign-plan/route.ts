import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401 } from '@/server/admin';

const adminAssignPlanSchema = z.object({
  shopId: z.string().uuid(),
  planCode: z.enum(['PRO_800', 'MAX_4000', 'ULTRA_10000', 'CUSTOM']),
  creditsToAdd: z.number().int().min(1).max(50000),
  paidAmountCents: z.number().int().min(0),
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
    const body = await request.json();
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

    const { shopId, planCode, creditsToAdd, paidAmountCents, paymentCurrency, paymentMethod, durationDays, adminNotes } = validated.data;
    const adminId = auth.adminId;

    // One database transaction: balance + ledger + audit log (see admin_assign_plan SQL function).
    const { data, error: rpcError } = await createAdminClient().rpc('admin_assign_plan', {
      p_admin_id: adminId,
      p_shop_id: shopId,
      p_plan_code: planCode,
      p_credits: creditsToAdd,
      p_duration_days: durationDays,
      p_paid_cents: paidAmountCents,
      p_currency: paymentCurrency,
      p_method: paymentMethod,
      p_notes: adminNotes,
      p_ip: (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown').slice(0, 45),
    });

    const result = data as { success?: boolean; error?: string; newCreditsBalance?: number; planExpiresAt?: string; auditLogId?: string } | null;
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
        planExpiresAt: result.planExpiresAt,
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
