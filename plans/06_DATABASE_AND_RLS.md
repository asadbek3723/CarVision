# 06_DATABASE_AND_RLS.md
**Project Name:** CarVision — AI Automotive Ecosystem
**Document Type:** PostgreSQL Schema, Indexes, Row Level Security (RLS) Policies, Credit Ledger & Locking Strategy
**Version:** 1.0.0 (Production Blueprint)
**Depends on:** 01_PRD_BUSINESS_LOGIC.md, 04_ARCHITECTURE.md, 05_CODING_STANDARDS.md

---

## 0. HUJJAT MAQSADI VA QOIDALAR

Ushbu fayl CarVision'ning **yagona haqiqat manbai (Single Source of Truth)** bo'lgan ma'lumotlar bazasi sxemasini belgilaydi. Qoidalar:

1. **Pul har doim butun son (integer, kichik birlikda — sent/tiyin)da saqlanadi.** `DECIMAL`/`FLOAT` pul uchun ishlatilmaydi (05-hujjat qoidasi). Masalan, $29.00 → `2900` (`amount_cents`).
2. **Har bir jadval uchun RLS (Row Level Security) majburiy yoqilgan.** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` yozilmagan jadval production'ga chiqmaydi.
3. **Barcha ID'lar `UUID` (v4), `gen_random_uuid()` orqali.** Ketma-ket integer ID'lar ishlatilmaydi (ular orqali raqib kompaniyalar sizning foydalanuvchilar sonini hisoblab chiqa olmasligi uchun).
4. **`super_admin` tekshiruvi `auth.jwt()` ichidagi maxsus claim orqali, alohida jadval orqali emas.** Sabab — RLS siyosatlarida qo'shimcha JOIN sekinlashtirmasligi uchun `is_super_admin()` SQL funksiyasi ishlatiladi (pastda ko'rsatilgan).
5. **Soft-delete qoidasi:** Hech bir jadvalda `DELETE` ishlatilmaydi (moliyaviy audit uchun). Buning o'rniga `deleted_at TIMESTAMPTZ` ustuni va `is_active BOOLEAN` bor. Faqat `credit_ledger` kabi append-only jadvallarda umuman update/delete yo'q.
6. **Vaqt mintaqasi:** Barcha `TIMESTAMPTZ` (timezone bilan), UTC formatida saqlanadi, frontend lokal vaqtga o'giradi.

---

## 1. KENGAYTMALAR VA UMUMIY FUNKSIYALAR (EXTENSIONS & HELPER FUNCTIONS)

```sql
-- 1.1. Zarur kengaytmalar
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid() uchun
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- ism/telefon bo'yicha tezkor qidiruv (Admin panel)
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- vaqt oralig'i cheklovlari uchun

-- 1.2. Joriy foydalanuvchi rolini olish (auth.users metadata'dan)
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'anonymous'
  );
$$;

-- 1.3. Super Admin tekshiruvi (RLS siyosatlarida tez-tez ishlatiladi)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT current_user_role() = 'super_admin';
$$;

-- 1.4. Joriy foydalanuvchining o'z shop_id'sini olish (b2b_seller uchun)
CREATE OR REPLACE FUNCTION current_user_shop_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT id FROM shops WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- 1.5. updated_at ustunini avtomatik yangilovchi trigger funksiyasi
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

> **Eslatma:** `auth.uid()` va `auth.jwt()` — Supabase Auth tomonidan avtomatik taqdim etiladigan funksiyalar. Rol (`role`) foydalanuvchi ro'yxatdan o'tganda Backend (Service Role Key orqali, hech qachon frontenddan emas!) `app_metadata` ichiga yoziladi — bu orqali foydalanuvchi o'z rolini o'zi o'zgartira olmaydi.

---

## 2. ASOSIY JADVALLAR (CORE TABLES)

### 2.1. `profiles` — Foydalanuvchi Profili (auth.users kengaytmasi)

Supabase'ning o'zining `auth.users` jadvaliga tegib bo'lmaydi, shuning uchun qo'shimcha ma'lumotlar uchun 1:1 nisbatdagi `profiles` jadvali yaratiladi.

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'b2c_user'
        CHECK (role IN ('b2c_user', 'b2b_seller', 'super_admin')),
    full_name VARCHAR(150),
    phone VARCHAR(30) UNIQUE NOT NULL,
    preferred_locale VARCHAR(5) NOT NULL DEFAULT 'uz'
        CHECK (preferred_locale IN ('uz', 'en', 'ru', 'ar', 'kk', 'ky', 'tg')),
    credits_balance INT NOT NULL DEFAULT 40 CHECK (credits_balance >= 0), -- B2C boshlang'ich 40 ta bepul kredit
    device_fingerprint_initial TEXT,          -- Ro'yxatdan o'tgandagi 1-qurilma heshi
    referred_by_shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    is_fraud_suspect BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    banned_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_referred_by ON profiles(referred_by_shop_id) WHERE referred_by_shop_id IS NOT NULL;
CREATE INDEX idx_profiles_phone_trgm ON profiles USING gin (phone gin_trgm_ops);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

> `shops` jadvali pastda e'lon qilinadi; Postgres'da forward-reference uchun `shops` jadvali avval yaratilib, so'ng `ALTER TABLE profiles ADD CONSTRAINT ...` orqali bog'lash yoki ikkala jadvalni bitta migratsiyada ketma-ket (avval `shops` siz FK, keyin `ALTER`) yaratish tavsiya etiladi. Amaliy migratsiya tartibi 06.1-ilovada ko'rsatilgan.

### 2.2. `shops` — Avtoservislar (B2B)

```sql
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),                     -- B2C uchun niqoblangan ko'rinishda ishlatiladi
    exact_address TEXT NOT NULL,                -- HECH QACHON b2c_user'ga to'g'ridan-to'g'ri qaytarilmaydi
    geo_lat DECIMAL(10, 8),
    geo_lng DECIMAL(11, 8),
    phone VARCHAR(30) NOT NULL,
    logo_url TEXT,
    rating_avg DECIMAL(2, 1) NOT NULL DEFAULT 5.0,
    rating_count INT NOT NULL DEFAULT 0,

    referral_code VARCHAR(50) UNIQUE NOT NULL,
    referred_by_shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,

    current_plan_code VARCHAR(30) NOT NULL DEFAULT 'FREE_TRIAL'
        REFERENCES pricing_plans(plan_code),
    credits_balance INT NOT NULL DEFAULT 40 CHECK (credits_balance >= 0),
    plan_activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    plan_expires_at TIMESTAMPTZ,
    max_devices INT NOT NULL DEFAULT 1,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,    -- Admin bloklashi uchun
    is_verified BOOLEAN NOT NULL DEFAULT FALSE, -- Jismoniy tekshiruvdan o'tganmi
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_shops_owner_id ON shops(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_shops_referral_code ON shops(referral_code);
CREATE INDEX idx_shops_city_active ON shops(city) WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_shops_geo ON shops USING gist (ll_to_earth(geo_lat, geo_lng));
CREATE INDEX idx_shops_name_trgm ON shops USING gin (shop_name gin_trgm_ops); -- Admin qidiruvi

CREATE TRIGGER trg_shops_updated_at
    BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

> **Muhim:** `exact_address` ustuni hech qachon B2C API javobida qaytarilmaydi — buni ta'minlash RLS darajasida emas (RLS butun qatorni yashiradi yoki ko'rsatadi, ustunni emas), balki **Backend API qatlamida (PostgREST view yoki Edge Function)** amalga oshiriladi (qarang: 2.9-bo'lim, `shops_public_masked` view).

### 2.3. `pricing_plans` — Tarif Rejalari (Admin tomonidan boshqariladi)

Barcha narx va limit konstantalari kodda emas, bazada — Admin ularni deploy qilmasdan o'zgartira oladi.

```sql
CREATE TABLE pricing_plans (
    plan_code VARCHAR(30) PRIMARY KEY,
    display_name_i18n JSONB NOT NULL,           -- {"uz": "...", "en": "...", ...}
    price_cents INT NOT NULL CHECK (price_cents >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    image_credits INT NOT NULL CHECK (image_credits >= 0),
    validity_days INT NOT NULL DEFAULT 30,
    max_devices INT NOT NULL DEFAULT 1,
    allow_night_mode BOOLEAN NOT NULL DEFAULT FALSE,
    watermark_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    anchor_crossed_price_cents INT,              -- Marketing uchun "o'rniga" narxi
    badge_text_i18n JSONB,
    sort_order INT NOT NULL DEFAULT 0,
    is_purchasable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_pricing_plans_updated_at
    BEFORE UPDATE ON pricing_plans
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Boshlang'ich 4 ta tarif (01-hujjatdagi matematikaga mos)
INSERT INTO pricing_plans (plan_code, display_name_i18n, price_cents, image_credits, validity_days, max_devices, allow_night_mode, watermark_enabled, anchor_crossed_price_cents, sort_order) VALUES
('FREE_TRIAL', '{"uz":"Bepul Sinov","en":"Free Trial"}', 0,      40,    365, 1, FALSE, TRUE,  NULL,    0),
('PRO_800',    '{"uz":"PRO","en":"Pro"}',                 2900,  800,   30,  2, TRUE,  FALSE, NULL,    1),
('MAX_4000',   '{"uz":"MAX","en":"Max"}',                 9900,  4000,  30,  4, TRUE,  FALSE, 14500,   2),
('ULTRA_10000','{"uz":"ULTRA","en":"Ultra"}',             19900, 10000, 30,  8, TRUE,  FALSE, 36250,   3);
```

### 2.4. `system_settings` — Global Konstantalar (AI tannarxi, OCR chegaralari va h.k.)

```sql
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (key, value, description) VALUES
('ai_cost_sam2_cents',        '0.10', 'Meta SAM 2 segmentatsiya tannarxi (sentda)'),
('ai_cost_flux_cents',        '0.70', 'FLUX Fill inpainting tannarxi'),
('ai_cost_upscale_cents',     '0.20', '4K upscale tannarxi'),
('deposit_percentage',        '3',    'B2C zakalat foizi'),
('deposit_min_amount_cents',  '300',  'Minimal zakalat summasi ($3.00)'),
('ocr_min_confidence',        '0.85', 'AI OCR minimal ishonch darajasi'),
('fomo_warning_threshold_pct','10',   'Limit tugashi haqida ogohlantirish chegarasi'),
('ai_generation_timeout_sec', '12',   'Fal.ai so''rovi uchun maksimal kutish vaqti'),
('unlock_mode',               '"AUTO_OCR"', 'ADR-006: AUTO_OCR (default: agar OCR confidence >= 0.85 darhol ochiladi) | ADMIN_APPROVAL');
```

---

## 3. OMBORXONA VA MASTER KATALOG (INVENTORY)

### 3.1. `master_catalog` — CarVision Global Tayyor Detallar Bazasi (500+)

"Sovuq Start" muammosini hal qiluvchi umumiy katalog — barcha servislar shu yerdan nusxa oladi.

```sql
CREATE TABLE master_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL
        CHECK (category IN (
            'FRONT_BUMPER','REAR_BUMPER','WHEELS_RIMS','TIRES','HEADLIGHTS',
            'TAILLIGHTS','SPOILER','DIFFUSER','SIDE_SKIRTS','HOOD',
            'BODY_COLOR','POLISH_COAT','WINDOW_TINT','FRONT_GRILLE'
        )),
    brand VARCHAR(100),
    compatible_models TEXT[] NOT NULL DEFAULT '{}',  -- ['Malibu 2','Tracker 2',...] bo'sh = universal
    reference_image_url TEXT NOT NULL,
    reference_price_cents INT,                        -- Faqat tavsiya, shop o'z narxini qo'yadi
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_master_catalog_category ON master_catalog(category) WHERE is_active = TRUE;
CREATE INDEX idx_master_catalog_models ON master_catalog USING gin (compatible_models);
```

### 3.2. `shop_inventory` — Har Bir Servisning Shaxsiy Ombori

```sql
CREATE TABLE shop_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    source_master_catalog_id UUID REFERENCES master_catalog(id) ON DELETE SET NULL, -- NULL = o'zining eksklyuziv tovari
    part_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    compatible_models TEXT[] NOT NULL DEFAULT '{}',
    price_cents INT NOT NULL CHECK (price_cents >= 0),
    labor_cost_cents INT NOT NULL DEFAULT 0 CHECK (labor_cost_cents >= 0),
    image_url TEXT NOT NULL,                 -- AI tomonidan fon tozalangan studiya rasmi
    image_processing_status VARCHAR(20) NOT NULL DEFAULT 'READY'
        CHECK (image_processing_status IN ('PROCESSING','READY','FAILED')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_inventory_shop_active ON shop_inventory(shop_id) WHERE is_active = TRUE;
CREATE INDEX idx_shop_inventory_category ON shop_inventory(shop_id, category);
CREATE INDEX idx_shop_inventory_models ON shop_inventory USING gin (compatible_models);

CREATE TRIGGER trg_shop_inventory_updated_at
    BEFORE UPDATE ON shop_inventory
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## 4. MASHINA SEANSLARI VA GENERATSIYALAR (CORE PRODUCT TABLES)

### 4.1. `car_sessions` — Bitta Mashinani Rasmga Olish Seansi

```sql
CREATE TABLE car_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL, -- B2B kontekstida qaysi do'konda
    capture_mode VARCHAR(20) NOT NULL DEFAULT 'QUICK'
        CHECK (capture_mode IN ('QUICK', 'FULL_360')),
    detected_make VARCHAR(50),
    detected_model VARCHAR(100),
    detected_year_range VARCHAR(20),
    confirmed_model TEXT,                     -- Usta [O'zgartirish ✎] bosgandan keyingi qiymat
    auto_fitment_confidence DECIMAL(3,2),
    status VARCHAR(20) NOT NULL DEFAULT 'CAPTURING'
        CHECK (status IN ('CAPTURING','CONFIGURING','GENERATING','COMPLETED','ABANDONED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_car_sessions_user ON car_sessions(user_id, created_at DESC);
CREATE INDEX idx_car_sessions_shop ON car_sessions(shop_id, created_at DESC) WHERE shop_id IS NOT NULL;

CREATE TRIGGER trg_car_sessions_updated_at
    BEFORE UPDATE ON car_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 4.2. `session_photos` — Har Bir Rakursning Original Rasmi

```sql
CREATE TABLE session_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES car_sessions(id) ON DELETE CASCADE,
    angle_id SMALLINT NOT NULL CHECK (angle_id BETWEEN 1 AND 8),
    original_image_url TEXT NOT NULL,
    sam2_mask_data JSONB,                     -- Keshlangan segmentatsiya natijasi (qayta ishlatish uchun)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, angle_id)
);

CREATE INDEX idx_session_photos_session ON session_photos(session_id);
```

### 4.3. `generations` — AI Natijalari (Rasm Tarixi va Kredit Ledgeriga Bog'liq)

```sql
CREATE TABLE generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES car_sessions(id) ON DELETE CASCADE,
    session_photo_id UUID NOT NULL REFERENCES session_photos(id),
    selected_inventory_ids UUID[] NOT NULL DEFAULT '{}',  -- Shu rasmda tanlangan detallar
    night_mode BOOLEAN NOT NULL DEFAULT FALSE,
    output_1080p_url TEXT,
    output_4k_url TEXT,
    fal_request_id TEXT,                      -- Tashqi provayder so'rov ID'si (debugging uchun)
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED','PROCESSING','SUCCESS','FAILED_TIMEOUT','FAILED_API_ERROR')),
    credits_charged INT NOT NULL DEFAULT 1,
    actual_fal_cost_cents DECIMAL(6,3),       -- Moliyaviy audit uchun aniq xarajat
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_generations_session ON generations(session_id);
CREATE INDEX idx_generations_status ON generations(status) WHERE status IN ('QUEUED','PROCESSING');
CREATE INDEX idx_generations_created ON generations(created_at DESC); -- Admin Live Monitor uchun
```

---

## 5. KREDIT LEDGERI VA ATOMAR TRANZAKSIYA (CREDIT LEDGER — APPEND-ONLY)

Bu jadval **hech qachon UPDATE yoki DELETE qilinmaydi** — faqat `INSERT`. `shops.credits_balance` — bu ledgerdan hisoblangan "kesh" qiymat (performance uchun), lekin haqiqiy audit manbai shu jadval.

```sql
CREATE TABLE credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- Har doim qaysi user sarflayotgani
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,                -- NULL = B2C user shaxsiy balansi, NOT NULL = B2B shop balansi
    generation_id UUID REFERENCES generations(id),                      -- NULL bo'lishi mumkin (manual grant uchun)
    delta_credits INT NOT NULL,                                          -- Musbat = qo'shish, Manfiy = yechish
    reason VARCHAR(30) NOT NULL CHECK (reason IN (
        'GENERATION_RESERVED', 'GENERATION_COMMITTED', 'GENERATION_ROLLED_BACK',
        'MANUAL_ADMIN_GRANT', 'REFERRAL_BONUS_B2C', 'REFERRAL_BONUS_B2B_VERIFIED',
        'PLAN_PURCHASE'
    )),
    balance_after INT NOT NULL,               -- Shu yozuvdan keyingi balans (debugging uchun)
    performed_by UUID REFERENCES auth.users(id),  -- Admin manual grant bo'lsa kim bergani
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_ledger_user ON credit_ledger(user_id, created_at DESC);
CREATE INDEX idx_credit_ledger_shop ON credit_ledger(shop_id, created_at DESC) WHERE shop_id IS NOT NULL;
CREATE INDEX idx_credit_ledger_reason ON credit_ledger(reason);
```

### 5.1. Atomar Kredit Yechish Funksiyasi (`FOR UPDATE` qulfi bilan — B2B va B2C uchun)

```sql
CREATE OR REPLACE FUNCTION reserve_credits(
    p_user_id UUID,
    p_shop_id UUID,
    p_amount INT,
    p_generation_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_balance INT;
BEGIN
    IF p_shop_id IS NOT NULL THEN
        -- B2B: Shop balansidan qulflab yechish
        SELECT credits_balance INTO v_current_balance
        FROM shops WHERE id = p_shop_id
        FOR UPDATE;

        IF v_current_balance < p_amount THEN
            RETURN FALSE; -- HTTP 402 Insufficient credits
        END IF;

        UPDATE shops SET credits_balance = credits_balance - p_amount
        WHERE id = p_shop_id;

        INSERT INTO credit_ledger (user_id, shop_id, generation_id, delta_credits, reason, balance_after)
        VALUES (p_user_id, p_shop_id, p_generation_id, -p_amount, 'GENERATION_RESERVED', v_current_balance - p_amount);
    ELSE
        -- B2C: Shaxsiy profile balansidan qulflab yechish
        SELECT credits_balance INTO v_current_balance
        FROM profiles WHERE id = p_user_id
        FOR UPDATE;

        IF v_current_balance < p_amount THEN
            RETURN FALSE; -- HTTP 402 Insufficient credits
        END IF;

        UPDATE profiles SET credits_balance = credits_balance - p_amount
        WHERE id = p_user_id;

        INSERT INTO credit_ledger (user_id, shop_id, generation_id, delta_credits, reason, balance_after)
        VALUES (p_user_id, NULL, p_generation_id, -p_amount, 'GENERATION_RESERVED', v_current_balance - p_amount);
    END IF;

    RETURN TRUE;
END;
$$;

-- Xatolikda avtomatik qaytarish
CREATE OR REPLACE FUNCTION rollback_credits(
    p_user_id UUID,
    p_shop_id UUID,
    p_amount INT,
    p_generation_id UUID
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_balance INT;
BEGIN
    IF p_shop_id IS NOT NULL THEN
        UPDATE shops SET credits_balance = credits_balance + p_amount
        WHERE id = p_shop_id
        RETURNING credits_balance INTO v_new_balance;

        INSERT INTO credit_ledger (user_id, shop_id, generation_id, delta_credits, reason, balance_after)
        VALUES (p_user_id, p_shop_id, p_generation_id, p_amount, 'GENERATION_ROLLED_BACK', v_new_balance);
    ELSE
        UPDATE profiles SET credits_balance = credits_balance + p_amount
        WHERE id = p_user_id
        RETURNING credits_balance INTO v_new_balance;

        INSERT INTO credit_ledger (user_id, shop_id, generation_id, delta_credits, reason, balance_after)
        VALUES (p_user_id, NULL, p_generation_id, p_amount, 'GENERATION_ROLLED_BACK', v_new_balance);
    END IF;
END;
$$;
```

> **Muhim:** Bu funksiyalar `SECURITY DEFINER` sifatida emas, oddiy `SECURITY INVOKER` sifatida saqlanadi, lekin faqat **Backend Service Role** orqali chaqiriladi (Edge Function / FastAPI). Frontend hech qachon to'g'ridan-to'g'ri chaqirmaydi — RLS bu funksiyalarni client'dan yopadi (6-bo'limga qarang).

---

## 6. ZAKALAT (DEPOSIT) VA BRON JADVALLARI

```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    session_id UUID REFERENCES car_sessions(id),
    total_build_price_cents INT NOT NULL CHECK (total_build_price_cents > 0),
    deposit_amount_cents INT NOT NULL CHECK (deposit_amount_cents > 0),
    deposit_currency CHAR(3) NOT NULL DEFAULT 'UZS',
    receipt_image_url TEXT,
    receipt_image_hash TEXT UNIQUE,            -- Bitta chekni 2 marta yuklashning oldini oladi
    ocr_result JSONB,                          -- {"confidence":0.96, "extracted_amount":...}
    deposit_status VARCHAR(30) NOT NULL DEFAULT 'AWAITING_RECEIPT'
        CHECK (deposit_status IN (
            'AWAITING_RECEIPT', 'PENDING_OCR', 'PENDING_ADMIN_APPROVAL',
            'VERIFIED', 'REJECTED_FAKE', 'CANCELLED'
        )),
    booking_code VARCHAR(20) UNIQUE,           -- Faqat VERIFIED bo'lgach generatsiya qilinadi
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_user ON bookings(user_id, created_at DESC);
CREATE INDEX idx_bookings_shop ON bookings(shop_id, created_at DESC);
CREATE INDEX idx_bookings_pending ON bookings(deposit_status)
    WHERE deposit_status IN ('PENDING_OCR','PENDING_ADMIN_APPROVAL');

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

> **ADR-006 eslatma:** `system_settings.unlock_mode` qiymati `'ADMIN_APPROVAL'` bo'lsa, `deposit_status = 'PENDING_OCR'` dan `'VERIFIED'` ga faqat Admin panel orqali (`reviewed_by` to'ldirilib) o'tadi. `'AUTO_OCR'` rejimida Backend Edge Function OCR natijasi `ocr_result.confidence >= system_settings.ocr_min_confidence` bo'lsa avtomatik `VERIFIED` qiladi. Ikkala yo'l ham kod darajasida tayyor, faqat sozlama almashtiriladi.

---

## 7. REFERAL TIZIMI JADVALLARI

```sql
-- B2B shop -> B2B shop taklif tekshiruvi (jismoniy verifikatsiya)
CREATE TABLE b2b_referral_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referring_shop_id UUID NOT NULL REFERENCES shops(id),
    referred_shop_id UUID NOT NULL REFERENCES shops(id) UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_FIELD_INSPECTION'
        CHECK (status IN ('PENDING_FIELD_INSPECTION','APPROVED','REJECTED')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    reward_granted_days INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_b2b_referral_status ON b2b_referral_verifications(status)
    WHERE status = 'PENDING_FIELD_INSPECTION';

-- B2C foydalanuvchining 8-tadan generatsiya bonusi tarixini kuzatish (idempotentlik uchun)
CREATE TABLE b2c_referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referred_user_id UUID NOT NULL REFERENCES auth.users(id),
    shop_id UUID NOT NULL REFERENCES shops(id),
    generation_cycle INT NOT NULL,            -- 1-sikl (8 ta), 2-sikl (16 ta) ...
    credits_awarded INT NOT NULL DEFAULT 8,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (referred_user_id, generation_cycle)  -- Bir xil bonus 2 marta berilmasligi uchun
);
```

---

## 8. QURILMALAR VA XAVFSIZLIK JADVALLARI (ANTI-SHARING)

```sql
CREATE TABLE active_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- Har bir foydalanuvchi qurilmasi
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,                -- B2B do'kon sessiyasi bo'lsa
    device_fingerprint TEXT NOT NULL,
    device_label VARCHAR(100),                -- "iPad — Front Desk" yoki "iPhone 15 Pro"
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_evicted BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX idx_active_devices_user ON active_devices(user_id) WHERE is_evicted = FALSE;
CREATE INDEX idx_active_devices_shop ON active_devices(shop_id) WHERE shop_id IS NOT NULL AND is_evicted = FALSE;

-- 24 soatda 3 martadan ortiq eviction bo'lsa Admin signaliga asos
CREATE TABLE device_eviction_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    evicted_device_fingerprint TEXT NOT NULL,
    new_device_fingerprint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eviction_log_user_time ON device_eviction_log(user_id, created_at DESC);
```

---

## 9. ADMIN AUDIT VA FOYDALI VIEW'LAR

### 9.1. `admin_audit_log` — Har Bir Admin Harakati Yoziladi

```sql
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action_type VARCHAR(50) NOT NULL,          -- 'GRANT_CREDITS', 'BAN_SHOP', 'APPROVE_B2B_REFERRAL', ...
    target_table VARCHAR(50),
    target_id UUID,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX idx_admin_audit_target ON admin_audit_log(target_table, target_id);
```

### 9.2. `shops_public_masked` — B2C Marketplace uchun Xavfsiz View

```sql
CREATE VIEW shops_public_masked AS
SELECT
    id,
    district,
    rating_avg,
    rating_count,
    logo_url,
    CASE WHEN is_verified THEN 'Verified Partner #' || RIGHT(id::TEXT, 4)
         ELSE 'Partner #' || RIGHT(id::TEXT, 4) END AS masked_label
FROM shops
WHERE is_active = TRUE AND deleted_at IS NULL;
```

> Haqiqiy `exact_address` va `phone` bu view'da umuman yo'q — ular faqat Edge Function ichida, `bookings.deposit_status = 'VERIFIED'` tekshiruvidan keyin alohida so'rov bilan olinadi.

### 9.3. `admin_financial_summary` — Moliyaviy Analitika (Admin Dashboard uchun)

```sql
CREATE VIEW admin_financial_summary AS
SELECT
    date_trunc('day', g.created_at) AS day,
    COUNT(*) FILTER (WHERE g.status = 'SUCCESS') AS successful_generations,
    SUM(g.actual_fal_cost_cents) FILTER (WHERE g.status = 'SUCCESS') AS total_ai_cost_cents,
    COUNT(DISTINCT cs.shop_id) AS active_shops
FROM generations g
JOIN car_sessions cs ON cs.id = g.session_id
GROUP BY 1
ORDER BY 1 DESC;
```

---

## 10. ROW LEVEL SECURITY (RLS) SIYOSATLARI

Har bir jadval uchun 4 ta standart siyosat yoziladi: `SELECT`, `INSERT`, `UPDATE`, `DELETE` (yoki ularning kerakli qismi). Umumiy qoida: **`super_admin` har doim hamma narsani ko'radi**, boshqa rollar faqat o'zinikini.

### 10.1. `profiles`

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own_or_admin" ON profiles
    FOR SELECT USING (id = auth.uid() OR is_super_admin());

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid())); -- rolni o'zgartirib bo'lmaydi

CREATE POLICY "profiles_admin_full_access" ON profiles
    FOR ALL USING (is_super_admin());
```

### 10.2. `shops`

```sql
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- B2C foydalanuvchilar niqoblangan view orqali ko'radi (shops_public_masked), bu jadvalga to'g'ridan-to'g'ri tegmaydi
CREATE POLICY "shops_select_own" ON shops
    FOR SELECT USING (owner_id = auth.uid() OR is_super_admin());

CREATE POLICY "shops_update_own_limited" ON shops
    FOR UPDATE USING (owner_id = auth.uid())
    WITH CHECK (
        owner_id = auth.uid()
        -- credits_balance va current_plan_code ustunlarini o'zi o'zgartira olmaydi:
        AND credits_balance = (SELECT credits_balance FROM shops WHERE id = shops.id)
        AND current_plan_code = (SELECT current_plan_code FROM shops WHERE id = shops.id)
    );

CREATE POLICY "shops_insert_own" ON shops
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "shops_admin_full_access" ON shops
    FOR ALL USING (is_super_admin());
```

> **Izoh:** `credits_balance` va `current_plan_code`'ni faqat Backend Service Role (RLS'dan chetlab o'tadigan `service_role` kaliti) yoki yuqoridagi `reserve_credits()`/`rollback_credits()` SQL funksiyalari o'zgartiradi. Oddiy `authenticated` roli uchun `WITH CHECK` bu ustunlarni "muzlatadi".

### 10.3. `shop_inventory`

```sql
ALTER TABLE shop_inventory ENABLE ROW LEVEL SECURITY;

-- Hamma (shu jumladan anonim B2C foydalanuvchi ham) faol tovarlarni ko'ra oladi (marketplace uchun)
CREATE POLICY "inventory_select_active_public" ON shop_inventory
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "inventory_full_access_own_shop" ON shop_inventory
    FOR ALL USING (shop_id = current_user_shop_id() OR is_super_admin());
```

### 10.4. `car_sessions` va `session_photos`

```sql
ALTER TABLE car_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_owner_full_access" ON car_sessions
    FOR ALL USING (user_id = auth.uid() OR is_super_admin());

-- Usta o'z do'konida ochilgan (mijoz tomonidan yaratilgan) seanslarni ham ko'rishi kerak:
CREATE POLICY "sessions_shop_staff_view" ON car_sessions
    FOR SELECT USING (shop_id = current_user_shop_id());

ALTER TABLE session_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_photos_via_session" ON session_photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM car_sessions cs
            WHERE cs.id = session_photos.session_id
            AND (cs.user_id = auth.uid() OR cs.shop_id = current_user_shop_id() OR is_super_admin())
        )
    );
```

### 10.5. `generations`

```sql
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generations_via_session" ON generations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM car_sessions cs
            WHERE cs.id = generations.session_id
            AND (cs.user_id = auth.uid() OR cs.shop_id = current_user_shop_id() OR is_super_admin())
        )
    );

-- INSERT/UPDATE faqat Backend (service_role) orqali — client to'g'ridan-to'g'ri generatsiya yoza olmaydi
-- (status, credits_charged kabi maydonlarni soxtalashtirmasligi uchun). Shuning uchun bu yerda
-- authenticated rol uchun INSERT/UPDATE siyosati YOZILMAYDI — faqat Edge Function/API chaqiradi.
```

### 10.6. `credit_ledger`

```sql
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;

-- Faqat o'qish uchun, faqat o'z do'koni yoki admin. Yozish faqat SQL funksiyalar orqali (yuqorida).
CREATE POLICY "credit_ledger_select_own" ON credit_ledger
    FOR SELECT USING (shop_id = current_user_shop_id() OR is_super_admin());
```

### 10.7. `bookings`

```sql
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_select_own" ON bookings
    FOR SELECT USING (
        user_id = auth.uid()
        OR shop_id = current_user_shop_id()
        OR is_super_admin()
    );

CREATE POLICY "bookings_insert_own" ON bookings
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Mijoz faqat chek rasmini yuklay oladi, deposit_status'ni o'zi o'zgartira olmaydi:
CREATE POLICY "bookings_update_receipt_only" ON bookings
    FOR UPDATE USING (user_id = auth.uid() AND deposit_status = 'AWAITING_RECEIPT')
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "bookings_admin_review" ON bookings
    FOR UPDATE USING (is_super_admin());
```

### 10.8. `pricing_plans`, `master_catalog`, `system_settings` (Ommaviy o'qish, faqat Admin yozadi)

```sql
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing_plans_public_read" ON pricing_plans FOR SELECT USING (TRUE);
CREATE POLICY "pricing_plans_admin_write" ON pricing_plans FOR ALL USING (is_super_admin());

ALTER TABLE master_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_catalog_public_read" ON master_catalog FOR SELECT USING (is_active = TRUE);
CREATE POLICY "master_catalog_admin_write" ON master_catalog FOR ALL USING (is_super_admin());

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_settings_admin_only" ON system_settings FOR ALL USING (is_super_admin());
```

### 10.9. `active_devices`, `device_eviction_log`, `admin_audit_log`, Referral jadvallari

```sql
ALTER TABLE active_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active_devices_own_shop" ON active_devices
    FOR ALL USING (shop_id = current_user_shop_id() OR is_super_admin());

ALTER TABLE device_eviction_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eviction_log_admin_only" ON device_eviction_log FOR SELECT USING (is_super_admin());

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_admin_only" ON admin_audit_log FOR ALL USING (is_super_admin());

ALTER TABLE b2b_referral_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "b2b_referral_own_or_admin" ON b2b_referral_verifications
    FOR SELECT USING (
        referring_shop_id = current_user_shop_id()
        OR referred_shop_id = current_user_shop_id()
        OR is_super_admin()
    );
CREATE POLICY "b2b_referral_admin_write" ON b2b_referral_verifications
    FOR UPDATE USING (is_super_admin());

ALTER TABLE b2c_referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "b2c_rewards_shop_or_admin" ON b2c_referral_rewards
    FOR SELECT USING (shop_id = current_user_shop_id() OR is_super_admin());
```

---

## 11. TEZLIK (PERFORMANCE) QOIDALARI

1. **`FOR UPDATE` qulfi faqat `shops` qatoriga qo'yiladi**, hech qachon butun jadvalga emas — parallel 10 ta planshet bir vaqtda ishlashi mumkin, chunki har biri **boshqa-boshqa `shop_id`** qatorini qulflaydi (bir xil do'konning o'zida ketma-ket navbat turadi, bu to'g'ri xatti-harakat).
2. **`credit_ledger` jadvali faqat `INSERT`** bo'lgani uchun unda hech qanday `FOR UPDATE` kerak emas — yozuvlar parallel kirishi mumkin.
3. Admin Live Monitor (`generations` jadvalidan `status IN ('QUEUED','PROCESSING')` so'rovi) uchun **qisman indeks (partial index)** ishlatildi — bu jadval millionlab qatorga yetganda ham tezkor qoladi.
4. `shops_public_masked` kabi view'lar **`SECURITY INVOKER`** rejimida ishlaydi (Postgres standart xatti-harakati) — ya'ni RLS siyosatlari view orqali ham qo'llanadi, bu xavfsizlik teshigini oldini oladi.

---

## 12. OCHIQ SAVOLLAR (OPEN QUESTIONS)

- **Q1 (ADR-006 davomi):** `unlock_mode` sozlamasi `AUTO_OCR` ga o'tganda, `reviewed_by`/`reviewed_at` ustunlari tizim (`service_role`) tomonidan to'ldiriladimi yoki `NULL` qoldiriladimi? Tavsiya: maxsus `SYSTEM_AI_OCR` UUID konstantasi ishlatish (audit tarixida "kim tasdiqladi" doim bo'sh bo'lmasligi uchun).
- **Q2 (02-hujjatdan meros):** Zakalat bekor qilinsa (`CANCELLED`), pul mijozga qaytariladimi yoki shop balansiga o'tadimi? Bu `bookings` jadvaliga ta'sir qilmaydi, lekin **moliyaviy qoida sifatida 01-hujjatda** hal qilinishi kerak — chunki buning uchun alohida `refunds` jadvali kerak bo'lishi mumkin.
- **Q3 (yangi):** `master_catalog`'dan `shop_inventory`'ga import qilinganda narx avtomatik `reference_price_cents`'dan nusxalanadimi yoki har doim bo'sh ($0) holda qoladi, usta albatta o'zi kiritishi shart bo'ladimi? Tavsiya: bo'sh qoldirish — tasodifiy noto'g'ri narx bilan savdo bo'lib ketmasligi uchun.

---

Navbatdagi fayl: **07_AI_PIPELINE.md** — Fal.ai integratsiyasi, SAM 2 segmentatsiya, FLUX Fill prompt-mashinasi, navbat (queue) arxitekturasi va webhook kontrakti (ADR-007 spike natijasi shu yerda yopiladi).
