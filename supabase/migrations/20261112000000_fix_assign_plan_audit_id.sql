-- admin_audit_log.id is BIGINT (identity) in the live database, not UUID.
-- The live table also has a NOT NULL admin_role column, so it is set to 'super_admin'.
-- Let the table generate the id and return it as text so this works for either type.
-- The live admin_audit_log.admin_id FK points at the renamed profiles_legacy_20261104 table.
-- Re-point it at the current profiles table (NOT VALID: old rows may reference legacy ids).
ALTER TABLE public.admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_admin_id_fkey;
ALTER TABLE public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) NOT VALID;

-- Other admin functions (verify shop, ban, adjust credits, deposits) and the PIN login also
-- insert into admin_audit_log without admin_role. Give the column a default so they all work.
ALTER TABLE public.admin_audit_log ALTER COLUMN admin_role SET DEFAULT 'super_admin';

CREATE OR REPLACE FUNCTION public.admin_assign_plan(
    p_admin_id UUID, p_shop_id UUID, p_plan_code TEXT, p_credits INT, p_duration_days INT,
    p_paid_cents INT, p_currency TEXT, p_method TEXT, p_notes TEXT, p_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_shop shops%ROWTYPE;
    v_new_balance INT;
    v_expires TIMESTAMPTZ;
    v_audit TEXT;
    v_plan pricing_plans%ROWTYPE;
    v_has_plan BOOLEAN := FALSE;
BEGIN
    IF p_credits IS NULL OR p_credits < 1 OR p_credits > 50000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
    END IF;
    IF p_plan_code <> 'CUSTOM' THEN
        SELECT * INTO v_plan FROM pricing_plans WHERE code = p_plan_code;
        v_has_plan := FOUND;
    END IF;
    SELECT * INTO v_shop FROM shops WHERE id = p_shop_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SHOP_NOT_FOUND');
    END IF;

    v_new_balance := v_shop.credits_balance + p_credits;
    v_expires := NOW() + make_interval(days => p_duration_days);

    UPDATE shops
       SET credits_balance = v_new_balance,
           current_plan_code = CASE WHEN v_has_plan THEN p_plan_code ELSE current_plan_code END,
           plan_expires_at = v_expires,
           watermark_enabled = CASE WHEN v_has_plan THEN v_plan.watermark_enabled ELSE watermark_enabled END,
           max_devices = CASE WHEN v_has_plan THEN v_plan.max_devices ELSE max_devices END,
           updated_at = NOW()
     WHERE id = p_shop_id;

    INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, description)
    VALUES (v_shop.owner_id, p_shop_id, p_credits, v_new_balance, 'PLAN_ASSIGNED',
            format('Manual billing: %s (+%s credits, %s %s via %s)', p_plan_code, p_credits, p_paid_cents / 100.0, p_currency, p_method));

    INSERT INTO admin_audit_log (admin_id, admin_role, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, 'super_admin', 'ASSIGN_PLAN', 'shops', p_shop_id,
            jsonb_build_object('credits', v_shop.credits_balance, 'plan', v_shop.current_plan_code, 'expiresAt', v_shop.plan_expires_at),
            jsonb_build_object('credits', v_new_balance, 'plan', p_plan_code, 'expiresAt', v_expires,
                               'paidAmountCents', p_paid_cents, 'currency', p_currency, 'method', p_method, 'notes', p_notes),
            p_ip)
    RETURNING id::text INTO v_audit;

    RETURN jsonb_build_object('success', true, 'newCreditsBalance', v_new_balance,
                              'planExpiresAt', v_expires, 'auditLogId', v_audit);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_plan(UUID, UUID, TEXT, INT, INT, INT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_plan(UUID, UUID, TEXT, INT, INT, INT, TEXT, TEXT, TEXT, TEXT) TO service_role;
