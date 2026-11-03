-- CarVision Atomic Credit & Financial RPC Functions
-- Migration: 20261016000002_atomic_functions.sql

-- 1. Atomic Credit Reservation
CREATE OR REPLACE FUNCTION reserve_credits(
    p_user_id UUID,
    p_shop_id UUID,
    p_amount INT,
    p_generation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INT;
    v_new_balance INT;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Reservation amount must be positive integer';
    END IF;

    -- If shop_id provided (B2B workflow), lock shop balance
    IF p_shop_id IS NOT NULL THEN
        SELECT credits_balance INTO v_current_balance
        FROM shops
        WHERE id = p_shop_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Shop not found';
        END IF;

        IF v_current_balance < p_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'currentBalance', v_current_balance);
        END IF;

        v_new_balance := v_current_balance - p_amount;

        UPDATE shops
        SET credits_balance = v_new_balance, updated_at = NOW()
        WHERE id = p_shop_id;

        INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, generation_id, description)
        VALUES (p_user_id, p_shop_id, -p_amount, v_new_balance, 'RESERVED', p_generation_id, 'Credit reserved for AI render');

        RETURN jsonb_build_object('success', true, 'balanceAfter', v_new_balance);

    -- Otherwise B2C user workflow, lock user profile balance
    ELSE
        SELECT credits_balance INTO v_current_balance
        FROM profiles
        WHERE id = p_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Profile not found';
        END IF;

        IF v_current_balance < p_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'currentBalance', v_current_balance);
        END IF;

        v_new_balance := v_current_balance - p_amount;

        UPDATE profiles
        SET credits_balance = v_new_balance, updated_at = NOW()
        WHERE id = p_user_id;

        INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, generation_id, description)
        VALUES (p_user_id, NULL, -p_amount, v_new_balance, 'RESERVED', p_generation_id, 'B2C Credit reserved for AI render');

        RETURN jsonb_build_object('success', true, 'balanceAfter', v_new_balance);
    END IF;
END;
$$;

-- 2. Atomic Credit Rollback (on timeout or error)
CREATE OR REPLACE FUNCTION rollback_credits(
    p_user_id UUID,
    p_shop_id UUID,
    p_amount INT,
    p_generation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance INT;
BEGIN
    IF p_shop_id IS NOT NULL THEN
        UPDATE shops
        SET credits_balance = credits_balance + p_amount, updated_at = NOW()
        WHERE id = p_shop_id
        RETURNING credits_balance INTO v_new_balance;

        INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, generation_id, description)
        VALUES (p_user_id, p_shop_id, p_amount, v_new_balance, 'REFUNDED', p_generation_id, 'Credit refunded due to failed generation');

        RETURN jsonb_build_object('success', true, 'balanceAfter', v_new_balance);
    ELSE
        UPDATE profiles
        SET credits_balance = credits_balance + p_amount, updated_at = NOW()
        WHERE id = p_user_id
        RETURNING credits_balance INTO v_new_balance;

        INSERT INTO credit_ledger (user_id, NULL, amount, balance_after, action_type, generation_id, description)
        VALUES (p_user_id, NULL, p_amount, v_new_balance, 'REFUNDED', p_generation_id, 'B2C Credit refunded due to failed generation');

        RETURN jsonb_build_object('success', true, 'balanceAfter', v_new_balance);
    END IF;
END;
$$;

-- 3. Atomic Credit Commit (after successful render)
CREATE OR REPLACE FUNCTION commit_credits(
    p_user_id UUID,
    p_shop_id UUID,
    p_amount INT,
    p_generation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Simply updates the ledger row action type to COMMITTED for audit log
    UPDATE credit_ledger
    SET action_type = 'COMMITTED', description = 'Credit permanently settled after successful render'
    WHERE generation_id = p_generation_id AND action_type = 'RESERVED';

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Atomic Voucher Redemption
CREATE OR REPLACE FUNCTION redeem_booking_voucher(
    p_redemption_code TEXT,
    p_shop_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_status TEXT;
    v_deposit_cents INT;
BEGIN
    SELECT id, status, deposit_amount_cents
    INTO v_booking_id, v_status, v_deposit_cents
    FROM bookings
    WHERE redemption_code = p_redemption_code AND shop_id = p_shop_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'VOUCHER_NOT_FOUND');
    END IF;

    IF v_status = 'REDEEMED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'VOUCHER_ALREADY_REDEEMED');
    END IF;

    IF v_status != 'UNLOCKED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_CONFIRMED');
    END IF;

    UPDATE bookings
    SET status = 'REDEEMED', redeemed_at = NOW()
    WHERE id = v_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'bookingId', v_booking_id,
        'depositCentsApplied', v_deposit_cents
    );
END;
$$;
