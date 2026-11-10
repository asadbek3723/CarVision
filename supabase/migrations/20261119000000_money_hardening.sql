-- CarVision: payments, credits and admin hardening
-- Migration: 20261119000000_money_hardening.sql   (idempotent, safe to re-run)
-- Requires every earlier migration, in particular 20261117000000_full_payment_purchases.sql.
-- Run the WHOLE file at once (nothing selected in the SQL editor): it is one transaction.
--
-- What changes
--  Payments
--   * Orders are created in ONE transaction (create_purchase), safe to retry (idempotency key),
--     and store the exact so'm amount and exchange rate the customer was asked to pay.
--   * Hand-over needs the customer's pickup code; the order number no longer works as a code.
--   * The workshop payout is blocked in the database while the customer can still cancel.
--   * Approval refuses to oversell stock; a cancel puts back exactly what approval took.
--   * A rejected payment can be refunded; every payout / refund is recorded in payout_transfers.
--   * Unpaid orders expire after 48 hours.
--  Credits
--   * An expired paid plan falls back to the free plan instead of locking the balance.
--   * Admin grants and plan assignments are idempotent, recorded in payments_manual,
--     plan renewals extend the remaining time, and amounts are BIGINT (UZS fits).
--   * "Open garage" moves (not copies) the balance and makes the owner a seller.
--  Admin
--   * Audit log is append-only. Admin sessions can be revoked on logout.
--   * Row-level policies no longer give a super admin direct reads that skip the PIN.

-- =====================================================================================
-- 0. Shared tables
-- =====================================================================================

-- Every admin money action carries a request id; a repeat returns the first result.
CREATE TABLE IF NOT EXISTS public.admin_idempotency (
    key UUID PRIMARY KEY,
    action TEXT NOT NULL,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_idempotency ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_idempotency FROM anon, authenticated;

-- Money received for plans / credits (manual sales). One row per sale.
CREATE TABLE IF NOT EXISTS public.payments_manual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('PLAN', 'CREDITS')),
    plan_code TEXT,
    credits INT NOT NULL DEFAULT 0,
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    currency TEXT NOT NULL CHECK (currency IN ('USD', 'UZS', 'AED', 'EUR')),
    method TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    admin_id UUID NOT NULL,
    request_id UUID UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_manual_created ON public.payments_manual(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_manual_shop ON public.payments_manual(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_manual_user ON public.payments_manual(user_id, created_at DESC);
ALTER TABLE public.payments_manual ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payments_manual FROM anon, authenticated;

-- Every manual bank transfer the platform makes: workshop payouts and customer refunds.
CREATE TABLE IF NOT EXISTS public.payout_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('PAYOUT', 'REFUND')),
    amount_cents INT NOT NULL CHECK (amount_cents >= 0),
    amount_uzs BIGINT,
    reference TEXT NOT NULL,
    admin_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payout_transfers_created ON public.payout_transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_transfers_shop ON public.payout_transfers(shop_id, created_at DESC);
ALTER TABLE public.payout_transfers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payout_transfers FROM anon, authenticated;

-- Where workshop payouts go (card / bank account). Only the server reads it.
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_details TEXT;

-- Logout revokes every admin session token issued before this moment.
CREATE TABLE IF NOT EXISTS public.admin_session_revocations (
    admin_id UUID PRIMARY KEY,
    revoked_before TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.admin_session_revocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_session_revocations FROM anon, authenticated;

-- =====================================================================================
-- 1. Audit log is append-only (no one edits or deletes history, not even the server)
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.audit_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_append_only ON public.admin_audit_log;
CREATE TRIGGER trg_audit_append_only BEFORE UPDATE OR DELETE ON public.admin_audit_log
    FOR EACH ROW EXECUTE FUNCTION public.audit_append_only();
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log(created_at DESC);

-- =====================================================================================
-- 2. No PIN bypass: is_super_admin() is only used in row-level policies. The admin panel reads
--    everything through the server (service role) after the PIN, so browser-side Supabase
--    queries no longer get admin-wide reads.
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT FALSE;
$$;
REVOKE SELECT ON public.admin_audit_log FROM authenticated;

-- =====================================================================================
-- 3. Bookings: frozen so'm amount, idempotent creation, stock reservation
-- =====================================================================================
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS amount_uzs BIGINT CHECK (amount_uzs IS NULL OR amount_uzs >= 0),
    ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(14, 4),
    ADD COLUMN IF NOT EXISTS paid_amount_uzs BIGINT CHECK (paid_amount_uzs IS NULL OR paid_amount_uzs >= 0),
    ADD COLUMN IF NOT EXISTS bank_reference TEXT,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_idem ON public.bookings(user_id, idempotency_key, shop_id) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_unlocked ON public.bookings(unlocked_at) WHERE status = 'UNLOCKED';

-- How many units approval actually took out of stock (NULL on older orders = quantity).
ALTER TABLE public.booking_items ADD COLUMN IF NOT EXISTS reserved_qty INT CHECK (reserved_qty IS NULL OR reserved_qty >= 0);

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

    -- Requested items, merged by id
    CREATE TEMP TABLE IF NOT EXISTS _req (item_id UUID PRIMARY KEY, qty INT) ON COMMIT DROP;
    TRUNCATE _req;
    INSERT INTO _req (item_id, qty)
    SELECT (e->>'id')::UUID, LEAST(20, SUM(GREATEST(1, (e->>'quantity')::INT)))
      FROM jsonb_array_elements(p_items) e
     GROUP BY 1;

    FOR v_item IN
        SELECT r.item_id, r.qty, ci.id AS found, ci.name, ci.stock, ci.status, ci.shop_id, ci.price_cents
          FROM _req r LEFT JOIN catalog_items ci ON ci.id = r.item_id
    LOOP
        IF v_item.found IS NULL OR v_item.status <> 'PUBLISHED' THEN
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

-- Unpaid orders older than p_hours are closed (nothing was paid, so nothing to refund).
CREATE OR REPLACE FUNCTION public.expire_unpaid_bookings(p_hours INT)
RETURNS INT
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH x AS (
    UPDATE bookings SET status = 'CANCELLED', cancelled_at = NOW()
     WHERE status = 'AWAITING_PAYMENT' AND receipt_path IS NULL
       AND created_at < NOW() - make_interval(hours => p_hours)
    RETURNING 1
  )
  SELECT count(*)::INT FROM x;
$$;
REVOKE ALL ON FUNCTION public.expire_unpaid_bookings(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_bookings(INT) TO service_role;

-- Approval: refuses to oversell; records the amount actually received.
DROP FUNCTION IF EXISTS public.admin_review_booking(UUID, UUID, BOOLEAN, TEXT, TEXT);
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
    v_new TEXT;
    v_short TEXT;
BEGIN
    SELECT status, payout_cents INTO v_status, v_payout FROM bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;
    IF v_status <> 'PENDING_ADMIN_APPROVAL' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATE', 'state', v_status);
    END IF;

    IF p_approve AND v_payout IS NOT NULL THEN
        -- Lock the catalog rows and check every line before touching any of them.
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
            jsonb_build_object('status', v_status),
            jsonb_build_object('status', v_new, 'reason', p_reason, 'paidUzs', p_paid_uzs, 'reference', p_reference), p_ip);
    RETURN jsonb_build_object('success', true, 'status', v_new);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_booking(UUID, UUID, BOOLEAN, TEXT, TEXT, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_booking(UUID, UUID, BOOLEAN, TEXT, TEXT, BIGINT, TEXT) TO service_role;

-- Customer cancel: only before hand-over, inside the window; returns exactly what approval took.
CREATE OR REPLACE FUNCTION public.customer_cancel_purchase(
    p_user_id UUID, p_booking_id UUID, p_window_hours INT, p_refund_bps INT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    b RECORD;
    v_refund INT;
BEGIN
    SELECT id, status, amount_cents, payout_cents, payout_status, unlocked_at
      INTO b FROM bookings WHERE id = p_booking_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;
    IF b.status <> 'UNLOCKED' OR b.payout_cents IS NULL OR b.payout_status <> 'PENDING'
       OR b.unlocked_at IS NULL OR b.unlocked_at < NOW() - make_interval(hours => p_window_hours) THEN
        RETURN jsonb_build_object('success', false, 'error', 'CANNOT_CANCEL');
    END IF;
    v_refund := (b.amount_cents::BIGINT * p_refund_bps / 10000)::INT;
    UPDATE bookings
       SET status = 'CANCELLED',
           cancelled_at = NOW(),
           payout_status = 'VOID',
           refund_cents = v_refund,
           refund_status = CASE WHEN v_refund > 0 THEN 'PENDING' ELSE 'NONE' END
     WHERE id = b.id;
    UPDATE catalog_items ci
       SET stock = ci.stock + COALESCE(bi.reserved_qty, bi.quantity)
      FROM booking_items bi
     WHERE bi.booking_id = b.id AND bi.item_id = ci.id;
    UPDATE booking_items SET reserved_qty = 0 WHERE booking_id = b.id;
    RETURN jsonb_build_object('success', true, 'refundCents', v_refund);
END;
$$;
REVOKE ALL ON FUNCTION public.customer_cancel_purchase(UUID, UUID, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_cancel_purchase(UUID, UUID, INT, INT) TO service_role;

-- Hand-over: only with the customer's pickup code (never the order number, which the workshop sees).
DROP FUNCTION IF EXISTS public.redeem_booking(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.redeem_booking(p_shop_id UUID, p_code TEXT, p_booking_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id UUID;
    v_status TEXT;
BEGIN
    SELECT id, status INTO v_id, v_status FROM bookings
     WHERE shop_id = p_shop_id
       AND redemption_code = btrim(p_code)
       AND (p_booking_id IS NULL OR id = p_booking_id)
       AND status IN ('UNLOCKED', 'REDEEMED')
     FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;
    IF v_status = 'REDEEMED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_REDEEMED', 'bookingId', v_id);
    END IF;
    UPDATE bookings SET status = 'REDEEMED', redeemed_at = NOW() WHERE id = v_id;
    RETURN jsonb_build_object('success', true, 'bookingId', v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_booking(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_booking(UUID, TEXT, UUID) TO service_role;

-- Workshop payout: blocked while the customer can still cancel (unless already handed over).
DROP FUNCTION IF EXISTS public.admin_mark_payout(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.admin_mark_payout(
    p_admin_id UUID, p_booking_id UUID, p_ip TEXT, p_window_hours INT, p_reference TEXT, p_amount_uzs BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    b RECORD;
BEGIN
    IF p_reference IS NULL OR length(btrim(p_reference)) < 2 THEN
        RETURN jsonb_build_object('success', false, 'error', 'REFERENCE_REQUIRED');
    END IF;
    SELECT id, shop_id, status, payout_status, payout_cents, unlocked_at INTO b FROM bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;
    IF b.payout_status <> 'PENDING' OR b.status NOT IN ('UNLOCKED', 'REDEEMED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATE', 'state', b.payout_status);
    END IF;
    IF b.status = 'UNLOCKED' AND b.unlocked_at > NOW() - make_interval(hours => p_window_hours) THEN
        RETURN jsonb_build_object('success', false, 'error', 'CANCEL_WINDOW_OPEN',
                                  'until', b.unlocked_at + make_interval(hours => p_window_hours));
    END IF;
    UPDATE bookings SET payout_status = 'PAID', payout_paid_at = NOW() WHERE id = b.id;
    INSERT INTO payout_transfers (booking_id, shop_id, kind, amount_cents, amount_uzs, reference, admin_id)
    VALUES (b.id, b.shop_id, 'PAYOUT', b.payout_cents, p_amount_uzs, left(btrim(p_reference), 120), p_admin_id);
    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, 'MARK_PAYOUT_PAID', 'bookings', b.id,
            jsonb_build_object('payout_status', b.payout_status),
            jsonb_build_object('payout_status', 'PAID', 'amountCents', b.payout_cents, 'amountUzs', p_amount_uzs, 'reference', p_reference), p_ip);
    RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_mark_payout(UUID, UUID, TEXT, INT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_payout(UUID, UUID, TEXT, INT, TEXT, BIGINT) TO service_role;

-- Customer refund after a cancel.
DROP FUNCTION IF EXISTS public.admin_mark_refund(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.admin_mark_refund(
    p_admin_id UUID, p_booking_id UUID, p_ip TEXT, p_reference TEXT, p_amount_uzs BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    b RECORD;
BEGIN
    IF p_reference IS NULL OR length(btrim(p_reference)) < 2 THEN
        RETURN jsonb_build_object('success', false, 'error', 'REFERENCE_REQUIRED');
    END IF;
    SELECT id, shop_id, refund_status, refund_cents INTO b FROM bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;
    IF b.refund_status <> 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATE', 'state', b.refund_status);
    END IF;
    UPDATE bookings SET refund_status = 'DONE', refunded_at = NOW() WHERE id = b.id;
    INSERT INTO payout_transfers (booking_id, shop_id, kind, amount_cents, amount_uzs, reference, admin_id)
    VALUES (b.id, b.shop_id, 'REFUND', COALESCE(b.refund_cents, 0), p_amount_uzs, left(btrim(p_reference), 120), p_admin_id);
    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, 'MARK_REFUND_DONE', 'bookings', b.id,
            jsonb_build_object('refund_status', b.refund_status),
            jsonb_build_object('refund_status', 'DONE', 'amountCents', b.refund_cents, 'amountUzs', p_amount_uzs, 'reference', p_reference), p_ip);
    RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_mark_refund(UUID, UUID, TEXT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_refund(UUID, UUID, TEXT, TEXT, BIGINT) TO service_role;

-- Money came in but the receipt was rejected (wrong amount, unclear receipt...): send it back.
CREATE OR REPLACE FUNCTION public.admin_refund_rejected(
    p_admin_id UUID, p_booking_id UUID, p_amount_cents INT, p_reference TEXT, p_ip TEXT, p_amount_uzs BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    b RECORD;
BEGIN
    IF p_reference IS NULL OR length(btrim(p_reference)) < 2 THEN
        RETURN jsonb_build_object('success', false, 'error', 'REFERENCE_REQUIRED');
    END IF;
    SELECT id, shop_id, status, amount_cents, refund_status INTO b FROM bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;
    IF b.status <> 'REJECTED' OR b.refund_status <> 'NONE' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATE', 'state', b.status);
    END IF;
    IF p_amount_cents IS NULL OR p_amount_cents <= 0 OR p_amount_cents > b.amount_cents THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
    END IF;
    UPDATE bookings
       SET status = 'CANCELLED', cancelled_at = NOW(), payout_status = 'VOID',
           refund_cents = p_amount_cents, refund_status = 'DONE', refunded_at = NOW()
     WHERE id = b.id;
    INSERT INTO payout_transfers (booking_id, shop_id, kind, amount_cents, amount_uzs, reference, admin_id)
    VALUES (b.id, b.shop_id, 'REFUND', p_amount_cents, p_amount_uzs, left(btrim(p_reference), 120), p_admin_id);
    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, 'REFUND_REJECTED', 'bookings', b.id,
            jsonb_build_object('status', b.status),
            jsonb_build_object('status', 'CANCELLED', 'amountCents', p_amount_cents, 'amountUzs', p_amount_uzs, 'reference', p_reference), p_ip);
    RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_refund_rejected(UUID, UUID, INT, TEXT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_refund_rejected(UUID, UUID, INT, TEXT, TEXT, BIGINT) TO service_role;

-- =====================================================================================
-- 4. Credits
-- =====================================================================================

-- An expired paid plan falls back to the free plan: the balance stays usable (with watermark).
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
REVOKE ALL ON FUNCTION public.reserve_credits(UUID, UUID, INT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(UUID, UUID, INT, UUID) TO service_role;

-- Plan assignment: idempotent, BIGINT amount, extends remaining time, records the sale.
DROP FUNCTION IF EXISTS public.admin_assign_plan(UUID, UUID, TEXT, INT, INT, INT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.admin_assign_plan(
    p_admin_id UUID, p_shop_id UUID, p_plan_code TEXT, p_credits INT, p_duration_days INT,
    p_paid_minor BIGINT, p_currency TEXT, p_method TEXT, p_notes TEXT, p_ip TEXT,
    p_request_id UUID, p_reference TEXT DEFAULT NULL
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
    v_code TEXT;
    v_prev JSONB;
    v_result JSONB;
BEGIN
    IF p_request_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'REQUEST_ID_REQUIRED');
    END IF;

    IF p_credits IS NULL OR p_credits < 0 OR p_credits > 50000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
    END IF;
    IF p_duration_days IS NULL OR p_duration_days < 1 OR p_duration_days > 365 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_DURATION');
    END IF;
    IF p_paid_minor IS NULL OR p_paid_minor < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PAYMENT');
    END IF;
    IF p_plan_code <> 'CUSTOM' THEN
        SELECT * INTO v_plan FROM pricing_plans WHERE code = p_plan_code;
        v_has_plan := FOUND;
        IF NOT v_has_plan THEN
            RETURN jsonb_build_object('success', false, 'error', 'UNKNOWN_PLAN');
        END IF;
    END IF;
    SELECT * INTO v_shop FROM shops WHERE id = p_shop_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SHOP_NOT_FOUND');
    END IF;

    -- Claimed only once every check passed, so a failed attempt can be retried with the same id.
    INSERT INTO admin_idempotency (key, action) VALUES (p_request_id, 'ASSIGN_PLAN') ON CONFLICT (key) DO NOTHING;
    IF NOT FOUND THEN
        SELECT result INTO v_prev FROM admin_idempotency WHERE key = p_request_id;
        RETURN COALESCE(v_prev, jsonb_build_object('success', false, 'error', 'DUPLICATE_REQUEST')) || jsonb_build_object('replayed', true);
    END IF;

    v_new_balance := v_shop.credits_balance + p_credits;
    -- Renewing early keeps the remaining days.
    v_expires := GREATEST(NOW(), COALESCE(v_shop.plan_expires_at, NOW())) + make_interval(days => p_duration_days);
    -- CUSTOM keeps the paid plan the shop already has; a free shop becomes CUSTOM (a paid plan).
    v_code := CASE WHEN v_has_plan THEN p_plan_code
                   WHEN v_shop.current_plan_code = 'FREE_TRIAL' THEN 'CUSTOM'
                   ELSE v_shop.current_plan_code END;

    UPDATE shops
       SET credits_balance = v_new_balance,
           current_plan_code = v_code,
           plan_expires_at = v_expires,
           watermark_enabled = CASE WHEN v_has_plan THEN v_plan.watermark_enabled
                                    WHEN v_shop.current_plan_code = 'FREE_TRIAL' THEN FALSE
                                    ELSE watermark_enabled END,
           max_devices = CASE WHEN v_has_plan THEN v_plan.max_devices ELSE max_devices END,
           updated_at = NOW()
     WHERE id = p_shop_id;

    IF p_credits > 0 THEN
        INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, description)
        VALUES (v_shop.owner_id, p_shop_id, p_credits, v_new_balance, 'PLAN_ASSIGNED',
                format('Plan %s: +%s credits (%s %s via %s)', v_code, p_credits, p_paid_minor / 100.0, p_currency, p_method));
    END IF;

    INSERT INTO payments_manual (user_id, shop_id, kind, plan_code, credits, amount_minor, currency, method, reference, notes, admin_id, request_id)
    VALUES (v_shop.owner_id, p_shop_id, 'PLAN', v_code, p_credits, p_paid_minor, p_currency, p_method,
            NULLIF(left(btrim(COALESCE(p_reference, '')), 120), ''), left(p_notes, 500), p_admin_id, p_request_id);

    INSERT INTO admin_audit_log (admin_id, admin_role, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, 'super_admin', 'ASSIGN_PLAN', 'shops', p_shop_id,
            jsonb_build_object('credits', v_shop.credits_balance, 'plan', v_shop.current_plan_code, 'expiresAt', v_shop.plan_expires_at),
            jsonb_build_object('credits', v_new_balance, 'plan', v_code, 'expiresAt', v_expires,
                               'paidAmountMinor', p_paid_minor, 'currency', p_currency, 'method', p_method,
                               'reference', p_reference, 'notes', p_notes),
            p_ip)
    RETURNING id::text INTO v_audit;

    v_result := jsonb_build_object('success', true, 'newCreditsBalance', v_new_balance,
                                   'planCode', v_code, 'planExpiresAt', v_expires, 'auditLogId', v_audit);
    UPDATE admin_idempotency SET result = v_result WHERE key = p_request_id;
    RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_assign_plan(UUID, UUID, TEXT, INT, INT, BIGINT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_plan(UUID, UUID, TEXT, INT, INT, BIGINT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO service_role;

-- Manual credit grant/removal: idempotent, correct audit target, optional sale record.
DROP FUNCTION IF EXISTS public.admin_adjust_credits(UUID, UUID, INT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
    p_admin_id UUID, p_user_id UUID, p_amount INT, p_reason TEXT, p_ip TEXT, p_request_id UUID,
    p_paid_minor BIGINT DEFAULT NULL, p_currency TEXT DEFAULT NULL, p_method TEXT DEFAULT NULL, p_reference TEXT DEFAULT NULL
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
    v_target TEXT;
    v_target_id UUID;
    v_prev JSONB;
    v_result JSONB;
BEGIN
    IF p_request_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'REQUEST_ID_REQUIRED');
    END IF;

    IF p_amount IS NULL OR p_amount = 0 OR abs(p_amount) > 100000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
    END IF;
    IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'REASON_REQUIRED');
    END IF;
    IF p_paid_minor IS NOT NULL AND (p_paid_minor < 0 OR p_amount < 0 OR p_currency IS NULL OR p_method IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PAYMENT');
    END IF;

    SELECT * INTO v_shop FROM shops WHERE owner_id = p_user_id FOR UPDATE;
    IF FOUND THEN
        v_before := v_shop.credits_balance;
        v_after := v_before + p_amount;
        IF v_after < 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'NEGATIVE_BALANCE', 'balance', v_before);
        END IF;
        INSERT INTO admin_idempotency (key, action) VALUES (p_request_id, 'ADJUST_CREDITS') ON CONFLICT (key) DO NOTHING;
        IF NOT FOUND THEN
            SELECT result INTO v_prev FROM admin_idempotency WHERE key = p_request_id;
            RETURN COALESCE(v_prev, jsonb_build_object('success', false, 'error', 'DUPLICATE_REQUEST')) || jsonb_build_object('replayed', true);
        END IF;
        UPDATE shops SET credits_balance = v_after, updated_at = NOW() WHERE id = v_shop.id;
        INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, description)
        VALUES (p_user_id, v_shop.id, p_amount, v_after, 'ADMIN_ADJUSTMENT', left(p_reason, 300));
        v_target := 'shops';
        v_target_id := v_shop.id;
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
        INSERT INTO admin_idempotency (key, action) VALUES (p_request_id, 'ADJUST_CREDITS') ON CONFLICT (key) DO NOTHING;
        IF NOT FOUND THEN
            SELECT result INTO v_prev FROM admin_idempotency WHERE key = p_request_id;
            RETURN COALESCE(v_prev, jsonb_build_object('success', false, 'error', 'DUPLICATE_REQUEST')) || jsonb_build_object('replayed', true);
        END IF;
        UPDATE profiles SET credits_balance = v_after, updated_at = NOW() WHERE id = p_user_id;
        INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, description)
        VALUES (p_user_id, NULL, p_amount, v_after, 'ADMIN_ADJUSTMENT', left(p_reason, 300));
        v_target := 'profiles';
        v_target_id := p_user_id;
    END IF;

    IF p_paid_minor IS NOT NULL THEN
        INSERT INTO payments_manual (user_id, shop_id, kind, credits, amount_minor, currency, method, reference, notes, admin_id, request_id)
        VALUES (p_user_id, CASE WHEN v_target = 'shops' THEN v_target_id END, 'CREDITS', p_amount, p_paid_minor,
                p_currency, p_method, NULLIF(left(btrim(COALESCE(p_reference, '')), 120), ''), left(p_reason, 500), p_admin_id, p_request_id);
    END IF;

    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, 'ADJUST_CREDITS', v_target, v_target_id,
            jsonb_build_object('credits', v_before, 'userId', p_user_id),
            jsonb_build_object('credits', v_after, 'delta', p_amount, 'reason', p_reason,
                               'paidMinor', p_paid_minor, 'currency', p_currency, 'method', p_method), p_ip);

    v_result := jsonb_build_object('success', true, 'balanceAfter', v_after);
    UPDATE admin_idempotency SET result = v_result WHERE key = p_request_id;
    RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_adjust_credits(UUID, UUID, INT, TEXT, TEXT, UUID, BIGINT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(UUID, UUID, INT, TEXT, TEXT, UUID, BIGINT, TEXT, TEXT, TEXT) TO service_role;

-- Open a garage for an existing account: one shop per owner, balance MOVES to the shop,
-- the owner becomes a seller (super admins keep their role), all audited.
CREATE OR REPLACE FUNCTION public.admin_open_garage(p_admin_id UUID, p_user_id UUID, p_ip TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_existing UUID;
    v_shop UUID;
    v_free pricing_plans%ROWTYPE;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;
    SELECT id INTO v_existing FROM shops WHERE owner_id = p_user_id;
    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'shopId', v_existing, 'created', false);
    END IF;
    SELECT * INTO v_free FROM pricing_plans WHERE code = 'FREE_TRIAL';

    INSERT INTO shops (owner_id, shop_name, city, district, phone, current_plan_code, credits_balance,
                       watermark_enabled, max_devices, referral_code)
    VALUES (p_user_id, left(COALESCE(NULLIF(v_profile.full_name, ''), 'Mening') || ' garaji', 150), 'Toshkent', '-',
            v_profile.phone, 'FREE_TRIAL', v_profile.credits_balance,
            COALESCE(v_free.watermark_enabled, TRUE), COALESCE(v_free.max_devices, 1),
            upper(substr(md5(gen_random_uuid()::TEXT), 1, 10)))
    RETURNING id INTO v_shop;

    UPDATE profiles
       SET credits_balance = 0,
           role = CASE WHEN role = 'super_admin' THEN role ELSE 'b2b_seller' END,
           updated_at = NOW()
     WHERE id = p_user_id;

    IF v_profile.credits_balance <> 0 THEN
        INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, description)
        VALUES (p_user_id, NULL, -v_profile.credits_balance, 0, 'ADMIN_ADJUSTMENT', 'Balance moved to new garage');
        INSERT INTO credit_ledger (user_id, shop_id, amount, balance_after, action_type, description)
        VALUES (p_user_id, v_shop, v_profile.credits_balance, v_profile.credits_balance, 'ADMIN_ADJUSTMENT', 'Balance moved from personal account');
    END IF;

    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, 'OPEN_GARAGE', 'shops', v_shop,
            jsonb_build_object('role', v_profile.role, 'profileCredits', v_profile.credits_balance, 'userId', p_user_id),
            jsonb_build_object('shopId', v_shop, 'shopCredits', v_profile.credits_balance), p_ip);
    RETURN jsonb_build_object('success', true, 'shopId', v_shop, 'created', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_open_garage(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_open_garage(UUID, UUID, TEXT) TO service_role;

-- =====================================================================================
-- 5. Finance summary for the admin dashboard (exact SQL sums, no row caps)
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.admin_finance_summary(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ, p_window_hours INT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH paid AS (
    SELECT * FROM bookings
     WHERE unlocked_at IS NOT NULL AND payout_cents IS NOT NULL
       AND unlocked_at >= p_from AND unlocked_at < p_to
  )
  SELECT jsonb_build_object(
    'grossCents',          COALESCE((SELECT SUM(amount_cents) FROM paid), 0),
    'ordersPaid',          (SELECT count(*) FROM paid),
    -- Commission that can no longer be cancelled away
    'commissionEarnedCents', COALESCE((SELECT SUM(commission_cents) FROM paid
                               WHERE status = 'REDEEMED'
                                  OR (status = 'UNLOCKED' AND unlocked_at <= NOW() - make_interval(hours => p_window_hours))), 0),
    'commissionInWindowCents', COALESCE((SELECT SUM(commission_cents) FROM paid
                               WHERE status = 'UNLOCKED' AND unlocked_at > NOW() - make_interval(hours => p_window_hours)), 0),
    -- What the platform keeps on cancelled purchases (paid amount minus the refund)
    'cancelRetainedCents', COALESCE((SELECT SUM(amount_cents - COALESCE(refund_cents, 0)) FROM paid WHERE status = 'CANCELLED'), 0),
    'cancelledOrders',     (SELECT count(*) FROM paid WHERE status = 'CANCELLED'),
    -- Live balances (not limited to the period)
    'payoutsOwedCents',    COALESCE((SELECT SUM(payout_cents) FROM bookings WHERE payout_status = 'PENDING' AND status IN ('UNLOCKED', 'REDEEMED')), 0),
    'payoutsOwedCount',    (SELECT count(*) FROM bookings WHERE payout_status = 'PENDING' AND status IN ('UNLOCKED', 'REDEEMED')),
    'payoutsDueNowCents',  COALESCE((SELECT SUM(payout_cents) FROM bookings WHERE payout_status = 'PENDING'
                               AND (status = 'REDEEMED' OR (status = 'UNLOCKED' AND unlocked_at <= NOW() - make_interval(hours => p_window_hours)))), 0),
    'refundsPendingCents', COALESCE((SELECT SUM(refund_cents) FROM bookings WHERE refund_status = 'PENDING'), 0),
    'refundsPendingCount', (SELECT count(*) FROM bookings WHERE refund_status = 'PENDING'),
    'pendingApprovals',    (SELECT count(*) FROM bookings WHERE status = 'PENDING_ADMIN_APPROVAL'),
    -- Transfers made in the period
    'payoutsPaidCents',    COALESCE((SELECT SUM(amount_cents) FROM payout_transfers WHERE kind = 'PAYOUT' AND created_at >= p_from AND created_at < p_to), 0),
    'refundsPaidCents',    COALESCE((SELECT SUM(amount_cents) FROM payout_transfers WHERE kind = 'REFUND' AND created_at >= p_from AND created_at < p_to), 0),
    -- Plan / credit sales in the period, per currency (minor units)
    'salesByCurrency',     COALESCE((SELECT jsonb_object_agg(currency, total) FROM (
                               SELECT currency, SUM(amount_minor) AS total FROM payments_manual
                                WHERE created_at >= p_from AND created_at < p_to GROUP BY currency) s), '{}'::jsonb),
    'salesCount',          (SELECT count(*) FROM payments_manual WHERE created_at >= p_from AND created_at < p_to),
    'creditsUsed',         COALESCE((SELECT SUM(credits_charged) FROM generations
                               WHERE credit_state = 'COMMITTED' AND created_at >= p_from AND created_at < p_to), 0)
  );
$$;
REVOKE ALL ON FUNCTION public.admin_finance_summary(TIMESTAMPTZ, TIMESTAMPTZ, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finance_summary(TIMESTAMPTZ, TIMESTAMPTZ, INT) TO service_role;

-- What each workshop is owed right now (for batch payouts).
CREATE OR REPLACE FUNCTION public.admin_payouts_by_shop(p_window_hours INT)
RETURNS TABLE (shop_id UUID, shop_name TEXT, payout_details TEXT, orders BIGINT, owed_cents BIGINT, due_now_cents BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT b.shop_id, s.shop_name::TEXT, s.payout_details, count(*),
         SUM(b.payout_cents)::BIGINT,
         COALESCE(SUM(b.payout_cents) FILTER (WHERE b.status = 'REDEEMED'
             OR b.unlocked_at <= NOW() - make_interval(hours => p_window_hours)), 0)::BIGINT
    FROM bookings b JOIN shops s ON s.id = b.shop_id
   WHERE b.payout_status = 'PENDING' AND b.status IN ('UNLOCKED', 'REDEEMED')
   GROUP BY b.shop_id, s.shop_name, s.payout_details
   ORDER BY 5 DESC;
$$;
REVOKE ALL ON FUNCTION public.admin_payouts_by_shop(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_payouts_by_shop(INT) TO service_role;

-- =====================================================================================
-- 6. Guards: payout details and referral attribution are server-only columns
-- =====================================================================================
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
       OR NEW.free_credits_granted_at IS DISTINCT FROM OLD.free_credits_granted_at
       OR NEW.payout_details IS DISTINCT FROM OLD.payout_details THEN
      RAISE EXCEPTION 'Protected shop columns cannot be modified by clients';
    END IF;
  END IF;
  RETURN NEW;
END;
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
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
       OR NEW.free_credits_granted_at IS DISTINCT FROM OLD.free_credits_granted_at
       OR NEW.referred_by_shop_id IS DISTINCT FROM OLD.referred_by_shop_id
       OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Protected profile columns cannot be modified by clients';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================================================
-- 7. Render stats for the admin (exact, no row caps)
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.admin_generation_stats(p_from TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH g AS (SELECT * FROM generations WHERE created_at >= p_from)
  SELECT jsonb_build_object(
    'total',            (SELECT count(*) FROM g),
    'completed',        (SELECT count(*) FROM g WHERE status = 'COMPLETED'),
    'failed',           (SELECT count(*) FROM g WHERE status = 'FAILED'),
    'avgMs',            (SELECT round(avg(duration_ms)) FROM g WHERE status = 'COMPLETED' AND duration_ms > 0),
    'creditsCommitted', COALESCE((SELECT SUM(credits_charged) FROM g WHERE credit_state = 'COMMITTED'), 0),
    'creditsRefunded',  COALESCE((SELECT SUM(credits_charged) FROM g WHERE credit_state = 'REFUNDED'), 0),
    -- Needs attention: delivered but never settled, or failed with the refund still pending.
    'unsettled',        (SELECT count(*) FROM generations WHERE credit_state = 'RESERVED' AND created_at < NOW() - INTERVAL '5 minutes'),
    'byProvider',       COALESCE((SELECT jsonb_object_agg(p, n) FROM (
                           SELECT COALESCE(provider, '—') AS p, count(*) AS n FROM g WHERE status = 'COMPLETED' GROUP BY 1) x), '{}'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.admin_generation_stats(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_generation_stats(TIMESTAMPTZ) TO service_role;
