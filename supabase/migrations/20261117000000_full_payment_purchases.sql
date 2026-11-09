-- CarVision: full-price purchases instead of the 3% deposit.
-- Migration: 20261117000000_full_payment_purchases.sql   (idempotent)
-- Requires 20261105000000_bookings.sql and 20261109000000_bookings_telegram.sql.
--
-- The customer now pays the whole price to the platform card and uploads the receipt.
-- After the admin approves it the platform keeps its commission and owes the rest to the
-- workshop (payout_cents). The admin marks that transfer by hand. A purchase cancelled by
-- the customer within the cancel window is refunded in part (refund_cents), also by hand.
-- Commission and refund amounts live only here and in the admin panel; the customer API
-- never returns them.

-- 1) deposit_cents becomes amount_cents: what the customer transfers to the platform card.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'deposit_cents')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'amount_cents') THEN
        ALTER TABLE public.bookings RENAME COLUMN deposit_cents TO amount_cents;
    END IF;
END $$;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS commission_cents INT CHECK (commission_cents IS NULL OR commission_cents >= 0),
    ADD COLUMN IF NOT EXISTS payout_cents INT CHECK (payout_cents IS NULL OR payout_cents >= 0),
    ADD COLUMN IF NOT EXISTS payout_status TEXT NOT NULL DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS payout_paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS refund_cents INT CHECK (refund_cents IS NULL OR refund_cents >= 0),
    ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payout_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payout_status_check
    CHECK (payout_status IN ('NONE', 'PENDING', 'PAID', 'VOID'));
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_refund_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_refund_status_check
    CHECK (refund_status IN ('NONE', 'PENDING', 'DONE'));

CREATE INDEX IF NOT EXISTS idx_bookings_payout ON public.bookings(payout_status) WHERE payout_status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_bookings_refund ON public.bookings(refund_status) WHERE refund_status = 'PENDING';

-- 2) Unpaid bookings from the deposit era switch to the full price (3% commission).
--    Paid or in-review deposit bookings keep their old terms (payout fields stay NULL / NONE).
UPDATE public.bookings
   SET amount_cents = total_cents,
       commission_cents = (total_cents * 300) / 10000,
       payout_cents = total_cents - (total_cents * 300) / 10000
 WHERE status IN ('AWAITING_PAYMENT', 'REJECTED')
   AND commission_cents IS NULL
   AND total_cents > 0;

-- 3) Admin approval: the receipt is for the full price. Approval also opens the payout and
--    takes the items out of stock. Only from PENDING_ADMIN_APPROVAL.
CREATE OR REPLACE FUNCTION public.admin_review_booking(
    p_admin_id UUID, p_booking_id UUID, p_approve BOOLEAN, p_reason TEXT, p_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status TEXT;
    v_payout INT;
    v_new TEXT;
BEGIN
    SELECT status, payout_cents INTO v_status, v_payout FROM bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;
    IF v_status <> 'PENDING_ADMIN_APPROVAL' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATE', 'state', v_status);
    END IF;
    v_new := CASE WHEN p_approve THEN 'UNLOCKED' ELSE 'REJECTED' END;
    UPDATE bookings
       SET status = v_new,
           unlocked_at = CASE WHEN p_approve THEN NOW() ELSE unlocked_at END,
           payout_status = CASE WHEN p_approve AND v_payout IS NOT NULL THEN 'PENDING' ELSE payout_status END,
           rejected_reason = CASE WHEN p_approve THEN NULL ELSE LEFT(COALESCE(p_reason, 'Chek tasdiqlanmadi'), 300) END
     WHERE id = p_booking_id;

    IF p_approve AND v_payout IS NOT NULL THEN
        UPDATE catalog_items ci
           SET stock = GREATEST(0, ci.stock - bi.quantity)
          FROM booking_items bi
         WHERE bi.booking_id = p_booking_id AND bi.item_id = ci.id;
    END IF;

    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, CASE WHEN p_approve THEN 'APPROVE_PAYMENT' ELSE 'REJECT_PAYMENT' END, 'bookings', p_booking_id,
            jsonb_build_object('status', v_status), jsonb_build_object('status', v_new, 'reason', p_reason), p_ip);
    RETURN jsonb_build_object('success', true, 'status', v_new);
END;
$$;

-- 4) Customer cancels a paid purchase. Allowed only while it is UNLOCKED (not handed over),
--    within p_window_hours of the approval, and before the workshop was paid out.
--    The refund (p_refund_bps of the paid amount) is then sent by the admin by hand.
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
    -- The items go back on sale
    UPDATE catalog_items ci
       SET stock = ci.stock + bi.quantity
      FROM booking_items bi
     WHERE bi.booking_id = b.id AND bi.item_id = ci.id;
    RETURN jsonb_build_object('success', true, 'refundCents', v_refund);
END;
$$;

-- 5) Admin marks the workshop payout as transferred (manual bank transfer).
CREATE OR REPLACE FUNCTION public.admin_mark_payout(p_admin_id UUID, p_booking_id UUID, p_ip TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status TEXT;
    v_payout TEXT;
BEGIN
    SELECT status, payout_status INTO v_status, v_payout FROM bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;
    IF v_payout <> 'PENDING' OR v_status NOT IN ('UNLOCKED', 'REDEEMED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATE', 'state', v_payout);
    END IF;
    UPDATE bookings SET payout_status = 'PAID', payout_paid_at = NOW() WHERE id = p_booking_id;
    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, 'MARK_PAYOUT_PAID', 'bookings', p_booking_id,
            jsonb_build_object('payout_status', v_payout), jsonb_build_object('payout_status', 'PAID'), p_ip);
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6) Admin marks a customer refund as sent (manual bank transfer).
CREATE OR REPLACE FUNCTION public.admin_mark_refund(p_admin_id UUID, p_booking_id UUID, p_ip TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_refund TEXT;
BEGIN
    SELECT refund_status INTO v_refund FROM bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;
    IF v_refund <> 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATE', 'state', v_refund);
    END IF;
    UPDATE bookings SET refund_status = 'DONE', refunded_at = NOW() WHERE id = p_booking_id;
    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, 'MARK_REFUND_DONE', 'bookings', p_booking_id,
            jsonb_build_object('refund_status', v_refund), jsonb_build_object('refund_status', 'DONE'), p_ip);
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 7) Commission, payout and refund columns must never reach the browser. The app reads
--    bookings only through the server (service role), so signed-in users lose direct SELECT.
REVOKE SELECT ON public.bookings, public.booking_items FROM authenticated;

REVOKE ALL ON FUNCTION public.admin_review_booking(UUID, UUID, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_cancel_purchase(UUID, UUID, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_mark_payout(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_mark_refund(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_booking(UUID, UUID, BOOLEAN, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_cancel_purchase(UUID, UUID, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_payout(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_refund(UUID, UUID, TEXT) TO service_role;
