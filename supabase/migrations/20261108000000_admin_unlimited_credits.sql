-- CarVision: unlimited credits for the super admin account ONLY
-- Migration: 20261108000000_admin_unlimited_credits.sql   (idempotent, safe to re-run)
--
-- Every credit spend goes through reserve_credits (SECURITY DEFINER, service_role only), so the
-- bypass lives there and cannot be reached from the browser.
--
-- An account counts as unlimited only when ALL of these hold:
--   1. auth.users.raw_app_meta_data.role = 'super_admin'   (server-set, a user cannot edit it)
--   2. public.profiles.role              = 'super_admin'   (protected by trg_guard_profile_update)
--   3. the profile is not banned
-- Anyone else (customers, garage owners, even a half-configured admin) is charged as before.

CREATE OR REPLACE FUNCTION public.is_unlimited_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
     WHERE u.id = p_user_id
       AND u.raw_app_meta_data ->> 'role' = 'super_admin'
       AND p.role = 'super_admin'
       AND p.is_banned = FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.is_unlimited_account(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_unlimited_account(UUID) TO service_role;

-- reserve_credits: identical to the previous version, plus the unlimited bypass (charges 0).
CREATE OR REPLACE FUNCTION public.reserve_credits(
    p_user_id UUID,
    p_shop_id UUID,
    p_amount INT,
    p_generation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_state TEXT;
    v_balance INT;
    v_new_balance INT;
    v_banned BOOLEAN;
    v_plan TEXT;
    v_expires TIMESTAMPTZ;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Reservation amount must be a positive integer';
    END IF;

    SELECT credit_state INTO v_state FROM generations
     WHERE id = p_generation_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Generation not found';
    END IF;
    IF v_state <> 'NONE' THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_RESERVED');
    END IF;

    SELECT is_banned INTO v_banned FROM profiles WHERE id = p_user_id;
    IF COALESCE(v_banned, TRUE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'ACCOUNT_BLOCKED');
    END IF;

    -- Super admin: never charged, never blocked by balance or plan expiry.
    IF public.is_unlimited_account(p_user_id) THEN
        IF p_shop_id IS NOT NULL THEN
            SELECT credits_balance INTO v_balance FROM shops WHERE id = p_shop_id AND owner_id = p_user_id;
        ELSE
            SELECT credits_balance INTO v_balance FROM profiles WHERE id = p_user_id;
        END IF;
        UPDATE generations SET credit_state = 'RESERVED', credits_charged = 0 WHERE id = p_generation_id;
        RETURN jsonb_build_object('success', true, 'balanceAfter', COALESCE(v_balance, 0), 'unlimited', true);
    END IF;

    IF p_shop_id IS NOT NULL THEN
        SELECT credits_balance, current_plan_code, plan_expires_at
          INTO v_balance, v_plan, v_expires
          FROM shops WHERE id = p_shop_id AND owner_id = p_user_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Shop not found for user';
        END IF;
        IF v_plan <> 'FREE_TRIAL' AND v_expires IS NOT NULL AND v_expires < NOW() THEN
            RETURN jsonb_build_object('success', false, 'error', 'PLAN_EXPIRED');
        END IF;
        IF v_balance < p_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'currentBalance', v_balance);
        END IF;
        v_new_balance := v_balance - p_amount;
        UPDATE shops SET credits_balance = v_new_balance, updated_at = NOW() WHERE id = p_shop_id;
    ELSE
        SELECT credits_balance INTO v_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
        IF v_balance < p_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'currentBalance', v_balance);
        END IF;
        v_new_balance := v_balance - p_amount;
        UPDATE profiles SET credits_balance = v_new_balance, updated_at = NOW() WHERE id = p_user_id;
    END IF;

    UPDATE generations SET credit_state = 'RESERVED', credits_charged = p_amount WHERE id = p_generation_id;

    INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, generation_id, description)
    VALUES (p_user_id, p_shop_id, -p_amount, v_new_balance, 'RESERVED', p_generation_id, 'Credit reserved for AI render');

    RETURN jsonb_build_object('success', true, 'balanceAfter', v_new_balance);
END;
$$;

-- rollback_credits: a free (0 credit) reservation has nothing to refund, so no ledger noise.
CREATE OR REPLACE FUNCTION public.rollback_credits(
    p_user_id UUID,
    p_shop_id UUID,
    p_amount INT,
    p_generation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_state TEXT;
    v_charged INT;
    v_shop UUID;
    v_new_balance INT;
BEGIN
    SELECT credit_state, credits_charged, shop_id INTO v_state, v_charged, v_shop
      FROM generations WHERE id = p_generation_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Generation not found';
    END IF;
    IF v_state <> 'RESERVED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOTHING_TO_REFUND', 'state', v_state);
    END IF;

    IF COALESCE(v_charged, 0) = 0 THEN
        UPDATE generations SET credit_state = 'REFUNDED' WHERE id = p_generation_id;
        RETURN jsonb_build_object('success', true, 'unlimited', true);
    END IF;

    -- Refund exactly what was reserved, never the caller-supplied amount.
    IF v_shop IS NOT NULL THEN
        UPDATE shops SET credits_balance = credits_balance + v_charged, updated_at = NOW()
         WHERE id = v_shop RETURNING credits_balance INTO v_new_balance;
    ELSE
        UPDATE profiles SET credits_balance = credits_balance + v_charged, updated_at = NOW()
         WHERE id = p_user_id RETURNING credits_balance INTO v_new_balance;
    END IF;

    UPDATE generations SET credit_state = 'REFUNDED' WHERE id = p_generation_id;

    INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, generation_id, description)
    VALUES (p_user_id, v_shop, v_charged, v_new_balance, 'REFUNDED', p_generation_id, 'Credit refunded: generation failed');

    RETURN jsonb_build_object('success', true, 'balanceAfter', v_new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_credits(UUID, UUID, INT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollback_credits(UUID, UUID, INT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(UUID, UUID, INT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rollback_credits(UUID, UUID, INT, UUID) TO service_role;
