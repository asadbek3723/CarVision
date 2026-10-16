# 14_CATALOG_AND_LAUNCH.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace  
**Document type:** Master Catalog Taxonomy (500+ Items), Fitment Engineering, Cold-Start SQL Seed & 5-Shop Pilot Rollout  
**Version:** 2.0.0 (Production Specification)  
**Status:** Normative. Seed data, vehicle fitment rules, deployment pipelines, and beta rollout milestones must follow this document.  
**Read together with:** `01_PRD_BUSINESS_LOGIC.md`, `04_ARCHITECTURE.md`, `06_DATABASE_AND_RLS.md`, `07_AI_PIPELINE.md`.

---

## 1. PURPOSE & THE FITMENT REALISM DIRECTIVE

In automotive customization, a software platform that ignores technical compatibility loses all credibility immediately. A workshop technician will instantly abandon an application that shows a 5-lug wheel on a 4-lug Chevrolet Cobalt or offers a pre-facelift bumper on a 2024 vehicle.

**Core Directives:**
1. **Fitment Guard:** Parts are mapped to exact model generations, bolt patterns (PCD), and body styles.
2. **Cold-Start 1-Click Import:** A newly registered workshop selects their vehicle specialties and stocks 30+ verified reference items with suggested local market pricing in under 3 minutes.
3. **Real-World Detailing Attributes:** Services include precise visible light transmission (VLT) percentages for tinting, vinyl wrap finish textures, and multi-stage ceramic coating options.

---

## 2. AUTOMOTIVE TAXONOMY & BOLT PATTERNS (LAUNCH MARKETS)

### 2.1 Region A: Uzbekistan & Central Asia (High-Volume Core)

| Make & Model | Generation / Years | Body Type | Bolt Pattern (PCD) | Center Bore (CB) | Standard Wheel Sizes | Common Tuning Items |
|---|---|---|---|---|---|---|
| **Chevrolet Malibu 2 / XL** | `2019–2024` (Facelift) | Sedan | **5x115** | 70.3 mm | 18", 19", 20" | Redline Body Kit, Vossen HF-5, Laser Headlights, Blackout Grille |
| **Chevrolet Gentra / Lacetti** | `2013–2024` | Sedan | **4x114.3** | 56.6 mm | 15", 16", 17" | Optra Premier Front Bumper, 222 Smoke Tails, BBS RS Rims |
| **Chevrolet Cobalt** | `2013–2025` | Sedan | **4x100** | 56.6 mm | 15", 16", 17" | Midnight Black Grille, Sport Splitter, R17 Vossen CV3, Tint |
| **Chevrolet Tracker 2** | `2022–2025` | Compact SUV | **5x105** | 56.6 mm | 17", 18", 19" | Redline Accents, Black Roof Wrap, Dual Exhaust Diffuser |
| **Chevrolet Onix** | `2023–2025` | Sedan | **4x100** | 56.6 mm | 16", 17", 18" | Premier Body Kit, Gloss Black Roof, Ducktail Spoiler |
| **Chevrolet Tahoe** | `2020–2024` | Fullsize SUV | **6x139.7** | 78.1 mm | 20", 22", 24" | RST Blackout Package, 22" HRE Monoblock, Power Steps |
| **Kia K5** | `2020–2025` (DL3) | Sedan | **5x114.3** | 67.1 mm | 18", 19", 20" | GT-Line Diffuser, Dual Exhaust, Vossen HF-2, Ceramic 9H |
| **BYD Song Plus DM-i / EV** | `2022–2025` | Midsize SUV | **5x114.3** | 67.1 mm | 19", 20" | Nardo Gray Wrap, Chrome Delete, 20" Forged Rims |

### 2.2 Region B: UAE (Dubai & Abu Dhabi High-End Segment)

| Make & Model | Generation / Years | Body Type | Bolt Pattern (PCD) | Center Bore (CB) | Standard Wheel Sizes | Common Tuning Items |
|---|---|---|---|---|---|---|
| **Mercedes-AMG G63** | `2019–2025` (W463A) | Luxury SUV | **5x130** | 84.1 mm | 21", 22", 23", 24" | Brabus Widestar Kit, 24" Monoblock Rims, Matte PPF |
| **BMW M3 / M4** | `2021–2025` (G80/G82) | Sports Sedan/Coupe | **5x112** | 66.6 mm | 19", 20", 21" | M-Performance Carbon Splitter, Laserlights, Satin Wrap |
| **Toyota Land Cruiser 300** | `2022–2025` | Fullsize SUV | **6x139.7** | 95.1 mm | 20", 22" | Modellista Aero Kit, 22" Forged Wheels, Thermal Tint 70% |
| **Porsche 911** | `2020–2025` (992) | Sports Coupe | **5x130** *(or Centerlock)* | 71.6 mm | 20" F / 21" R | GT3 Aerokit, Akrapovič Diffuser, Clear Bra PPF |

---

## 3. MASTER CATALOG CATEGORIES & DETAILED ATTRIBUTES

### 3.1 Category 1: Wheels & Rims (`WHEELS_RIMS`)
- **Fitment Schema:**
  - `pcd`: Enum (`'4x100'`, `'4x114.3'`, `'5x105'`, `'5x112'`, `'5x114.3'`, `'5x115'`, `'5x120'`, `'5x130'`, `'6x139.7'`)
  - `diameter_inches`: Array of integers `[15, 16, 17, 18, 19, 20, 21, 22, 23, 24]`
  - `finish_options`: Array of strings `['Gloss Black', 'Satin Black', 'Platinum Silver', 'Bronze', 'Diamond Cut', 'Hyper Black']`

### 3.2 Category 2: Aerodynamics & Body Kits
- **Front Bumpers & Splitters (`FRONT_BUMPER`):** OEM+, Sport, Aggressive Widebody, Carbon Lip.
- **Rear Bumpers & Diffusers (`REAR_DIFFUSER`):** Dual-exhaust tips, Quad-exhaust AMG-style tips, F1-style central brake strobe light.
- **Side Skirts (`SIDE_SKIRTS`):** Aero blades, step bars, carbon fiber rocker extensions.
- **Spoilers & Wings (`TRUNK_SPOILER`):** Ducktail flush lip, M-Performance carbon lip, High-rise GT wing.
- **Hoods (`HOOD`):** Carbon fiber vented hood, Power dome bulge.

### 3.3 Category 3: Automotive Optics
- **Headlights (`HEADLIGHTS`):** Full LED projector assemblies, Laser optics, DRL sequential switchback strips, Demon-eye RGB accents.
- **Taillights (`TAILLIGHTS`):** Smoke tinted lenses, Mercedes 222-style sequential LED bars, OLED GTS-style dragon scales.

### 3.4 Category 4: Detailing & Surface Finishes (Universal Fitment)
- **Vinyl Wrap (`BODY_COLOR`):**
  - Finishes: High Gloss, Satin Metallic, Ultra Matte, Color-Shift Pearl.
  - Colors: Nardo Gray, Satin Emerald Green, Chalk White, Miami Blue, Cyberpunk Purple, Satin Blackout.
- **Window Tinting (`WINDOW_TINT`):**
  - Visible Light Transmission (VLT): `5%` (Limo), `15%` (Dark), `35%` (Medium), `70%` (Thermal UV Chameleon).
- **Surface Protection (`POLISH_COAT`):**
  - 9H Two-Stage Ceramic Nano-Coating (deep wet gloss + hydrophobic water-beading).
  - Polyurethane Paint Protection Film (PPF) — Full Front Package / Complete Vehicle Matte PPF.

---

## 4. MASTER CATALOG PRODUCTION SEED DATA (`supabase/seed.sql`)

```sql
-- Clean Master Catalog Seed Data with Full Fitment Attributes
INSERT INTO master_catalog (
  id, part_name, category, brand, compatible_models, fitment_attributes, 
  reference_image_url, reference_price_cents
) VALUES

-- 1. WHEELS & RIMS
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

-- 2. FRONT BUMPERS & SPLITTERS
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

-- 3. OPTICS & LIGHTING
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

-- 4. DETAILING, WRAP & WINDOW TINT (UNIVERSAL COMPATIBILITY)
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
);
```

---

## 5. 30-DAY PILOT WITH 5 TUNING WORKSHOPS ($85 BUDGET)

To empirically validate customer conversion, optimize AI generation costs, and iron out garage usability quirks, CarVision conducts a 30-day pilot across 5 premier tuning workshops in Tashkent.

### 5.1 Financial Architecture & Budget Breakdown
- **Target Volume:**
  - 5 Partner Workshops.
  - Average 10 vehicles walk-in per shop / day.
  - Average 3 rendered angles per vehicle $\to$ 30 renders / shop / day.
  - 5 shops $\times$ 30 renders $\times$ 30 days = **4,500 total AI renders**.
- **Direct Variable Costs:**
  - 4,500 renders $\times$ $0.0100 (Fal.ai FLUX Fill + SAM 2 + 4K Upscale) = **$45.00**.
  - Supabase Managed Postgres & Storage (Pro Tier) = **$25.00 / month**.
  - Vercel Pro Hosting = **$20.00 / month**.
- **Total Pilot Infrastructure Cost:** **$90.00**.

### 5.2 4-Week Rollout Timeline

```
WEEK 1: Hardware Provisioning & 1-Click Onboarding
├── Equip each shop with a dedicated iPad 10th Gen or Samsung Galaxy Tab S9.
├── Run S-ONB-05 registration and 1-Click Master Catalog Import (stocking 40+ parts per shop).
└── Train 2 lead technicians on Smart Camera Green Lock auto-shutter & PIN Lock.

WEEK 2: Walk-In Customer Trial & Conversion Tracking
├── Staff hand locked tablet (S-STU-06) to walk-in clients during consultations.
├── Measure time-to-decision (Target: Reduction from 45 min to under 12 min).
└── Log camera alignment edge cases (lighting conditions, reflective white cars).

WEEK 3: Tuning Passport & Viral Referral Loop
├── Workshop prints QR Tuning Passport (S-STU-09) on thermal receipt or sends WhatsApp link.
├── Measure customer social sharing to Instagram Stories / Telegram groups.
└── Monitor referral credit additions (+8 credits per valid referral).

WEEK 4: 3% Escrow Deposit & B2C Marketplace Verification
├── Enable B2C Discovery Marketplace for pilot shops.
├── Test 24/7 AUTO_OCR payment verification and 6-digit redemption voucher flow.
└── Review S-ADM-02 analytics; collect workshop owners' feature feedback.
```
