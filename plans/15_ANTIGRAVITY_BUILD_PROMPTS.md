# 15_ANTIGRAVITY_BUILD_PROMPTS.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace  
**Document type:** Phased Autonomous Construction Prompts, Production-Grade Blueprint & Execution Protocol  
**Version:** 2.0.0 (Master Production Specification)  
**Status:** Normative. Engineering agents (Gemini in Antigravity, Cursor, Windsurf) must execute tasks phase-by-phase in strict numerical order.  
**Read together with:** `00_AGENT_RULES.md`, `01_PRD_BUSINESS_LOGIC.md`, `02_DESIGN_SYSTEM.md`, `04_ARCHITECTURE.md`, `05_CODING_STANDARDS.md`, `06_DATABASE_AND_RLS.md`, `07_AI_PIPELINE.md`, `11_API_SPEC.md`.

---

## 1. EXECUTION PROTOCOL & THE ZERO-DEVIATION LAWS

To guarantee that CarVision compiles with **zero TypeScript warnings, zero ESLint errors, zero physical CSS direction violations, and 100% test coverage**, agents executing these prompts must adhere strictly to four rules:
1. **Atomic Phase Execution:** Complete Phase $N$, run verification tests, and only advance to Phase $N+1$ after receiving a green light. Never combine phases.
2. **Exact Signature Compliance:** Implement the exact exported types, interfaces, schemas, and function signatures provided in each prompt. Do not invent divergent types.
3. **Pure Domain Isolation:** Keep all math, validation, fitment rules, and credit logic inside pure functions in `src/domain/`. UI components and route handlers must remain thin shells.
4. **The Definition of Done Gate:** A prompt is only done when `pnpm check` (ESLint strict + `tsc --noEmit` + Vitest) passes cleanly with 0 errors.

---

## 2. PHASED BUILD DIRECTIVES (COPY-PASTE READY)

```
PHASE 0: Scaffolding, Strict Tooling & Quality Gate Scripts
   │
PHASE 1: Database DDL, RLS Policies, Atomic RPC Functions & Seed
   │
PHASE 2: Pure Domain Logic (Money, Pricing, Credits, Fitment, Angles) & Unit Tests
   │
PHASE 3: Design Tokens, Accessible UI Primitives, 8-Language i18n & RTL Layout
   │
PHASE 4: Smart Camera, Three.js 3D Wireframe, Gyro Engine & QR Bridge
   │
PHASE 5: Asynchronous AI Pipeline, Fal.ai Webhook & Realtime Broadcast
   │
PHASE 6: Tuning Studio Workspace (85/15 Viewport, Floating Dock, Live Cashier)
   │
PHASE 7: B2B Workshop Console, 1-Click Catalog Import & Customer PIN Lock
   │
PHASE 8: B2C Marketplace, Address Masking, 3% Escrow & AI Receipt OCR
   │
PHASE 9: 0$ Client-Side Video Reel Generator (WebCodecs & 808 Bass-Drop Sync)
   │
PHASE 10: Super Admin Console, Manual Billing Modal & Device Eviction
   │
PHASE 11: Serwist PWA Standalone, Offline IndexedDB Queue & Playwright E2E
```

---

### PROMPT 0: Scaffolding, Strict Tooling & Quality Gate Scripts

```markdown
### TASK: Phase 0 — Scaffolding, Strict Tooling & Quality Gate Scripts
Target Files:
- `package.json`
- `tsconfig.json`
- `eslint.config.mjs`
- `vitest.config.ts`
- `scripts/check-physical-direction.mjs`
- `styles/globals.css`
- `styles/tokens.css`
- `tailwind.config.ts`

Normative References:
- `plans/00_AGENT_RULES.md`
- `plans/02_DESIGN_SYSTEM.md` (sections 2, 3, 9)
- `plans/04_ARCHITECTURE.md` (sections 3, 5)
- `plans/05_CODING_STANDARDS.md` (sections 2, 11)

DIRECTIVES:
1. Configure `tsconfig.json` with strict compiler flags:
   - `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"noImplicitOverride": true`, `"verbatimModuleSyntax": true`, `"isolatedModules": true`.
2. Configure `eslint.config.mjs`:
   - Enforce `@typescript-eslint/strict`, `react-hooks`, `jsx-a11y`, `no-console` (warn logger only), `no-explicit-any`.
3. Create `scripts/check-physical-direction.mjs`:
   - Scans `src/**/*.{ts,tsx,css}` for forbidden physical CSS classes: `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, `border-l`, `border-r`, `rounded-l`, `rounded-r`.
   - Exits with code 1 and lists offending file lines if physical direction is detected.
4. Setup `styles/tokens.css` with CarVision "Carbon Dark" CSS variables:
   - `--bg-primary: #0A0B0F`, `--bg-surface: #12141A`, `--bg-elevated: #181B22`
   - `--accent-cyan: #19D3FF`, `--accent-glow: rgba(25, 211, 255, 0.25)`
   - `--text-primary: #FFFFFF`, `--text-secondary: #94A3B8`, `--text-muted: #64748B`
   - `--border-subtle: #232733`, `--border-active: #19D3FF`
   - Glassmorphism: `backdrop-filter: blur(16px)`, `background: rgba(18, 20, 26, 0.75)`
5. Configure `vitest.config.ts` with environment `node` for domain tests and path alias `@/*` -> `./src/*`.
6. Implement `package.json` script:
   - `"check": "pnpm lint && node scripts/check-physical-direction.mjs && tsc --noEmit && vitest run"`

VERIFICATION:
Run `pnpm check`. Must pass with 0 errors, 0 warnings.
```

---

### PROMPT 1: Database DDL, RLS Policies, Atomic RPC Functions & Seed

```markdown
### TASK: Phase 1 — Database Schema, RLS Security, Atomic RPC Functions & Seed
Target Files:
- `supabase/migrations/20261016000000_core_schema.sql`
- `supabase/migrations/20261016000001_rls_policies.sql`
- `supabase/migrations/20261016000002_atomic_functions.sql`
- `supabase/seed.sql`

Normative References:
- `plans/06_DATABASE_AND_RLS.md`
- `plans/14_CATALOG_AND_LAUNCH.md` (sections 2, 4)

DIRECTIVES:
1. Implement DDL in `20261016000000_core_schema.sql`:
   - Extensions: `pgcrypto`, `pg_trgm`, `btree_gist`.
   - Tables: `profiles` (with `credits_balance INT NOT NULL DEFAULT 40`), `shops`, `pricing_plans`, `system_settings`, `master_catalog` (with `fitment_attributes JSONB`), `shop_inventory`, `car_sessions`, `session_photos`, `generations`, `credit_ledger` (append-only), `bookings`, `b2b_referral_verifications`, `b2c_referral_rewards`, `active_devices`, `device_eviction_log`, `admin_audit_log`.
   - Create view `shops_public_masked` strictly excluding `shop_name`, `exact_address`, and `phone`.
2. Implement RLS in `20261016000001_rls_policies.sql`:
   - Enable RLS on EVERY table.
   - Helper functions: `current_user_role()`, `is_super_admin()`, `current_user_shop_id()`.
   - Explicit `SELECT`, `INSERT`, `UPDATE` policies per table. `credit_ledger` must only allow `INSERT` via database functions or `super_admin`.
3. Implement Atomic RPC Functions in `20261016000002_atomic_functions.sql`:
   - `reserve_credits(p_user_id UUID, p_shop_id UUID, p_amount INT, p_generation_id UUID)`:
     - Locks the target row (`profiles` for B2C, `shops` for B2B) using `SELECT credits_balance FROM ... FOR UPDATE`.
     - Validates balance $\ge$ amount. Deducts balance, writes `RESERVED` row to `credit_ledger`.
   - `rollback_credits(p_user_id UUID, p_shop_id UUID, p_amount INT, p_generation_id UUID)`:
     - Atomically increments balance back, writes `REFUNDED` row to `credit_ledger`.
   - `commit_credits(p_user_id UUID, p_shop_id UUID, p_amount INT, p_generation_id UUID)`:
     - Writes `DEDUCTED` row to `credit_ledger`.
   - `redeem_booking_voucher(p_redemption_code TEXT, p_shop_id UUID)`:
     - Atomically verifies `status = 'UNLOCKED'` and transitions to `REDEEMED`, recording timestamp.
4. Implement `supabase/seed.sql`:
   - Populate `pricing_plans` (`FREE_TRIAL`, `PRO_800`, `MAX_4000`, `ULTRA_10000`).
   - Populate `system_settings` with currency rates (`UZS: 13000`, `AED: 3.6725`) and `unlock_mode = 'AUTO_OCR'`.
   - Populate initial 20+ Master Catalog items with fitment attributes from `14_CATALOG_AND_LAUNCH.md`.

VERIFICATION:
Run `supabase db reset`. Verify clean application with zero errors. Verify RLS restricts reading unmasked shop details.
```

---

### PROMPT 2: Pure Domain Logic (Money, Pricing, Credits, Fitment, Angles) & Unit Tests

```markdown
### TASK: Phase 2 — Pure Business Logic, Mathematical Engines & Unit Tests
Target Files:
- `src/domain/money.ts`
- `src/domain/money.test.ts`
- `src/domain/pricing.ts`
- `src/domain/pricing.test.ts`
- `src/domain/credits.ts`
- `src/domain/credits.test.ts`
- `src/domain/angle-validator.ts`
- `src/domain/angle-validator.test.ts`
- `src/domain/fitment.ts`
- `src/domain/fitment.test.ts`
- `src/domain/referrals.ts`
- `src/domain/referrals.test.ts`

Normative References:
- `plans/01_PRD_BUSINESS_LOGIC.md` (sections 3, 5, 7.2)
- `plans/05_CODING_STANDARDS.md` (sections 4, 9, 15)
- `plans/14_CATALOG_AND_LAUNCH.md` (section 2)

EXACT TYPE DEFINITIONS & SIGNATURES:

```typescript
// src/domain/money.ts
export type Cents = number; // Integer minor units
export type BasisPoints = number; // 1% = 100 bps

export function addCents(...amounts: Cents[]): Cents;
export function subtractCents(base: Cents, decrement: Cents): Cents;
export function multiplyBps(amount: Cents, bps: BasisPoints): Cents; // Uses Math.round(amount * bps / 10000)
export function calculateDepositCents(totalPriceCents: Cents, minFloorCents?: Cents): Cents; // 3% deposit, default min 1000 cents ($10)

// src/domain/pricing.ts
export interface PriceItem {
  partPriceCents: Cents;
  laborCostCents: Cents;
}
export interface CashierSummary {
  partsTotalCents: Cents;
  laborTotalCents: Cents;
  grandTotalCents: Cents;
  depositAmountCents: Cents;
  remainingOnSiteCents: Cents;
}
export function calculateCashierTotal(items: PriceItem[]): CashierSummary;

// src/domain/credits.ts
export interface CreditAccount {
  balance: number;
  fomoWarningThreshold: number; // default 10% of plan
}
export type CreditAction = 'ALLOW' | 'SHOW_WARNING' | 'BLOCK_UPGRADE_REQUIRED';
export function evaluateCreditStatus(account: CreditAccount): CreditAction;

// src/domain/angle-validator.ts
export type CategorySlot = 
  | 'WHEELS_RIMS' | 'FRONT_BUMPER' | 'REAR_BUMPER' | 'REAR_DIFFUSER'
  | 'SIDE_SKIRTS' | 'HEADLIGHTS' | 'TAILLIGHTS' | 'HOOD' 
  | 'TRUNK_SPOILER' | 'BODY_COLOR' | 'WINDOW_TINT' | 'POLISH_COAT';

export interface AngleValidationResult {
  isCompatible: boolean;
  recommendedAngleId?: number;
  reasonKey?: string;
}
export function validateAngleForParts(angleId: number, slots: CategorySlot[]): AngleValidationResult;

// src/domain/fitment.ts
export interface VehicleFitmentSpec {
  make: string;
  model: string;
  year: number;
  boltPattern: string; // e.g. "5x115", "4x114.3"
}
export interface PartFitmentSpec {
  compatibleModels: string[];
  supportedPcd?: string[];
  yearRange?: { min: number; max: number };
}
export function isPartFitForVehicle(vehicle: VehicleFitmentSpec, part: PartFitmentSpec): boolean;
```

TEST SUITE REQUIREMENTS:
1. `money.test.ts`: Test edge cases with zero cents, integer division rounding (`multiplyBps(10005, 300) === 300`), floor enforcement (`calculateDepositCents(5000) === 1000`).
2. `pricing.test.ts`: Test empty build, 1-item build, 8-item build, verifying `partsTotal + laborTotal === grandTotal`.
3. `angle-validator.test.ts`: Verify that selecting `FRONT_BUMPER` on Angle 5 (Rear 180°) returns `isCompatible: false, recommendedAngleId: 1`. Verify that universal items (`BODY_COLOR`, `WINDOW_TINT`) are compatible on all angles 1-8.
4. `fitment.test.ts`: Verify that a wheel with `supportedPcd: ["5x115"]` fits a Chevrolet Malibu 2 (`5x115`) but is rejected for a Chevrolet Gentra (`4x114.3`).

VERIFICATION:
Run `pnpm vitest run src/domain`. 100% of domain tests must pass with 0 failures.
```

---

### PROMPT 3: Design Tokens, Accessible UI Primitives, 8-Language i18n & RTL Layout

```markdown
### TASK: Phase 3 — UI Primitives, 8-Language Dictionary & Arabic RTL Layout
Target Files:
- `messages/en.json`, `messages/uz.json`, `messages/ru.json`, `messages/ar.json`, `messages/tr.json`, `messages/kk.json`, `messages/ky.json`, `messages/tg.json`
- `src/i18n/routing.ts`
- `src/i18n/request.ts`
- `src/middleware.ts`
- `src/components/ui/Button.tsx`
- `src/components/ui/GlassCard.tsx`
- `src/components/ui/PriceTicker.tsx`
- `src/components/ui/BeforeAfterSlider.tsx`
- `src/components/ui/Sheet.tsx`
- `src/components/ui/Modal.tsx`

Normative References:
- `plans/02_DESIGN_SYSTEM.md`
- `plans/12_I18N_AND_PWA.md`

DIRECTIVES:
1. Configure `next-intl` supporting `uz` (default), `en`, `ru`, `ar`, `tr`, `kk`, `ky`, `tg`.
2. Populate all 8 locale files in `messages/` using the schema from `12_I18N_AND_PWA.md`.
3. Implement root layout with dynamic direction:
   `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`.
4. Implement UI components using Tailwind logical CSS:
   - `Button.tsx`: Variants `primary` (cyan glow), `secondary` (glass), `danger`, `ghost`. Min touch target 48px. Accessible focus ring `focus-visible:ring-2 focus-visible:ring-[#19D3FF]`.
   - `GlassCard.tsx`: Uses `bg-[rgba(18,20,26,0.75)]`, `backdrop-blur-md`, `border border-[#232733]`, `rounded-2xl`.
   - `PriceTicker.tsx`: Uses `font-variant-numeric: tabular-nums` and Framer Motion spring transition on value change.
   - `BeforeAfterSlider.tsx`: Interactive vertical divider, touch & pointer support, auto-hides HUD when dragged, swap labels in RTL without inverting image.
5. Verify zero physical classes exist (`scripts/check-physical-direction.mjs`).

VERIFICATION:
Run `pnpm check`. Inspect Arabic RTL mode in browser: margins, paddings, and flex alignments mirror correctly.
```

---

### PROMPT 4: Smart Camera, Three.js 3D Wireframe, Gyro Engine & QR Bridge

```markdown
### TASK: Phase 4 — Guided Camera, 3D Mesh Overlay, Gyroscope & Client Compression
Target Files:
- `src/features/camera/components/SmartCameraView.tsx`
- `src/features/camera/components/Camera3DOverlay.tsx`
- `src/features/camera/hooks/useDeviceSensors.ts`
- `src/features/camera/hooks/useCameraStream.ts`
- `src/features/camera/lib/image-compressor.ts`
- `src/features/camera/lib/luma-analyzer.ts`
- `src/features/camera/components/QrCameraBridgeModal.tsx`

Normative References:
- `plans/08_SMART_CAMERA.md`
- `plans/03_SCREENS_AND_FLOWS.md` (S-STU-02, S-STU-11, S-STU-12)

DIRECTIVES:
1. Implement `useCameraStream.ts`:
   - Requests `navigator.mediaDevices.getUserMedia` with constraints: `facingMode: { ideal: 'environment' }`, resolution `1920x1080` (or `3840x2160` if supported).
   - Handles `NotAllowedError` with user-friendly retry and fallback file picker.
2. Implement `useDeviceSensors.ts`:
   - Listens to `DeviceOrientationEvent` (handling iOS `requestPermission` on user gesture).
   - Calculates roll error $\Delta \theta = |\text{gamma} - 90^\circ|$ and pitch error $\Delta \phi = |\text{beta} - 0^\circ|$.
   - Emits guidance instruction: `"LEVEL_DEVICE"`, `"STEP_BACK"`, `"MOVE_CLOSER"`, `"ALIGNED"`.
3. Implement `Camera3DOverlay.tsx`:
   - Dynamically imported with `ssr: false`.
   - Renders low-poly sedan/SUV wireframe using Three.js / `@react-three/fiber` matching target angle (1 to 8).
   - Turns from dim cyan (`#19D3FF33`) to bright neon green (`#00E599`) when aligned.
4. Implement "Green Lock" Auto-Shutter:
   - When aligned within $\pm 3.0^\circ$ for 400ms consecutive, fires shutter automatically.
   - Triggers haptic pulse: `navigator.vibrate([25, 45, 25])`.
5. Implement `image-compressor.ts`:
   - Draws video frame to OffscreenCanvas, resizes max dimension to 2048px, exports clean WebP blob (< 400KB).
6. Implement `QrCameraBridgeModal.tsx`:
   - On desktop, displays QR code pointing to `/[locale]/camera-bridge/[token]`.
   - Uses Supabase Realtime channel to receive beamed photos instantly.

VERIFICATION:
Run camera tests. Verify WebP compressed payload is under 400 KB and orientation math calculates correct angle deltas.
```

---

### PROMPT 5: Asynchronous AI Pipeline, Fal.ai Webhook & Realtime Broadcast

```markdown
### TASK: Phase 5 — AI Provider Adapter, Vision Vehicle ID & Webhook Settlement
Target Files:
- `src/server/providers/ai/interface.ts`
- `src/server/providers/ai/fal-provider.ts`
- `src/server/providers/ai/circuit-breaker.ts`
- `src/app/api/v1/sessions/[id]/detect-car/route.ts`
- `src/app/api/v1/generations/route.ts`
- `src/app/api/v1/webhooks/fal/route.ts`
- `src/server/jobs/sweeper-cron.ts`

Normative References:
- `plans/07_AI_PIPELINE.md`
- `plans/11_API_SPEC.md` (sections 4, 5)
- `plans/13_EDGE_CASES_AND_ERRORS.md` (section 3)

DIRECTIVES:
1. Implement `ImageEditProvider` interface and `FalImageEditProvider`:
   - Dual-conditioning: loads reference item image URL from `shop_inventory`, creates target slot mask via SAM 2, passes to FLUX Fill.
   - Submits job to Fal queue and registers webhook callback.
2. Implement `FalCircuitBreaker`:
   - Implements `CLOSED` $\to$ `OPEN` (after 5 failures) $\to$ `HALF_OPEN` state machine.
3. Implement `POST /api/v1/sessions/:id/detect-car`:
   - Calls Vision LLM on angle 1 photo. Returns make, model, year range, bolt pattern, and confidence.
4. Implement `POST /api/v1/generations`:
   - Validates payload with Zod `createGenerationSchema`.
   - Enforces idempotency key from header.
   - Calls atomic RPC `reserve_credits(user_id, shop_id, 1, gen_id)`.
   - Submits to Fal.ai; returns HTTP 202 Accepted in < 150ms.
5. Implement `POST /api/v1/webhooks/fal`:
   - Verifies `x-fal-webhook-secret` and HMAC signature.
   - On success: downloads outputs, uploads to Supabase `outputs/` bucket, calls `commit_credits()`, broadcasts via Realtime.
   - On error: calls atomic RPC `rollback_credits()`, broadcasts error via Realtime.
6. Implement `sweeper-cron.ts`:
   - Finds stuck jobs (> 90s) and triggers automated credit refunds.

VERIFICATION:
Unit test webhook HMAC verification and credit rollback on simulated provider timeout.
```

---

### PROMPT 6: Tuning Studio Workspace (85/15 Viewport, Floating Dock, Live Cashier)

```markdown
### TASK: Phase 6 — Studio Configurator, Floating Dock & Real-Time Cashier
Target Files:
- `src/features/studio/components/StudioWorkspace.tsx`
- `src/features/studio/components/VehicleViewport.tsx`
- `src/features/studio/components/FloatingBottomDock.tsx`
- `src/features/studio/components/AngleSelectorBar.tsx`
- `src/features/studio/components/ItemizedSummaryDrawer.tsx`
- `src/features/studio/hooks/useStudioSession.ts`

Normative References:
- `plans/02_DESIGN_SYSTEM.md` (section 5)
- `plans/03_SCREENS_AND_FLOWS.md` (S-STU-04, S-STU-06, S-STU-07)

DIRECTIVES:
1. Implement `VehicleViewport.tsx`:
   - Vehicle occupies 62% (dock open) to 85% (dock collapsed) of viewport area (`object-fit: contain`).
   - Integrated `BeforeAfterSlider.tsx` comparing original capture with 4K tuned render.
   - Auto-Hide HUD: Interacting with canvas fades out bottom dock and top bar in 200ms (`opacity-0 pointer-events-none`).
2. Implement `FloatingBottomDock.tsx`:
   - Horizontal scroll-snap category chips (`Wheels`, `Bumpers`, `Optics`, `Wrap`, `Tint`, `Ceramic`).
   - Selecting a category reveals item cards with real stock photos, brand badges, and prices.
   - In phone landscape orientation, automatically switches to a 28% vertical side drawer.
3. Implement `AngleSelectorBar.tsx`:
   - 8-point compass or thumbnail strip allowing quick switching between captured angles.
4. Implement Top Bar & Dynamic Cashier:
   - Displays running parts + labor total in `PriceTicker.tsx`.
   - Tapping cashier opens `ItemizedSummaryDrawer.tsx` showing parts list, labor breakdown, and 3% escrow deposit preview.

VERIFICATION:
Verify responsive layout on 320px phone portrait, 800px tablet, and 4K desktop with zero clipping.
```

---

### PROMPT 7: B2B Workshop Console, 1-Click Catalog Import & Customer PIN Lock

```markdown
### TASK: Phase 7 — Workshop Inventory Management, 1-Click Catalog Import & PIN Lock
Target Files:
- `src/features/seller/components/SellerDashboard.tsx`
- `src/features/seller/components/OneClickCatalogImporter.tsx`
- `src/features/seller/components/CustomPartUploader.tsx`
- `src/features/seller/components/CustomerViewLockModal.tsx`
- `src/features/seller/components/RedeemVoucherModal.tsx`
- `src/app/[locale]/seller/page.tsx`

Normative References:
- `plans/03_SCREENS_AND_FLOWS.md` (S-SEL-01 to S-SEL-10)
- `plans/14_CATALOG_AND_LAUNCH.md` (sections 1, 3)

DIRECTIVES:
1. Implement `SellerDashboard.tsx`:
   - Displays real-time credit meter, plan status, quick action buttons (`Start New Car`, `Stock Manager`).
   - Low credit FOMO banner when balance $< 10\%$ of monthly quota.
2. Implement `OneClickCatalogImporter.tsx` (`S-SEL-03`):
   - Allows shop to select car specialties (e.g., Chevrolet, BMW, Mercedes), reviews items with suggested prices, and imports 30+ items in bulk.
3. Implement `CustomPartUploader.tsx` (`S-SEL-04`):
   - Workshop uploads custom wheel/part photo; server invokes background removal; saves clean asset to shop inventory.
4. Implement `CustomerViewLockModal.tsx` (`M-09`):
   - Staff sets 4-digit PIN to lock tablet into Showroom Mode before handing to walk-in customer. Hides wholesale prices, credits, and settings.
5. Implement `RedeemVoucherModal.tsx` (`S-SEL-08`):
   - Staff enters 6-digit customer booking code (`XXX-XXX`) to redeem 3% deposit against final invoice.

VERIFICATION:
Test 1-click import populates `shop_inventory` with correct UUID references and default price margins.
```

---

### PROMPT 8: B2C Marketplace, Address Masking, 3% Escrow & AI Receipt OCR

```markdown
### TASK: Phase 8 — Discovery Marketplace, Address Masking & 24/7 AI Receipt OCR
Target Files:
- `src/features/marketplace/components/MarketplaceShopList.tsx`
- `src/features/marketplace/components/MaskedShopCard.tsx`
- `src/features/marketplace/components/DepositCheckoutModal.tsx`
- `src/features/marketplace/components/ReceiptUploadModal.tsx`
- `src/features/marketplace/components/VoucherUnlockedScreen.tsx`
- `src/app/api/v1/bookings/[id]/submit-receipt/route.ts`

Normative References:
- `plans/01_PRD_BUSINESS_LOGIC.md` (sections 6.8, 6.9)
- `plans/10_ADMIN_AND_SECURITY.md` (section 4)
- `plans/11_API_SPEC.md` (section 6)

DIRECTIVES:
1. Implement `MarketplaceShopList.tsx`:
   - Fetches from `shops_public_masked` view. Shows masked labels (e.g., *"Verified Partner #B123"*), district, rating, and distance.
   - Enforces database-level masking: private shop phone and exact address are physically absent from API response.
2. Implement `DepositCheckoutModal.tsx`:
   - Calculates 3% escrow deposit (min $10.00 / 130,000 UZS).
   - Displays payment card details and countdown timer (45 minutes).
3. Implement `ReceiptUploadModal.tsx` & `POST /api/v1/bookings/:id/submit-receipt`:
   - Computes SHA-256 hash of screenshot to block duplicate submissions.
   - Calls Vision LLM to verify recipient card PAN and transfer amount.
   - In `AUTO_OCR` mode: if confidence $\ge 0.85$, transitions booking status to `UNLOCKED`.
4. Implement `VoucherUnlockedScreen.tsx`:
   - Reveals full workshop name, phone, Google Maps pin, and 6-digit redemption QR code.

VERIFICATION:
Inspect network payload: confirm private shop contact info is 100% hidden before receipt verification.
```

---

### PROMPT 9: 0$ Client-Side Video Reel Generator (WebCodecs & 808 Bass-Drop Sync)

```markdown
### TASK: Phase 9 — Hardware-Accelerated Cinematic Video Reel Engine
Target Files:
- `src/features/video/engine/canvas-sequencer.ts`
- `src/features/video/engine/webcodecs-encoder.ts`
- `src/features/video/engine/audio-muxer.ts`
- `src/features/video/components/VideoExportModal.tsx`
- `src/features/video/components/VideoPlayerPreview.tsx`

Normative References:
- `plans/09_VIDEO_ENGINE.md`
- `plans/03_SCREENS_AND_FLOWS.md` (S-STU-08)

DIRECTIVES:
1. Implement `canvas-sequencer.ts`:
   - Sequences rendered 1080p angle images across an 11.0-second vertical 9:16 (1080×1920) timeline at 60 FPS.
   - Implements procedural camera motions: subtle zoom-in, whip-pan transitions between angles, and 808 bass-drop camera shake at `1.8s`, `3.6s`, `5.4s`, `7.2s`.
2. Implement `webcodecs-encoder.ts`:
   - Uses `VideoEncoder` (`avc1.640028` / H.264) with fallback to `MediaRecorder` (`video/webm; codecs=vp9`).
   - Muxes background Phonk beat audio track (`public/audio/reel-beat.mp3`).
3. Implement Branded Outro Endcard (Seconds 9.0 to 11.0):
   - Glowing CarVision animated wordmark and partner workshop badge.
   - Unskippable on free trial plan.
4. Implement `VideoExportModal.tsx`:
   - Progress bar during encoding; on completion, triggers Web Share API (`navigator.share`) for 1-tap posting to Instagram Reels / TikTok.

VERIFICATION:
Test video generation on mobile browser. Verify zero server GPU cost, rendering complete in < 4.0 seconds.
```

---

### PROMPT 10: Super Admin Console, Manual Billing Modal & Device Eviction

```markdown
### TASK: Phase 10 — Super Admin Hub, Manual Billing Dispatcher & Fraud Guards
Target Files:
- `src/features/admin/components/AdminSidebar.tsx`
- `src/features/admin/components/ManualBillingModal.tsx`
- `src/features/admin/components/LiveGenerationStream.tsx`
- `src/features/admin/components/ReceiptAuditQueue.tsx`
- `src/features/admin/components/DeviceQuotaInspector.tsx`
- `src/app/[locale]/admin/page.tsx`
- `src/app/api/v1/admin/billing/assign-plan/route.ts`

Normative References:
- `plans/10_ADMIN_AND_SECURITY.md`
- `plans/03_SCREENS_AND_FLOWS.md` (S-ADM-01 to S-ADM-13)

DIRECTIVES:
1. Enforce Server Guard:
   - All `/admin/*` routes reject non-admins and sessions without `aal2` TOTP MFA.
2. Implement `ManualBillingModal.tsx` (`M-30`) & API Route:
   - Admin selects shop, chooses plan (`PRO_800`, `MAX_4000`, `ULTRA_10000`), inputs currency amount and method.
   - Atomically updates credits, extends subscription, and writes immutable record to `admin_audit_log`.
3. Implement `LiveGenerationStream.tsx` (`S-ADM-05`):
   - Real-time tile grid showing all active generations across platform with before/after thumbnails.
4. Implement `ReceiptAuditQueue.tsx` (`S-ADM-06`):
   - Displays receipts requiring manual verification with hotkeys (`A` approve, `R` reject, `B` ban fraudulent account).
5. Implement `DeviceQuotaInspector.tsx`:
   - Monitors active tablet sessions per workshop; evicts oldest session when device limit is exceeded.

VERIFICATION:
Verify admin mutations require valid MFA session and create immutable audit records.
```

---

### PROMPT 11: Serwist PWA Standalone, Offline IndexedDB Queue & Playwright E2E

```markdown
### TASK: Phase 11 — PWA Standalone, Offline Caching & Playwright E2E Suite
Target Files:
- `src/app/sw.ts`
- `src/app/manifest.json`
- `src/lib/offline-photo-queue.ts`
- `src/components/pwa/PwaInstallPrompt.tsx`
- `tests/e2e/workshop-flow.spec.ts`
- `tests/e2e/marketplace-deposit.spec.ts`

Normative References:
- `plans/12_I18N_AND_PWA.md` (sections 6, 7)
- `plans/13_EDGE_CASES_AND_ERRORS.md`

DIRECTIVES:
1. Implement Serwist Service Worker `src/app/sw.ts`:
   - Pre-caches core app shell, fonts, and i18n dictionaries.
   - CacheFirst for 3D wireframe models (`/models/*.glb`).
   - StaleWhileRevalidate for catalog reference images (`cdn.carvision.app/catalog/*`).
   - NetworkOnly for all `/api/*`, Supabase Auth, and Realtime websocket routes.
2. Implement `PwaInstallPrompt.tsx`:
   - Captures `beforeinstallprompt` on Android Chrome; shows 2-step "Add to Home Screen" instructions on iOS Safari.
3. Implement `offline-photo-queue.ts`:
   - Buffers captured photos in IndexedDB when offline and auto-syncs when online event fires.
4. Implement Playwright E2E test suite:
   - Full workshop workflow: Login $\to$ Smart Camera $\to$ Select Vossen HF-5 $\to$ Generate 4K $\to$ Create Passport.
   - Marketplace workflow: Filter parts $\to$ 3% deposit upload $\to$ instant voucher unlock.
   - Responsive & RTL audit: Verifies zero clipping across all 8 languages.

VERIFICATION:
Run `pnpm test:e2e`. All E2E scenarios must pass cleanly in headless browser.
```
