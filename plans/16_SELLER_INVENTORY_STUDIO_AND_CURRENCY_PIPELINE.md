# 16_SELLER_INVENTORY_STUDIO_AND_CURRENCY_PIPELINE.md

**Project:** CarVision — AI Car Tuning Visualizer & Parts Marketplace  
**Document Type:** Master Implementation Blueprint: Seller Inventory Ecosystem, Showroom Studio, Multi-Currency Real-Rate Engine & Global i18n  
**Version:** 1.0.0 (Normative Standard)  
**Status:** Approved Architecture  

---

## 1. STRATEGIC OVERVIEW & CORE PRINCIPLES

This document establishes the architecture for four interconnected pillars of CarVision:
1. **Role-Gated Garage (Seller Inventory vs B2C Garage):**
   - The `/garage` route is an **authenticated B2B Seller inventory management dashboard**. Regular B2C car owners never see a bare parts warehouse; instead, car owners see their personalized fleet of vehicles and booked 3% escrow projects inside `/profile` (Atelier Garaji).
2. **AI-Powered Product Onboarding (Add Part Flow):**
   - Dedicated seller workflow to photograph a physical custom part (wheels, lip, spoiler, exhaust, suspension), specify target vehicle models (compatibility: Malibu 2, BMW M4, BYD Seal, etc.), category, pricing, and stock.
   - AI Image Enhancement Pipeline: cleans background (cutout / studio lighting) and delivers a 4K luxury product showcase card.
3. **Showroom Studio Gating (Seller's Own Inventory):**
   - When a tuning studio/seller enters the 4K Studio Visualizer, the configurator surfaces **strictly their own active inventory items** (`seller_id = current_seller.id`), allowing them to present builds with parts physically in their workshop.
4. **Real-Time Multi-Currency Engine (`/api/v1/currency/rates`):**
   - Live exchange rates fetched from financial APIs (USD, UZS, RUB, AED, TRY, KGS, KZT) with 1-hour ISR caching.
   - Regardless of whether a seller inputs prices in USD or UZS, all amounts dynamically convert and round to the buyer's country currency with official symbols (`so'm`, `$`, `₽`, `د.إ`, `₺`, `сом`, `₸`).
5. **Country & Language Persistence (Global i18n):**
   - On registration or country selection, the user's preferred locale (`uz`, `ru`, `en`, `ar`, `tr`, `kk`, `ky`, `tg`) is locked across all authenticated app views (Shell, Studio, Shop, Profile, Seller).
   - Only the public Landing Page (`/`) retains independent multi-language toggle capability. Users can adjust their language at any time in Profile Settings.

---

## 2. ROLE SEPARATION & PERMISSION MATRIX

| Feature / Screen | `b2b_seller` (Tuning Studio) | `b2c_user` (Car Owner) | `super_admin` (Platform Owner) |
|---|---|---|---|
| **Home (`/`)** | Public Golden Flow Landing | Public Golden Flow Landing | Public Golden Flow Landing |
| **App Home (`/seller` -> `/dashboard`)** | Studio Telemetry, Leads, Orders | Consumer Showroom & Trends | Full Platform Admin Console |
| **Warehouse / Inventory (`/garage`)** | **Full Access:** Stock, Add Part, AI Studio Image | **Restricted / Redirect:** Redirects to `/profile` (Fleet) | Full Access (Audit Mode) |
| **4K Studio (`/customize`)** | **Showroom Mode:** Only Seller's Own Inventory | **Marketplace Mode:** All Verified Sellers' Parts | Full Catalog Inspector |
| **Shop / Marketplace (`/shop`)** | Browse & Benchmark Competitor Catalog | Browse, Filter & Add to Cart | Product Catalog Manager |
| **3% Zakalat Escrow Orders** | Manage & Fulfill Incoming Atelier Bookings | View Own Booking Vouchers & Receipts | Approve/Reject Escrow & Payouts |

---

## 3. SELLER PRODUCT ONBOARDING & AI IMAGE STUDIO

### 3.1 Flow & Route: `/garage/add` (or Modal Flow)
1. **Step 1: Capture / Upload Part Photo:**
   - Guided photo upload (drag & drop or mobile scan) of the physical spare part.
2. **Step 2: AI Clean & Studio Upgrade:**
   - Invokes `/api/v1/seller/improve-part-image`.
   - Removes messy shop floor backgrounds (BiRefNet / high-contrast edge cutout).
   - Applies studio ambient lighting, neutral dark backdrop, and ground contact shadow.
3. **Step 3: Vehicle Fitment & Specifications:**
   - Multi-select target vehicle models (Chevrolet Malibu 2, Tracker, Onix, BMW M4, BYD Seal, etc.).
   - Category selector: Wheels, Body Kit, Suspension, Interior, Performance, Optics.
   - Part name, brand, detailed technical spec (e.g. `20" Forged Monoblock 5x114.3`).
4. **Step 4: Pricing & Inventory:**
   - Base price and seller's input currency (USD / UZS).
   - In-stock quantity stepper (`stock`).
   - Labor / installation price (optional).
5. **Step 5: Immediate Database Persistence:**
   - Writes directly to Supabase `products` table with `seller_id = auth.seller.id`.
   - Instantly reflected in Seller's Warehouse and 4K Showroom Visualizer.

---

## 4. DYNAMIC REAL-RATE CURRENCY PIPELINE

### 4.1 Backend Currency Engine: `/api/v1/currency/rates`
- Fetches live mid-market exchange rates against base USD:
  - `UZS`: Central Bank of Uzbekistan / Open Exchange
  - `AED`: UAE Dirham (peg 3.6725)
  - `TRY`: Turkish Lira
  - `RUB`: Russian Ruble
  - `KGS`: Kyrgyz Som
  - `KZT`: Kazakhstani Tenge
- Caches response in-memory / Next.js cache for 3600 seconds.
- Resilient fallback rates ensure zero screen breakage if upstream APIs encounter downtime.

### 4.2 Formatting & Presentation Utility (`src/domain/currency.ts`):
- Tabular numeric formatting (`font-variant-numeric: tabular-nums`).
- Locale-specific rounding rules:
  - UZS: rounded to nearest 1,000 so'm (`3,890,000 so'm`)
  - AED: rounded to 1 dirham (`1,428 د.إ`)
  - USD: standard dollar cents (`$389.00`)
  - TRY: rounded to 1 lira (`13,300 ₺`)
  - RUB: rounded to 10 rubles (`37,500 ₽`)

---

## 5. SELLER DASHBOARD SUITE

A SaaS dashboard implementing the borderless, depth-based dark luxury design standard:
- **Left Sidebar:** Collapsible (260px / 72px) with gold active indicators:
  1. `Telemetriya` (KPI overview, revenue, leads, escrow volume)
  2. `Omborxona (Garage)` (Full inventory list, stock counters, Add Part action)
  3. `4K Studio` (Showroom configurator with own parts)
  4. `Zakalat Buyurtmalari` (Incoming client reservations)
  5. `Atelye Profili` (Workshop address, phone, working hours, AI credits)
- **Top Bar:** Breadcrumbs, live SLA badge, currency indicator, language switch, profile menu.

---

## 6. CLEANUP & PURGE MATRIX (DEAD CODE)

The following files will be permanently purged or consolidated:
1. `src/features/seller/components/SellerDashboard.tsx` (1,148-line dead mock file)
2. `src/features/marketplace/components/*` (5 obsolete masked marketplace files)
3. `src/features/video/*` (3 unmounted reel export files)
4. `src/features/studio/components/*` (6 obsolete unlinked workspace components)
5. `src/features/camera/components/*` (8 unmounted legacy reticles and compasses)
6. Duplicate routes: `/marketplace` -> consolidated into `/shop`, `/studio` -> consolidated into `/customize`.
