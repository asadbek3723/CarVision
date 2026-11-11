-- CarVision: security hardening (credits, sellers, database perimeter)
-- Migration: 20261120000000_security_hardening.sql   (idempotent, safe to re-run)
-- Requires every earlier migration, in particular 20261119000000_money_hardening.sql.
-- Run the WHOLE file at once (nothing selected in the SQL editor). Apply it BEFORE deploying the
-- code that ships with it: the public catalog reads the new view catalog_items_listed.
--
-- What changes
--  Credits
--   * Sign-up credits are granted by one RPC (grant_trial_credits): balance + ledger row in one
--     transaction, at most once per account. The server may withhold them (credit farming limits).
--   * Withheld accounts get no monthly top-up until their phone is verified.
--   * reserve_credits refuses a 4th render in flight for the same account (atomic, under the row lock).
--   * Admin renders (free) now leave a ledger row too.
--   * credit_ledger is append-only for EVERYONE (the server included). Deleting an account keeps
--     its history (user_id / shop_id become NULL).
--  Payments
--   * Approving a payment needs the received so'm amount, and it must cover the order amount.
--  Sellers
--   * Items of unverified workshops, or of banned owners, are not listed and cannot be bought.
--     Workshops that already have published items are kept verified so the live catalog stays.
--  Perimeter
--   * The browser never talks to the database directly (every call goes through the API with the
--     service role), so anon / authenticated lose every table, sequence and SECURITY DEFINER function
--     privilege in the public schema. A leaked anon key + user token can no longer read or write data.

BEGIN;

-- =====================================================================================
-- 1. Trial credits
-- =====================================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_withheld BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- New accounts start empty; credits only arrive through grant_trial_credits (with a ledger row).
ALTER TABLE public.profiles ALTER COLUMN credits_balance SET DEFAULT 0;
ALTER TABLE public.shops ALTER COLUMN credits_balance SET DEFAULT 0;

ALTER TABLE public.credit_ledger DROP CONSTRAINT IF EXISTS credit_ledger_action_type_check;
ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_action_type_check
    CHECK (action_type IN (
        'TRIAL_BONUS', 'MONTHLY_FREE', 'PLAN_ASSIGNED', 'RESERVED', 'COMMITTED',
        'REFUNDED', 'REFERRAL_REWARD', 'ADMIN_ADJUSTMENT', 'ADMIN_FREE_RENDER'
    )) NOT VALID;

-- Grants the sign-up credits once. p_withhold = TRUE records that they were held back (farming
-- limits) so a later phone verification can release them (claim_monthly_credits does that).
CREATE OR REPLACE FUNCTION public.grant_trial_credits(p_user_id UUID, p_amount INT, p_withhold BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_shop UUID;
    v_new INT;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000 THEN
        RAISE EXCEPTION 'Trial amount must be between 1 and 1000';
    END IF;

    PERFORM 1 FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('granted', false, 'error', 'NOT_FOUND');
    END IF;
    IF EXISTS (SELECT 1 FROM credit_ledger WHERE user_id = p_user_id AND action_type = 'TRIAL_BONUS') THEN
        RETURN jsonb_build_object('granted', false, 'error', 'ALREADY_GRANTED');
    END IF;

    IF p_withhold THEN
        UPDATE profiles SET trial_withheld = TRUE, updated_at = NOW() WHERE id = p_user_id;
        RETURN jsonb_build_object('granted', false, 'withheld', true, 'balance', 0);
    END IF;

    -- Sellers spend from the shop balance, everyone else from the profile.
    SELECT id INTO v_shop FROM shops WHERE owner_id = p_user_id FOR UPDATE;
    IF v_shop IS NOT NULL THEN
        UPDATE shops SET credits_balance = credits_balance + p_amount, free_credits_granted_at = NOW(), updated_at = NOW()
         WHERE id = v_shop RETURNING credits_balance INTO v_new;
    ELSE
        UPDATE profiles SET credits_balance = credits_balance + p_amount, free_credits_granted_at = NOW(), updated_at = NOW()
         WHERE id = p_user_id RETURNING credits_balance INTO v_new;
    END IF;
    UPDATE profiles SET trial_withheld = FALSE WHERE id = p_user_id AND trial_withheld;

    INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, description)
    VALUES (p_user_id, v_shop, p_amount, v_new, 'TRIAL_BONUS', 'Free plan credits on sign-up');

    RETURN jsonb_build_object('granted', true, 'balance', v_new);
END;
$$;
REVOKE ALL ON FUNCTION public.grant_trial_credits(UUID, INT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_trial_credits(UUID, INT, BOOLEAN) TO service_role;

-- Monthly free credits: unchanged rules, plus
--   * an account whose sign-up credits were withheld gets nothing until its phone is verified;
--   * once it is verified, the withheld sign-up credits are released first.
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
    v_release JSONB;
BEGIN
    SELECT credits INTO v_quota FROM pricing_plans WHERE code = 'FREE_TRIAL';
    v_quota := COALESCE(v_quota, 40);

    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('granted', false, 'balance', 0);
    END IF;
    IF v_profile.is_banned THEN
        RETURN jsonb_build_object('granted', false, 'balance', v_profile.credits_balance);
    END IF;

    IF v_profile.trial_withheld THEN
        IF NOT v_profile.phone_verified THEN
            SELECT credits_balance INTO v_new FROM shops WHERE owner_id = p_user_id;
            RETURN jsonb_build_object('granted', false, 'withheld', true, 'balance', COALESCE(v_new, v_profile.credits_balance));
        END IF;
        v_release := public.grant_trial_credits(p_user_id, v_quota, FALSE);
        RETURN jsonb_build_object('granted', COALESCE((v_release->>'granted')::BOOLEAN, false),
                                  'balance', COALESCE((v_release->>'balance')::INT, v_profile.credits_balance));
    END IF;

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
REVOKE ALL ON FUNCTION public.claim_monthly_credits(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_monthly_credits(UUID) TO service_role;

-- =====================================================================================
-- 2. Render reservation: in-flight cap enforced under the balance row lock
-- =====================================================================================
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
    v_free pricing_plans%ROWTYPE;
    v_in_flight INT;
    c_max_in_flight CONSTANT INT := 3;
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

    -- The profile row is the per-account mutex: concurrent reservations of one account run one
    -- after another, so the in-flight count below cannot be raced past.
    SELECT is_banned INTO v_banned FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF COALESCE(v_banned, TRUE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'ACCOUNT_BLOCKED');
    END IF;

    IF public.is_unlimited_account(p_user_id) THEN
        IF p_shop_id IS NOT NULL THEN
            SELECT credits_balance INTO v_balance FROM shops WHERE id = p_shop_id AND owner_id = p_user_id;
        ELSE
            SELECT credits_balance INTO v_balance FROM profiles WHERE id = p_user_id;
        END IF;
        UPDATE generations SET credit_state = 'RESERVED', credits_charged = 0 WHERE id = p_generation_id;
        INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, generation_id, description)
        VALUES (p_user_id, p_shop_id, 0, COALESCE(v_balance, 0), 'ADMIN_FREE_RENDER', p_generation_id, 'Admin render (not charged)');
        RETURN jsonb_build_object('success', true, 'balanceAfter', COALESCE(v_balance, 0), 'unlimited', true);
    END IF;

    SELECT count(*) INTO v_in_flight FROM generations
     WHERE user_id = p_user_id AND credit_state = 'RESERVED' AND id <> p_generation_id
       AND created_at > NOW() - INTERVAL '5 minutes';
    IF v_in_flight >= c_max_in_flight THEN
        RETURN jsonb_build_object('success', false, 'error', 'TOO_MANY_IN_FLIGHT');
    END IF;

    IF p_shop_id IS NOT NULL THEN
        SELECT credits_balance, current_plan_code, plan_expires_at
          INTO v_balance, v_plan, v_expires
          FROM shops WHERE id = p_shop_id AND owner_id = p_user_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Shop not found for user';
        END IF;
        IF v_plan <> 'FREE_TRIAL' AND v_expires IS NOT NULL AND v_expires < NOW() THEN
            SELECT * INTO v_free FROM pricing_plans WHERE code = 'FREE_TRIAL';
            UPDATE shops
               SET current_plan_code = 'FREE_TRIAL',
                   plan_expires_at = NULL,
                   watermark_enabled = COALESCE(v_free.watermark_enabled, TRUE),
                   max_devices = COALESCE(v_free.max_devices, 1),
                   updated_at = NOW()
             WHERE id = p_shop_id;
        END IF;
        IF v_balance < p_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'currentBalance', v_balance);
        END IF;
        v_new_balance := v_balance - p_amount;
        UPDATE shops SET credits_balance = v_new_balance, updated_at = NOW() WHERE id = p_shop_id;
    ELSE
        SELECT credits_balance INTO v_balance FROM profiles WHERE id = p_user_id;
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
REVOKE ALL ON FUNCTION public.reserve_credits(UUID, UUID, INT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(UUID, UUID, INT, UUID) TO service_role;

-- =====================================================================================
-- 3. credit_ledger: history survives everything
-- =====================================================================================
ALTER TABLE public.credit_ledger ALTER COLUMN user_id DROP NOT NULL;

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Replace whatever FK the live table has on user_id / shop_id with ON DELETE SET NULL.
    FOR r IN
        SELECT con.conname
          FROM pg_constraint con
          JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
         WHERE con.conrelid = 'public.credit_ledger'::regclass AND con.contype = 'f'
           AND att.attname IN ('user_id', 'shop_id')
    LOOP
        EXECUTE format('ALTER TABLE public.credit_ledger DROP CONSTRAINT %I', r.conname);
    END LOOP;
END;
$$;
ALTER TABLE public.credit_ledger
    ADD CONSTRAINT credit_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.credit_ledger
    ADD CONSTRAINT credit_ledger_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE SET NULL NOT VALID;

-- No one edits or deletes a ledger row. The only UPDATE allowed is the database's own
-- ON DELETE SET NULL on the reference columns (the account / shop / render was deleted).
CREATE OR REPLACE FUNCTION public.ledger_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.id = OLD.id
     AND NEW.amount = OLD.amount
     AND NEW.balance_after = OLD.balance_after
     AND NEW.action_type = OLD.action_type
     AND NEW.description IS NOT DISTINCT FROM OLD.description
     AND NEW.created_at = OLD.created_at
     AND (NEW.user_id IS NOT DISTINCT FROM OLD.user_id OR NEW.user_id IS NULL)
     AND (NEW.shop_id IS NOT DISTINCT FROM OLD.shop_id OR NEW.shop_id IS NULL)
     AND (NEW.generation_id IS NOT DISTINCT FROM OLD.generation_id OR NEW.generation_id IS NULL) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'credit_ledger is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_ledger_no_update ON public.credit_ledger;
CREATE TRIGGER trg_ledger_no_update BEFORE UPDATE OR DELETE ON public.credit_ledger
    FOR EACH ROW EXECUTE FUNCTION public.ledger_append_only();
-- (TRUNCATE skips row triggers: it is taken away from every API role in section 6.)

-- =====================================================================================
-- 4. Payment approval must state an amount that covers the order
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.admin_review_booking(
    p_admin_id UUID, p_booking_id UUID, p_approve BOOLEAN, p_reason TEXT, p_ip TEXT,
    p_paid_uzs BIGINT DEFAULT NULL, p_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status TEXT;
    v_payout INT;
    v_amount_uzs BIGINT;
    v_new TEXT;
    v_short TEXT;
BEGIN
    SELECT status, payout_cents, amount_uzs INTO v_status, v_payout, v_amount_uzs
      FROM bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;
    IF v_status <> 'PENDING_ADMIN_APPROVAL' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATE', 'state', v_status);
    END IF;

    IF p_approve AND v_amount_uzs IS NOT NULL AND (p_paid_uzs IS NULL OR p_paid_uzs < v_amount_uzs) THEN
        RETURN jsonb_build_object('success', false, 'error', 'AMOUNT_MISMATCH', 'expectedUzs', v_amount_uzs);
    END IF;

    IF p_approve AND v_payout IS NOT NULL THEN
        PERFORM 1 FROM catalog_items ci JOIN booking_items bi ON bi.item_id = ci.id
         WHERE bi.booking_id = p_booking_id FOR UPDATE OF ci;
        SELECT bi.name INTO v_short
          FROM booking_items bi JOIN catalog_items ci ON ci.id = bi.item_id
         WHERE bi.booking_id = p_booking_id AND ci.stock < bi.quantity
         LIMIT 1;
        IF v_short IS NOT NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'OUT_OF_STOCK', 'item', v_short);
        END IF;
        UPDATE catalog_items ci
           SET stock = ci.stock - bi.quantity
          FROM booking_items bi
         WHERE bi.booking_id = p_booking_id AND bi.item_id = ci.id;
        UPDATE booking_items bi SET reserved_qty = CASE WHEN bi.item_id IS NULL THEN 0 ELSE bi.quantity END
         WHERE bi.booking_id = p_booking_id;
    END IF;

    v_new := CASE WHEN p_approve THEN 'UNLOCKED' ELSE 'REJECTED' END;
    UPDATE bookings
       SET status = v_new,
           unlocked_at = CASE WHEN p_approve THEN NOW() ELSE unlocked_at END,
           payout_status = CASE WHEN p_approve AND v_payout IS NOT NULL THEN 'PENDING' ELSE payout_status END,
           rejected_reason = CASE WHEN p_approve THEN NULL ELSE LEFT(COALESCE(p_reason, 'Chek tasdiqlanmadi'), 300) END,
           paid_amount_uzs = COALESCE(p_paid_uzs, paid_amount_uzs),
           bank_reference = COALESCE(NULLIF(left(btrim(COALESCE(p_reference, '')), 120), ''), bank_reference)
     WHERE id = p_booking_id;

    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, CASE WHEN p_approve THEN 'APPROVE_PAYMENT' ELSE 'REJECT_PAYMENT' END, 'bookings', p_booking_id,
            jsonb_build_object('status', v_status, 'amountUzs', v_amount_uzs),
            jsonb_build_object('status', v_new, 'reason', p_reason, 'paidUzs', p_paid_uzs, 'reference', p_reference), p_ip);
    RETURN jsonb_build_object('success', true, 'status', v_new);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_booking(UUID, UUID, BOOLEAN, TEXT, TEXT, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_booking(UUID, UUID, BOOLEAN, TEXT, TEXT, BIGINT, TEXT) TO service_role;

-- =====================================================================================
-- 5. Sellers: only verified workshops of non-banned owners are listed and sold
-- =====================================================================================
ALTER TABLE public.shops ALTER COLUMN is_verified SET DEFAULT FALSE;

-- Keep the live catalog: workshops that already sell are approved once, here. New sign-ups wait
-- for the admin (Admin -> Workshops -> Verify). Direct SQL runs as a privileged caller, so the
-- shop guard trigger lets this through.
UPDATE public.shops s
   SET is_verified = TRUE, updated_at = NOW()
 WHERE s.is_verified = FALSE
   AND EXISTS (SELECT 1 FROM public.catalog_items ci WHERE ci.shop_id = s.id AND ci.status = 'PUBLISHED');

CREATE OR REPLACE VIEW public.catalog_items_listed
WITH (security_invoker = true) AS
SELECT ci.*
  FROM public.catalog_items ci
  JOIN public.shops s ON s.id = ci.shop_id
  JOIN public.profiles p ON p.id = s.owner_id
 WHERE s.is_verified = TRUE
   AND p.is_banned = FALSE;
GRANT SELECT ON public.catalog_items_listed TO service_role;

CREATE OR REPLACE FUNCTION public.create_purchase(
    p_user_id UUID, p_shop_of_user UUID, p_items JSONB, p_name TEXT, p_phone TEXT, p_note TEXT,
    p_idem_key TEXT, p_fx_rate NUMERIC, p_commission_bps INT, p_max_open INT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing UUID[];
    v_open INT;
    v_item RECORD;
    v_shop UUID;
    v_total BIGINT;
    v_comm BIGINT;
    v_booking UUID;
    v_ids UUID[] := '{}';
    v_attempt INT;
BEGIN
    IF p_idem_key IS NOT NULL THEN
        SELECT array_agg(id) INTO v_existing FROM bookings WHERE user_id = p_user_id AND idempotency_key = p_idem_key;
        IF v_existing IS NOT NULL THEN
            RETURN jsonb_build_object('success', true, 'ids', to_jsonb(v_existing), 'replayed', true);
        END IF;
    END IF;

    SELECT count(*) INTO v_open FROM bookings WHERE user_id = p_user_id AND status = 'AWAITING_PAYMENT';
    IF v_open >= p_max_open THEN
        RETURN jsonb_build_object('success', false, 'error', 'TOO_MANY_OPEN');
    END IF;

    CREATE TEMP TABLE IF NOT EXISTS _req (item_id UUID PRIMARY KEY, qty INT) ON COMMIT DROP;
    TRUNCATE _req;
    INSERT INTO _req (item_id, qty)
    SELECT (e->>'id')::UUID, LEAST(20, SUM(GREATEST(1, (e->>'quantity')::INT)))
      FROM jsonb_array_elements(p_items) e
     GROUP BY 1;

    FOR v_item IN
        SELECT r.item_id, r.qty, ci.id AS found, ci.name, ci.stock, ci.status, ci.shop_id, ci.price_cents,
               COALESCE(s.is_verified, FALSE) AS shop_verified, COALESCE(p.is_banned, TRUE) AS owner_banned
          FROM _req r
          LEFT JOIN catalog_items ci ON ci.id = r.item_id
          LEFT JOIN shops s ON s.id = ci.shop_id
          LEFT JOIN profiles p ON p.id = s.owner_id
    LOOP
        -- An unverified workshop, or one whose owner is banned, is not listed: same answer as a
        -- withdrawn item.
        IF v_item.found IS NULL OR v_item.status <> 'PUBLISHED' OR NOT v_item.shop_verified OR v_item.owner_banned THEN
            RETURN jsonb_build_object('success', false, 'error', 'ITEM_UNAVAILABLE');
        END IF;
        IF v_item.stock < v_item.qty THEN
            RETURN jsonb_build_object('success', false, 'error', 'OUT_OF_STOCK', 'item', v_item.name);
        END IF;
        IF p_shop_of_user IS NOT NULL AND v_item.shop_id = p_shop_of_user THEN
            RETURN jsonb_build_object('success', false, 'error', 'OWN_SHOP');
        END IF;
        IF v_item.price_cents <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'FREE_ITEMS');
        END IF;
    END LOOP;

    FOR v_shop, v_total IN
        SELECT ci.shop_id, SUM(ci.price_cents::BIGINT * r.qty)
          FROM _req r JOIN catalog_items ci ON ci.id = r.item_id
         GROUP BY ci.shop_id
    LOOP
        v_comm := (v_total * p_commission_bps) / 10000;
        v_booking := NULL;
        v_attempt := 0;
        WHILE v_booking IS NULL LOOP
            v_attempt := v_attempt + 1;
            BEGIN
                INSERT INTO bookings (booking_number, user_id, shop_id, status, total_cents, amount_cents,
                                      commission_cents, payout_cents, redemption_code, customer_name,
                                      customer_phone, customer_note, amount_uzs, fx_rate, idempotency_key)
                VALUES ('CV-' || upper(substr(md5(gen_random_uuid()::TEXT), 1, 6)), p_user_id, v_shop,
                        'AWAITING_PAYMENT', v_total, v_total, v_comm, v_total - v_comm,
                        (100 + floor(random() * 900))::INT::TEXT || '-' || (100 + floor(random() * 900))::INT::TEXT,
                        left(p_name, 100), left(p_phone, 30), NULLIF(left(COALESCE(p_note, ''), 500), ''),
                        CASE WHEN p_fx_rate IS NULL THEN NULL ELSE round(v_total * p_fx_rate / 100.0)::BIGINT END,
                        p_fx_rate, p_idem_key)
                RETURNING id INTO v_booking;
            EXCEPTION WHEN unique_violation THEN
                IF v_attempt >= 5 THEN RAISE; END IF;
            END;
        END LOOP;

        INSERT INTO booking_items (booking_id, item_id, name, brand, image_url, unit_cents, quantity)
        SELECT v_booking, ci.id, ci.name, ci.brand, ci.cover_image_url, ci.price_cents, r.qty
          FROM _req r JOIN catalog_items ci ON ci.id = r.item_id
         WHERE ci.shop_id = v_shop;

        v_ids := v_ids || v_booking;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'ids', to_jsonb(v_ids));
END;
$$;
REVOKE ALL ON FUNCTION public.create_purchase(UUID, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, NUMERIC, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_purchase(UUID, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, NUMERIC, INT, INT) TO service_role;

-- =====================================================================================
-- 6. Perimeter: the browser has no direct database access at all
-- =====================================================================================
-- The server (service role) keeps everything it had.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- History tables: TRUNCATE skips the append-only row triggers, so no API role may run it.
REVOKE TRUNCATE ON public.credit_ledger, public.admin_audit_log FROM PUBLIC, anon, authenticated, service_role;

-- SECURITY DEFINER functions run as their owner: none may be callable through /rest/v1/rpc
-- by anon or a signed-in user (this also covers legacy ones such as owns_ticket()).
DO $$
DECLARE
    f RECORD;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS sig
          FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.prosecdef
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END LOOP;
END;
$$;

-- Objects created later by this role start closed too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- Every table in public keeps RLS on (defense in depth if a grant ever comes back).
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT c.oid::regclass AS rel
          FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
    LOOP
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t.rel);
    END LOOP;
END;
$$;

-- Marker the admin security card reads ("VPC" lock).
CREATE TABLE IF NOT EXISTS public.security_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.security_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_migrations FROM anon, authenticated;
GRANT ALL ON public.security_migrations TO service_role;
INSERT INTO public.security_migrations (name) VALUES ('20261120000000_security_hardening')
    ON CONFLICT (name) DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';
