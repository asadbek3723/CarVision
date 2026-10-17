import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminSessionToken, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

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
    // 0. Verify admin security session cookie
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifyAdminSessionToken(token)) {
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
    const adminSupabase = createAdminClient();

    // 1. Fetch current shop details
    const { data: shop, error: shopError } = await adminSupabase
      .from('shops')
      .select('id, owner_id, credits_balance, plan_expires_at')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            messageKey: 'errors.shop.not_found',
          },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 404 }
      );
    }

    const newCredits = shop.credits_balance + creditsToAdd;
    const newExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // 2. Update shop plan and credits
    await adminSupabase
      .from('shops')
      .update({
        credits_balance: newCredits,
        current_plan_code: planCode,
        plan_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shopId);

    // 3. Write to credit_ledger
    await adminSupabase.from('credit_ledger').insert({
      user_id: shop.owner_id,
      shop_id: shop.id,
      amount: creditsToAdd,
      balance_after: newCredits,
      action_type: 'PLAN_ASSIGNED',
      description: `Manual billing: ${planCode} (+${creditsToAdd} credits, ${paidAmountCents / 100} ${paymentCurrency})`,
    });

    // 4. Write immutable record to admin_audit_log
    const auditLogId = crypto.randomUUID();
    await adminSupabase.from('admin_audit_log').insert({
      id: auditLogId,
      admin_id: shop.owner_id, // Default to admin profile
      action: 'ASSIGN_PLAN',
      target_entity: 'shops',
      target_id: shopId,
      payload_before: { credits: shop.credits_balance, expiresAt: shop.plan_expires_at },
      payload_after: {
        credits: newCredits,
        expiresAt: newExpiresAt,
        paidAmountCents,
        currency: paymentCurrency,
        method: paymentMethod,
        notes: adminNotes,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        shopId,
        newCreditsBalance: newCredits,
        planExpiresAt: newExpiresAt,
        auditLogId,
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
