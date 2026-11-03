-- CarVision: secure credits, auth support, generation storage
-- Migration: 20261103000000_secure_credits_auth.sql
--
-- Idempotent: safe to run several times in the Supabase SQL Editor.
-- Does NOT require the earlier migrations to have been applied in full; it creates
-- (IF NOT EXISTS) every table the application code relies on and hardens the rest.
--
-- To make yourself super admin AFTER registering in the app (replace the phone):
--   update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"super_admin"}'::jsonb
--     where id = (select id from public.profiles where phone = '+998901234567');
--   update public.profiles set role = 'super_admin' where phone = '+998901234567';

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Helper functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), 'anonymous');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT public.current_user_role() = 'super_admin';
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Tables (created only when missing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pricing_plans (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_cents INT NOT NULL CHECK (price_cents >= 0),
    credits INT NOT NULL CHECK (credits >= 0),
    duration_days INT NOT NULL DEFAULT 30 CHECK (duration_days > 0),
    watermark_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    max_devices INT NOT NULL DEFAULT 1 CHECK (max_devices >= 1),
    max_custom_items INT NOT NULL DEFAULT 10 CHECK (max_custom_items >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'b2c_user'
        CHECK (role IN ('b2c_user', 'b2b_seller', 'super_admin')),
    full_name VARCHAR(150),
    phone VARCHAR(30) UNIQUE NOT NULL,
    preferred_locale VARCHAR(5) NOT NULL DEFAULT 'uz',
    credits_balance INT NOT NULL DEFAULT 40 CHECK (credits_balance >= 0),
    device_fingerprint_initial TEXT,
    referred_by_shop_id UUID,
    is_fraud_suspect BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    banned_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
    shop_name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    exact_address VARCHAR(250) NOT NULL DEFAULT '',
    geo_lat DOUBLE PRECISION NOT NULL DEFAULT 0,
    geo_lng DOUBLE PRECISION NOT NULL DEFAULT 0,
    phone VARCHAR(30) NOT NULL,
    logo_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    current_plan_code VARCHAR(30) NOT NULL DEFAULT 'FREE_TRIAL' REFERENCES public.pricing_plans(code),
    plan_expires_at TIMESTAMPTZ,
    credits_balance INT NOT NULL DEFAULT 40 CHECK (credits_balance >= 0),
    watermark_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_devices INT NOT NULL DEFAULT 1 CHECK (max_devices >= 1),
    customer_view_pin_hash TEXT,
    referral_code VARCHAR(32) UNIQUE NOT NULL,
    rating_avg NUMERIC(3,2) NOT NULL DEFAULT 5.00,
    rating_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID,
    angle_id INT,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    shop_id UUID REFERENCES public.shops(id),
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
    preview_url TEXT,
    output_1080p_url TEXT,
    output_4k_url TEXT,
    is_night_mode BOOLEAN NOT NULL DEFAULT FALSE,
    credits_charged INT NOT NULL DEFAULT 1,
    idempotency_key UUID NOT NULL UNIQUE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    action_type VARCHAR(30) NOT NULL,
    generation_id UUID REFERENCES public.generations(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id),
    action VARCHAR(50) NOT NULL,
    target_entity VARCHAR(50) NOT NULL,
    target_id UUID,
    payload_before JSONB,
    payload_after JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind VARCHAR(30) NOT NULL,
    login_key TEXT NOT NULL,
    ip VARCHAR(64),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(30) NOT NULL,
    code_hash TEXT NOT NULL,
    purpose VARCHAR(20) NOT NULL DEFAULT 'register',
    attempts INT NOT NULL DEFAULT 0,
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. Column additions / relaxations on pre-existing tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_credits_granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.shops    ADD COLUMN IF NOT EXISTS free_credits_granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.shops ALTER COLUMN exact_address SET DEFAULT '';
ALTER TABLE public.shops ALTER COLUMN geo_lat SET DEFAULT 0;
ALTER TABLE public.shops ALTER COLUMN geo_lng SET DEFAULT 0;

ALTER TABLE public.generations ALTER COLUMN session_id DROP NOT NULL;
ALTER TABLE public.generations ALTER COLUMN angle_id DROP NOT NULL;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS angle_key TEXT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS cache_key TEXT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS parts JSONB;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS duration_ms INT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS credit_state TEXT NOT NULL DEFAULT 'NONE';

ALTER TABLE public.generations DROP CONSTRAINT IF EXISTS generations_credit_state_check;
ALTER TABLE public.generations ADD CONSTRAINT generations_credit_state_check
    CHECK (credit_state IN ('NONE', 'RESERVED', 'COMMITTED', 'REFUNDED'));

ALTER TABLE public.credit_ledger DROP CONSTRAINT IF EXISTS credit_ledger_action_type_check;
ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_action_type_check
    CHECK (action_type IN (
        'TRIAL_BONUS', 'MONTHLY_FREE', 'PLAN_ASSIGNED', 'RESERVED', 'COMMITTED',
        'REFUNDED', 'REFERRAL_REWARD', 'ADMIN_ADJUSTMENT'
    ));

CREATE INDEX IF NOT EXISTS idx_generations_cache ON public.generations(user_id, cache_key) WHERE status = 'COMPLETED';
CREATE INDEX IF NOT EXISTS idx_generations_user_created ON public.generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON public.credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_key ON public.login_attempts(login_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON public.login_attempts(ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON public.otp_codes(phone, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Seed plans (never overwrites edits made by the admin)
-- ---------------------------------------------------------------------------
INSERT INTO public.pricing_plans (code, name, price_cents, credits, duration_days, watermark_enabled, max_devices, max_custom_items)
VALUES
    ('FREE_TRIAL', 'Free', 0, 40, 30, TRUE, 1, 10),
    ('PRO_800', 'Workshop Pro', 2900, 800, 30, FALSE, 2, 200),
    ('MAX_4000', 'Workshop Max', 9900, 4000, 30, FALSE, 4, 1000),
    ('ULTRA_10000', 'Enterprise Ultra', 19900, 10000, 30, FALSE, 8, 10000),
    ('CUSTOM', 'Custom', 0, 0, 30, FALSE, 8, 10000)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Guard triggers: clients can never change money/role/plan columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_privileged_caller()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  -- NULL jwt = direct SQL (SQL editor / migrations); service_role = server code.
  SELECT COALESCE(auth.jwt() ->> 'role', 'service_role') IN ('service_role', 'supabase_admin');
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_privileged_caller() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.credits_balance IS DISTINCT FROM OLD.credits_balance
       OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
       OR NEW.banned_reason IS DISTINCT FROM OLD.banned_reason
       OR NEW.is_fraud_suspect IS DISTINCT FROM OLD.is_fraud_suspect
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.phone_verified IS DISTINCT FROM OLD.phone_verified
       OR NEW.free_credits_granted_at IS DISTINCT FROM OLD.free_credits_granted_at
       OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Protected profile columns cannot be modified by clients';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_update BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

CREATE OR REPLACE FUNCTION public.guard_shop_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_privileged_caller() THEN
    IF NEW.credits_balance IS DISTINCT FROM OLD.credits_balance
       OR NEW.current_plan_code IS DISTINCT FROM OLD.current_plan_code
       OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.watermark_enabled IS DISTINCT FROM OLD.watermark_enabled
       OR NEW.max_devices IS DISTINCT FROM OLD.max_devices
       OR NEW.rating_avg IS DISTINCT FROM OLD.rating_avg
       OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
       OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
       OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
       OR NEW.free_credits_granted_at IS DISTINCT FROM OLD.free_credits_granted_at THEN
      RAISE EXCEPTION 'Protected shop columns cannot be modified by clients';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_shop_update ON public.shops;
CREATE TRIGGER trg_guard_shop_update BEFORE UPDATE ON public.shops
    FOR EACH ROW EXECUTE FUNCTION public.guard_shop_update();

-- Ledger rows are append-only
CREATE OR REPLACE FUNCTION public.ledger_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Server-side cascades (account deletion) are allowed; clients never reach here.
  IF NOT public.is_privileged_caller() THEN
    RAISE EXCEPTION 'credit_ledger is append-only';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_no_update ON public.credit_ledger;
CREATE TRIGGER trg_ledger_no_update BEFORE UPDATE OR DELETE ON public.credit_ledger
    FOR EACH ROW EXECUTE FUNCTION public.ledger_append_only();

-- ---------------------------------------------------------------------------
-- 6. Atomic credit functions (service_role only)
-- ---------------------------------------------------------------------------
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

CREATE OR REPLACE FUNCTION public.commit_credits(
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
BEGIN
    SELECT credit_state INTO v_state FROM generations
     WHERE id = p_generation_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Generation not found';
    END IF;
    IF v_state <> 'RESERVED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_RESERVED', 'state', v_state);
    END IF;
    UPDATE generations SET credit_state = 'COMMITTED' WHERE id = p_generation_id;
    RETURN jsonb_build_object('success', true);
END;
$$;

-- Monthly free credits: top up FREE_TRIAL owners to the plan quota once per 30 days
CREATE OR REPLACE FUNCTION public.claim_monthly_credits(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_quota INT;
    v_shop shops%ROWTYPE;
    v_profile profiles%ROWTYPE;
    v_new INT;
BEGIN
    SELECT credits INTO v_quota FROM pricing_plans WHERE code = 'FREE_TRIAL';
    v_quota := COALESCE(v_quota, 40);

    SELECT * INTO v_shop FROM shops WHERE owner_id = p_user_id FOR UPDATE;
    IF FOUND THEN
        IF v_shop.current_plan_code = 'FREE_TRIAL'
           AND v_shop.free_credits_granted_at <= NOW() - INTERVAL '30 days' THEN
            v_new := GREATEST(v_shop.credits_balance, v_quota);
            UPDATE shops SET credits_balance = v_new, free_credits_granted_at = NOW(), updated_at = NOW()
             WHERE id = v_shop.id;
            IF v_new > v_shop.credits_balance THEN
                INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, description)
                VALUES (p_user_id, v_shop.id, v_new - v_shop.credits_balance, v_new, 'MONTHLY_FREE', 'Monthly free credits');
            END IF;
            RETURN jsonb_build_object('granted', v_new > v_shop.credits_balance, 'balance', v_new);
        END IF;
        RETURN jsonb_build_object('granted', false, 'balance', v_shop.credits_balance);
    END IF;

    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('granted', false, 'balance', 0);
    END IF;
    IF v_profile.free_credits_granted_at <= NOW() - INTERVAL '30 days' THEN
        v_new := GREATEST(v_profile.credits_balance, v_quota);
        UPDATE profiles SET credits_balance = v_new, free_credits_granted_at = NOW(), updated_at = NOW()
         WHERE id = p_user_id;
        IF v_new > v_profile.credits_balance THEN
            INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, description)
            VALUES (p_user_id, NULL, v_new - v_profile.credits_balance, v_new, 'MONTHLY_FREE', 'Monthly free credits');
        END IF;
        RETURN jsonb_build_object('granted', v_new > v_profile.credits_balance, 'balance', v_new);
    END IF;
    RETURN jsonb_build_object('granted', false, 'balance', v_profile.credits_balance);
END;
$$;

-- Admin plan assignment: one transaction for balance + ledger + audit log
CREATE OR REPLACE FUNCTION public.admin_assign_plan(
    p_admin_id UUID,
    p_shop_id UUID,
    p_plan_code TEXT,
    p_credits INT,
    p_duration_days INT,
    p_paid_cents INT,
    p_currency TEXT,
    p_method TEXT,
    p_notes TEXT,
    p_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_shop shops%ROWTYPE;
    v_new_balance INT;
    v_expires TIMESTAMPTZ;
    v_audit UUID := gen_random_uuid();
    v_plan pricing_plans%ROWTYPE;
BEGIN
    IF p_credits IS NULL OR p_credits < 1 OR p_credits > 50000 THEN
        RAISE EXCEPTION 'Invalid credits amount';
    END IF;
    SELECT * INTO v_plan FROM pricing_plans WHERE code = p_plan_code;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown plan';
    END IF;
    SELECT * INTO v_shop FROM shops WHERE id = p_shop_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SHOP_NOT_FOUND');
    END IF;

    v_new_balance := v_shop.credits_balance + p_credits;
    v_expires := NOW() + make_interval(days => p_duration_days);

    UPDATE shops
       SET credits_balance = v_new_balance,
           current_plan_code = p_plan_code,
           plan_expires_at = v_expires,
           watermark_enabled = v_plan.watermark_enabled,
           max_devices = v_plan.max_devices,
           updated_at = NOW()
     WHERE id = p_shop_id;

    INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, description)
    VALUES (v_shop.owner_id, p_shop_id, p_credits, v_new_balance, 'PLAN_ASSIGNED',
            format('Manual billing: %s (+%s credits, %s %s via %s)', p_plan_code, p_credits, p_paid_cents / 100.0, p_currency, p_method));

    INSERT INTO admin_audit_log (id, admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (v_audit, p_admin_id, 'ASSIGN_PLAN', 'shops', p_shop_id,
            jsonb_build_object('credits', v_shop.credits_balance, 'plan', v_shop.current_plan_code, 'expiresAt', v_shop.plan_expires_at),
            jsonb_build_object('credits', v_new_balance, 'plan', p_plan_code, 'expiresAt', v_expires,
                               'paidAmountCents', p_paid_cents, 'currency', p_currency, 'method', p_method, 'notes', p_notes),
            p_ip);

    RETURN jsonb_build_object('success', true, 'newCreditsBalance', v_new_balance,
                              'planExpiresAt', v_expires, 'auditLogId', v_audit);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_credits(UUID, UUID, INT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollback_credits(UUID, UUID, INT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_credits(UUID, UUID, INT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_monthly_credits(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_assign_plan(UUID, UUID, TEXT, INT, INT, INT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(UUID, UUID, INT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rollback_credits(UUID, UUID, INT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_credits(UUID, UUID, INT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_monthly_credits(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_plan(UUID, UUID, TEXT, INT, INT, INT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active pricing plans" ON public.pricing_plans;
CREATE POLICY "Public can view active pricing plans" ON public.pricing_plans
    FOR SELECT USING (is_active = TRUE OR public.is_super_admin());

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_super_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Public can view verified shops" ON public.shops;
CREATE POLICY "Public can view verified shops" ON public.shops
    FOR SELECT USING (owner_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "Shop owners can update own shop" ON public.shops;
CREATE POLICY "Shop owners can update own shop" ON public.shops
    FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users and shops can view own generations" ON public.generations;
CREATE POLICY "Users and shops can view own generations" ON public.generations
    FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "Users can view own credit ledger" ON public.credit_ledger;
CREATE POLICY "Users can view own credit ledger" ON public.credit_ledger
    FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "Only super admins can view audit log" ON public.admin_audit_log;
CREATE POLICY "Only super admins can view audit log" ON public.admin_audit_log
    FOR SELECT USING (public.is_super_admin());

-- login_attempts / otp_codes: no policies at all => only service_role can touch them
REVOKE ALL ON public.login_attempts FROM anon, authenticated;
REVOKE ALL ON public.otp_codes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.generations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.credit_ledger FROM anon, authenticated;
REVOKE INSERT, DELETE ON public.profiles FROM anon, authenticated;
REVOKE INSERT, DELETE ON public.shops FROM anon, authenticated;
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;

-- Direct client-side booking inserts would let a user pick their own status/deposit.
DO $$
BEGIN
    IF to_regclass('public.bookings') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings';
        EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.bookings FROM anon, authenticated';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Storage bucket for rendered images (public read, server-only write)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('generations', 'generations', TRUE, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
   SET public = TRUE, file_size_limit = 15728640,
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
