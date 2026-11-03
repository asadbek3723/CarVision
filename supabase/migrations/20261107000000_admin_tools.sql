-- CarVision: admin tools (credits adjustment, ban, shop verification), all audited
-- Migration: 20261107000000_admin_tools.sql   (idempotent)
-- Requires 20261103000000_secure_credits_auth.sql

-- The older admin_audit_log table (created before this app) has no ip_address column, which made
-- admin_assign_plan / admin_review_booking fail. Make sure every column the functions write exists.
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS payload_before JSONB;
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS payload_after JSONB;
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Manual credit grant/removal for a user (shop owners adjust the shop balance, others the profile balance)
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
    p_admin_id UUID, p_user_id UUID, p_amount INT, p_reason TEXT, p_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_shop shops%ROWTYPE;
    v_profile profiles%ROWTYPE;
    v_before INT;
    v_after INT;
BEGIN
    IF p_amount IS NULL OR p_amount = 0 OR abs(p_amount) > 100000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
    END IF;
    IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'REASON_REQUIRED');
    END IF;

    SELECT * INTO v_shop FROM shops WHERE owner_id = p_user_id FOR UPDATE;
    IF FOUND THEN
        v_before := v_shop.credits_balance;
        v_after := v_before + p_amount;
        IF v_after < 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'NEGATIVE_BALANCE', 'balance', v_before);
        END IF;
        UPDATE shops SET credits_balance = v_after, updated_at = NOW() WHERE id = v_shop.id;
        INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, description)
        VALUES (p_user_id, v_shop.id, p_amount, v_after, 'ADMIN_ADJUSTMENT', left(p_reason, 300));
    ELSE
        SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
        END IF;
        v_before := v_profile.credits_balance;
        v_after := v_before + p_amount;
        IF v_after < 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'NEGATIVE_BALANCE', 'balance', v_before);
        END IF;
        UPDATE profiles SET credits_balance = v_after, updated_at = NOW() WHERE id = p_user_id;
        INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, description)
        VALUES (p_user_id, NULL, p_amount, v_after, 'ADMIN_ADJUSTMENT', left(p_reason, 300));
    END IF;

    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, 'ADJUST_CREDITS', 'profiles', p_user_id,
            jsonb_build_object('credits', v_before),
            jsonb_build_object('credits', v_after, 'delta', p_amount, 'reason', p_reason), p_ip);

    RETURN jsonb_build_object('success', true, 'balanceAfter', v_after);
END;
$$;

-- Block / unblock an account. An admin can never block another super admin or themselves.
CREATE OR REPLACE FUNCTION public.admin_set_ban(
    p_admin_id UUID, p_user_id UUID, p_banned BOOLEAN, p_reason TEXT, p_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile profiles%ROWTYPE;
BEGIN
    IF p_admin_id = p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'CANNOT_BAN_SELF');
    END IF;
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;
    IF v_profile.role = 'super_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'CANNOT_BAN_ADMIN');
    END IF;
    UPDATE profiles
       SET is_banned = p_banned,
           banned_reason = CASE WHEN p_banned THEN left(COALESCE(p_reason, 'Admin tomonidan bloklandi'), 300) ELSE NULL END,
           updated_at = NOW()
     WHERE id = p_user_id;
    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, CASE WHEN p_banned THEN 'BAN_USER' ELSE 'UNBAN_USER' END, 'profiles', p_user_id,
            jsonb_build_object('is_banned', v_profile.is_banned),
            jsonb_build_object('is_banned', p_banned, 'reason', p_reason), p_ip);
    RETURN jsonb_build_object('success', true, 'banned', p_banned);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_shop_verified(
    p_admin_id UUID, p_shop_id UUID, p_verified BOOLEAN, p_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_before BOOLEAN;
BEGIN
    SELECT is_verified INTO v_before FROM shops WHERE id = p_shop_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SHOP_NOT_FOUND');
    END IF;
    UPDATE shops SET is_verified = p_verified, updated_at = NOW() WHERE id = p_shop_id;
    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, CASE WHEN p_verified THEN 'VERIFY_SHOP' ELSE 'UNVERIFY_SHOP' END, 'shops', p_shop_id,
            jsonb_build_object('is_verified', v_before), jsonb_build_object('is_verified', p_verified), p_ip);
    RETURN jsonb_build_object('success', true, 'verified', p_verified);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_credits(UUID, UUID, INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_ban(UUID, UUID, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_shop_verified(UUID, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(UUID, UUID, INT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_ban(UUID, UUID, BOOLEAN, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_shop_verified(UUID, UUID, BOOLEAN, TEXT) TO service_role;
