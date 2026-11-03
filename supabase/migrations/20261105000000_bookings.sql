-- CarVision: bookings with 3% deposit (escrow), receipts and voucher redemption
-- Migration: 20261105000000_bookings.sql   (idempotent)
-- Requires 20261103000000 and 20261104000000.

DO $$
BEGIN
    IF to_regclass('public.catalog_items') IS NULL THEN
        RAISE EXCEPTION 'Avval 20261104000000_catalog.sql migratsiyasini ishga tushiring';
    END IF;
    -- A bookings table from an older schema (different shape) is kept as bookings_legacy_20261105
    IF to_regclass('public.bookings') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'booking_number')
       OR to_regclass('public.bookings') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'deposit_cents') THEN
        ALTER TABLE public.bookings RENAME TO bookings_legacy_20261105;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT' CHECK (status IN (
        'AWAITING_PAYMENT', 'PENDING_ADMIN_APPROVAL', 'UNLOCKED', 'REDEEMED', 'REJECTED', 'CANCELLED'
    )),
    total_cents INT NOT NULL CHECK (total_cents >= 0),
    deposit_cents INT NOT NULL CHECK (deposit_cents > 0),
    redemption_code VARCHAR(12) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    customer_note VARCHAR(500),
    receipt_path TEXT,
    receipt_hash VARCHAR(64) UNIQUE,
    rejected_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    receipt_submitted_at TIMESTAMPTZ,
    unlocked_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    UNIQUE (shop_id, redemption_code)
);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_shop ON public.bookings(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(100),
    image_url TEXT,
    unit_cents INT NOT NULL CHECK (unit_cents >= 0),
    quantity INT NOT NULL CHECK (quantity BETWEEN 1 AND 99)
);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items(booking_id);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

-- Customers read their own bookings. Workshops get their leads through the server only,
-- after the deposit is approved (customer contact must not leak earlier).
DROP POLICY IF EXISTS "Customers read own bookings" ON public.bookings;
CREATE POLICY "Customers read own bookings" ON public.bookings FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin());
DROP POLICY IF EXISTS "Customers read own booking items" ON public.booking_items;
CREATE POLICY "Customers read own booking items" ON public.booking_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.is_super_admin())));
REVOKE ALL ON public.bookings, public.booking_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.bookings, public.booking_items FROM authenticated;

-- Private bucket for payment receipts (only the server, via signed URLs, can read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipts', 'receipts', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Admin approval: one transaction (status + audit log), only from PENDING_ADMIN_APPROVAL
CREATE OR REPLACE FUNCTION public.admin_review_booking(
    p_admin_id UUID, p_booking_id UUID, p_approve BOOLEAN, p_reason TEXT, p_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status TEXT;
    v_new TEXT;
BEGIN
    SELECT status INTO v_status FROM bookings WHERE id = p_booking_id FOR UPDATE;
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
           rejected_reason = CASE WHEN p_approve THEN NULL ELSE LEFT(COALESCE(p_reason, 'Chek tasdiqlanmadi'), 300) END
     WHERE id = p_booking_id;
    INSERT INTO admin_audit_log (admin_id, action, target_entity, target_id, payload_before, payload_after, ip_address)
    VALUES (p_admin_id, CASE WHEN p_approve THEN 'APPROVE_DEPOSIT' ELSE 'REJECT_DEPOSIT' END, 'bookings', p_booking_id,
            jsonb_build_object('status', v_status), jsonb_build_object('status', v_new, 'reason', p_reason), p_ip);
    RETURN jsonb_build_object('success', true, 'status', v_new);
END;
$$;

-- Voucher redemption by the workshop: atomic UNLOCKED -> REDEEMED, scoped to that workshop
CREATE OR REPLACE FUNCTION public.redeem_booking(p_shop_id UUID, p_code TEXT)
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
       AND (upper(booking_number) = upper(p_code) OR redemption_code = p_code)
     FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;
    IF v_status = 'REDEEMED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_REDEEMED', 'bookingId', v_id);
    END IF;
    IF v_status <> 'UNLOCKED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_PAID', 'state', v_status);
    END IF;
    UPDATE bookings SET status = 'REDEEMED', redeemed_at = NOW() WHERE id = v_id;
    RETURN jsonb_build_object('success', true, 'bookingId', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_booking(UUID, UUID, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_booking(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_booking(UUID, UUID, BOOLEAN, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_booking(UUID, TEXT) TO service_role;
GRANT ALL ON public.bookings, public.booking_items TO service_role;
