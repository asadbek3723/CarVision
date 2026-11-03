-- CarVision Core Database Schema
-- Migration: 20261016000000_core_schema.sql

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Helper Functions for Roles & Auth
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'anonymous'
  );
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT current_user_role() = 'super_admin';
$$;

CREATE OR REPLACE FUNCTION current_user_shop_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT id FROM shops WHERE owner_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. Pricing Plans Table
CREATE TABLE pricing_plans (
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

-- 4. System Settings (Exchange rates, Escrow card, Defaults)
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_deposit_percent NUMERIC(4,2) NOT NULL DEFAULT 3.00,
    escrow_min_deposit_cents INT NOT NULL DEFAULT 1000,
    escrow_card_pan VARCHAR(30) NOT NULL DEFAULT '8600 •••• •••• 9921',
    escrow_card_holder VARCHAR(100) NOT NULL DEFAULT 'CarVision Escrow LLC',
    rate_usd_to_uzs INT NOT NULL DEFAULT 13000,
    rate_usd_to_aed NUMERIC(6,4) NOT NULL DEFAULT 3.6725,
    rate_usd_to_try NUMERIC(6,2) NOT NULL DEFAULT 34.20,
    rate_usd_to_kgs NUMERIC(6,2) NOT NULL DEFAULT 86.50,
    unlock_mode VARCHAR(20) NOT NULL DEFAULT 'AUTO_OCR' CHECK (unlock_mode IN ('AUTO_OCR', 'MANUAL_ONLY')),
    ocr_confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.85,
    b2b_referral_reward_credits INT NOT NULL DEFAULT 40,
    b2c_referral_reward_credits INT NOT NULL DEFAULT 8,
    b2c_referral_max_credits INT NOT NULL DEFAULT 40,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Profiles Table (Linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'b2c_user'
        CHECK (role IN ('b2c_user', 'b2b_seller', 'super_admin')),
    full_name VARCHAR(150),
    phone VARCHAR(30) UNIQUE NOT NULL,
    preferred_locale VARCHAR(5) NOT NULL DEFAULT 'uz'
        CHECK (preferred_locale IN ('uz', 'en', 'ru', 'ar', 'tr', 'kk', 'ky', 'tg')),
    credits_balance INT NOT NULL DEFAULT 40 CHECK (credits_balance >= 0),
    device_fingerprint_initial TEXT,
    referred_by_shop_id UUID,
    is_fraud_suspect BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    banned_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_phone_trgm ON profiles USING gin (phone gin_trgm_ops);

-- 6. Shops Table (For b2b_seller)
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE RESTRICT,
    shop_name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    exact_address VARCHAR(250) NOT NULL,
    geo_lat DOUBLE PRECISION NOT NULL,
    geo_lng DOUBLE PRECISION NOT NULL,
    phone VARCHAR(30) NOT NULL,
    logo_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    current_plan_code VARCHAR(30) NOT NULL DEFAULT 'FREE_TRIAL' REFERENCES pricing_plans(code),
    plan_expires_at TIMESTAMPTZ,
    credits_balance INT NOT NULL DEFAULT 40 CHECK (credits_balance >= 0),
    watermark_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_devices INT NOT NULL DEFAULT 1 CHECK (max_devices >= 1),
    customer_view_pin_hash TEXT,
    referral_code VARCHAR(32) UNIQUE NOT NULL,
    rating_avg NUMERIC(3,2) NOT NULL DEFAULT 5.00 CHECK (rating_avg BETWEEN 1.00 AND 5.00),
    rating_count INT NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shops_city_district ON shops(city, district);
CREATE INDEX idx_shops_owner ON shops(owner_id);

-- 7. Public Masked Shops View (For B2C Marketplace - ZERO CONTACT LEAKAGE)
CREATE OR REPLACE VIEW shops_public_masked AS
SELECT
    id,
    'Verified Partner #' || SUBSTRING(id::text, 1, 4) AS masked_label,
    city,
    district,
    geo_lat,
    geo_lng,
    logo_url,
    rating_avg,
    rating_count
FROM shops
WHERE is_verified = TRUE;

-- 8. Master Catalog Table (Curated reference items)
CREATE TABLE master_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'WHEELS_RIMS', 'FRONT_BUMPER', 'REAR_BUMPER', 'REAR_DIFFUSER',
        'SIDE_SKIRTS', 'HEADLIGHTS', 'TAILLIGHTS', 'HOOD',
        'TRUNK_SPOILER', 'BODY_COLOR', 'WINDOW_TINT', 'POLISH_COAT'
    )),
    brand VARCHAR(100) NOT NULL,
    compatible_models TEXT[] NOT NULL DEFAULT '{}',
    fitment_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    reference_image_url TEXT NOT NULL,
    reference_price_cents INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_master_catalog_category ON master_catalog(category);

-- 9. Shop Inventory Table
CREATE TABLE shop_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    master_item_id UUID REFERENCES master_catalog(id) ON DELETE SET NULL,
    part_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    brand VARCHAR(100),
    price_cents INT NOT NULL CHECK (price_cents >= 0),
    labor_cost_cents INT NOT NULL DEFAULT 0 CHECK (labor_cost_cents >= 0),
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT NOT NULL,
    fitment_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_inventory_shop_category ON shop_inventory(shop_id, category);

-- 10. Car Sessions & Photos
CREATE TABLE car_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    capture_mode VARCHAR(20) NOT NULL DEFAULT 'QUICK' CHECK (capture_mode IN ('QUICK', 'FULL_360')),
    detected_make VARCHAR(50),
    detected_model VARCHAR(50),
    detected_year_range VARCHAR(20),
    detected_body_type VARCHAR(30),
    detected_bolt_pattern VARCHAR(20),
    detected_color VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'CAPTURING' CHECK (status IN ('CAPTURING', 'ACTIVE_TUNING', 'COMPLETED', 'ARCHIVED')),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE session_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES car_sessions(id) ON DELETE CASCADE,
    angle_id INT NOT NULL CHECK (angle_id BETWEEN 1 AND 8),
    storage_path TEXT NOT NULL,
    luma_score NUMERIC(5,2),
    is_blurry BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, angle_id)
);

-- 11. Generations & Credit Ledger
CREATE TABLE generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES car_sessions(id) ON DELETE CASCADE,
    angle_id INT NOT NULL CHECK (angle_id BETWEEN 1 AND 8),
    user_id UUID NOT NULL REFERENCES profiles(id),
    shop_id UUID REFERENCES shops(id),
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
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

CREATE INDEX idx_generations_session ON generations(session_id);

CREATE TABLE credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN (
        'TRIAL_BONUS', 'PLAN_ASSIGNED', 'RESERVED', 'COMMITTED', 'REFUNDED', 'REFERRAL_REWARD'
    )),
    generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_ledger_user ON credit_ledger(user_id);
CREATE INDEX idx_credit_ledger_shop ON credit_ledger(shop_id);

-- 12. Bookings Table (3% Escrow Deposit)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number VARCHAR(32) UNIQUE NOT NULL,
    session_id UUID NOT NULL REFERENCES car_sessions(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    shop_id UUID NOT NULL REFERENCES shops(id),
    total_price_cents INT NOT NULL CHECK (total_price_cents >= 0),
    deposit_amount_cents INT NOT NULL CHECK (deposit_amount_cents > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'AWAITING_PAYMENT' CHECK (status IN (
        'AWAITING_PAYMENT', 'PENDING_ADMIN_APPROVAL', 'UNLOCKED', 'REDEEMED', 'CANCELLED_BY_SHOP', 'NO_SHOW'
    )),
    redemption_code VARCHAR(10) NOT NULL,
    receipt_image_path TEXT,
    receipt_image_hash VARCHAR(64) UNIQUE,
    appointment_date TIMESTAMPTZ NOT NULL,
    unlocked_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_shop ON bookings(shop_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);

-- 13. Active Devices & Audit Log
CREATE TABLE active_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_label VARCHAR(64) NOT NULL,
    platform VARCHAR(30) NOT NULL,
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_evicted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, device_fingerprint)
);

CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id),
    action VARCHAR(50) NOT NULL,
    target_entity VARCHAR(50) NOT NULL,
    target_id UUID,
    payload_before JSONB,
    payload_after JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
