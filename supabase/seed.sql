-- CarVision Production Seed Data
-- Seed: supabase/seed.sql

-- 1. Insert Pricing Plans
INSERT INTO pricing_plans (code, name, price_cents, credits, duration_days, watermark_enabled, max_devices, max_custom_items)
VALUES
    ('FREE_TRIAL', 'Free Evaluation Trial', 0, 40, 365, TRUE, 1, 10),
    ('PRO_800', 'Workshop Pro', 2900, 800, 30, FALSE, 2, 200),
    ('MAX_4000', 'Workshop Max', 9900, 4000, 30, FALSE, 4, 1000),
    ('ULTRA_10000', 'Enterprise Ultra', 19900, 10000, 30, FALSE, 8, 10000)
ON CONFLICT (code) DO UPDATE
SET price_cents = EXCLUDED.price_cents, credits = EXCLUDED.credits;

-- 2. Insert Default System Settings
INSERT INTO system_settings (
    escrow_deposit_percent, escrow_min_deposit_cents, escrow_card_pan, escrow_card_holder,
    rate_usd_to_uzs, rate_usd_to_aed, rate_usd_to_try, rate_usd_to_kgs,
    unlock_mode, ocr_confidence_threshold
)
VALUES (
    3.00, 1000, '8600 •••• •••• 9921', 'CarVision Escrow LLC',
    13000, 3.6725, 34.20, 86.50,
    'AUTO_OCR', 0.85
)
ON CONFLICT DO NOTHING;

-- 3. Master Catalog Items (Wheels, Bumpers, Optics, Wraps, Tint, Ceramic)
INSERT INTO master_catalog (
    id, part_name, category, brand, compatible_models, fitment_attributes, reference_image_url, reference_price_cents
) VALUES
-- Wheels
(
    'a1000001-0000-0000-0000-000000000001',
    'Vossen HF-5 Hybrid Forged 20"',
    'WHEELS_RIMS',
    'Vossen',
    '{"Chevrolet Malibu 2", "Kia K5", "BMW M3", "BYD Song Plus"}',
    '{"pcd": ["5x115", "5x114.3", "5x112"], "diameters": [19, 20, 21], "finishes": ["Gloss Black", "Satin Bronze", "Anthracite"]}'::jsonb,
    'https://cdn.carvision.app/catalog/vossen-hf5.webp',
    85000
),
(
    'a1000001-0000-0000-0000-000000000002',
    'BBS CI-R Platinum Silver 17"',
    'WHEELS_RIMS',
    'BBS',
    '{"Chevrolet Gentra", "Chevrolet Cobalt", "Chevrolet Onix"}',
    '{"pcd": ["4x114.3", "4x100"], "diameters": [16, 17], "finishes": ["Platinum Silver", "Satin Black"]}'::jsonb,
    'https://cdn.carvision.app/catalog/bbs-cir-17.webp',
    42000
),
(
    'a1000001-0000-0000-0000-000000000003',
    'HRE P101 Monoblok 22"',
    'WHEELS_RIMS',
    'HRE',
    '{"Mercedes-AMG G63", "Chevrolet Tahoe", "BMW X5M"}',
    '{"pcd": ["5x130", "6x139.7", "5x112"], "diameters": [21, 22, 23], "finishes": ["Satin Black", "Brushed Clear"]}'::jsonb,
    'https://cdn.carvision.app/catalog/hre-p101.webp',
    145000
),
(
    'a1000001-0000-0000-0000-000000000004',
    'Vossen CV3 Concave 17"',
    'WHEELS_RIMS',
    'Vossen',
    '{"Chevrolet Cobalt", "Chevrolet Gentra", "Chevrolet Onix"}',
    '{"pcd": ["4x100", "4x114.3"], "diameters": [17], "finishes": ["Gloss Silver", "Gloss Black"]}'::jsonb,
    'https://cdn.carvision.app/catalog/vossen-cv3-17.webp',
    38000
),

-- Bumpers & Aero
(
    'a1000002-0000-0000-0000-000000000001',
    'Malibu 2 Redline Front Bumper & Sport Grille',
    'FRONT_BUMPER',
    'OEM+',
    '{"Chevrolet Malibu 2"}',
    '{"years": [2019, 2020, 2021, 2022, 2023, 2024], "finish": "Gloss Black Trim"}'::jsonb,
    'https://cdn.carvision.app/catalog/malibu-redline-bumper.webp',
    48000
),
(
    'a1000002-0000-0000-0000-000000000002',
    'Gentra Optra Premier Front Bumper + Lip',
    'FRONT_BUMPER',
    'CustomFit',
    '{"Chevrolet Gentra"}',
    '{"years": [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]}'::jsonb,
    'https://cdn.carvision.app/catalog/gentra-optra-bumper.webp',
    24000
),
(
    'a1000002-0000-0000-0000-000000000003',
    'BMW M-Performance Carbon Front Lip Splitter',
    'FRONT_BUMPER',
    'M-Performance',
    '{"BMW M3", "BMW M4"}',
    '{"years": [2021, 2022, 2023, 2024, 2025], "material": "Dry Carbon"}'::jsonb,
    'https://cdn.carvision.app/catalog/bmw-m3-carbon-lip.webp',
    78000
),
(
    'a1000002-0000-0000-0000-000000000004',
    'Malibu 2 Sport Rear Diffuser with Quad Exhaust Tips',
    'REAR_DIFFUSER',
    'Redline Sport',
    '{"Chevrolet Malibu 2"}',
    '{"years": [2019, 2020, 2021, 2022, 2023, 2024]}'::jsonb,
    'https://cdn.carvision.app/catalog/malibu-rear-diffuser.webp',
    32000
),

-- Optics & Lighting
(
    'a1000003-0000-0000-0000-000000000001',
    'Malibu 2 Full LED Laser Projector Headlights',
    'HEADLIGHTS',
    'CustomLED',
    '{"Chevrolet Malibu 2"}',
    '{"lightingType": "Bi-LED Laser", "drl": "Dynamic Sequential White/Amber"}'::jsonb,
    'https://cdn.carvision.app/catalog/malibu-laser-led.webp',
    58000
),
(
    'a1000003-0000-0000-0000-000000000002',
    'Gentra 222 Mercedes-Style Smoke LED Taillights',
    'TAILLIGHTS',
    'Aftermarket',
    '{"Chevrolet Gentra"}',
    '{"lens": "Smoke Tint", "animation": "Sequential Welcome Strobe"}'::jsonb,
    'https://cdn.carvision.app/catalog/gentra-222-smoke.webp',
    19000
),
(
    'a1000003-0000-0000-0000-000000000003',
    'Cobalt Midnight OLED Blackout Taillights',
    'TAILLIGHTS',
    'CustomGlow',
    '{"Chevrolet Cobalt"}',
    '{"lens": "Blackout Smoke", "style": "OLED Neon Bar"}'::jsonb,
    'https://cdn.carvision.app/catalog/cobalt-midnight-tails.webp',
    16500
),

-- Detailing & Wraps
(
    'a1000004-0000-0000-0000-000000000001',
    'Gloss Nardo Gray Full Body Vinyl Wrap',
    'BODY_COLOR',
    'Inozetek',
    '{}',
    '{"hexColor": "#6E7174", "finish": "Super Gloss", "durabilityYears": 5}'::jsonb,
    'https://cdn.carvision.app/catalog/wrap-nardo-gray.webp',
    160000
),
(
    'a1000004-0000-0000-0000-000000000002',
    'Satin Metallic Emerald Green Wrap',
    'BODY_COLOR',
    '3M 2080',
    '{}',
    '{"hexColor": "#1A4D3E", "finish": "Satin Metallic", "durabilityYears": 7}'::jsonb,
    'https://cdn.carvision.app/catalog/wrap-emerald-green.webp',
    185000
),
(
    'a1000004-0000-0000-0000-000000000003',
    'Ultra Ceramic Thermal Window Tint (15% Dark)',
    'WINDOW_TINT',
    'Lumar',
    '{}',
    '{"vltPercent": 15, "uvRejection": 99, "irHeatRejection": 92}'::jsonb,
    'https://cdn.carvision.app/catalog/tint-ceramic-15.webp',
    25000
),
(
    'a1000004-0000-0000-0000-000000000004',
    '9H Multi-Stage Hydrophobic Ceramic Coating',
    'POLISH_COAT',
    'Gyeon Quartz',
    '{}',
    '{"stages": 2, "hardness": "9H", "warrantyMonths": 24}'::jsonb,
    'https://cdn.carvision.app/catalog/ceramic-coating-9h.webp',
    35000
)
ON CONFLICT (id) DO NOTHING;
