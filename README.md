# CarVision — AI-Powered Automotive Tuning Visualizer & Marketplace OS

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict_v5.6-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4_Logical-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase Postgres](https://img.shields.io/badge/Supabase-RLS_%2B_Atomic-3ecf8e?style=flat&logo=supabase)](https://supabase.com/)
[![PWA Serwist](https://img.shields.io/badge/PWA-Serwist_Offline-orange?style=flat)](https://serwist.pages.dev/)
[![Zero Error Gate](https://img.shields.io/badge/Quality_Gate-100%25_Passed-brightgreen)](https://github.com/asadbek3723/CarVision)

CarVision is an enterprise-grade AI operating platform designed for automotive tuning shops, detailing studios, and car enthusiasts. It allows bay technicians and car owners to visualize modifications on their exact automobile in photorealistic 4K before any physical wrench turns.

---

## 🌟 Flagship Capabilities

1. **8-Angle 3D Smart Camera (`src/features/camera`)**
   - 3D wireframe guide overlay (`Camera3DOverlay.tsx`) with real-time pitch/roll/yaw gyroscope guidance.
   - Luma exposure check (rejects < 28 or > 242 luma) and "Green Lock" auto-shutter when aligned.
   - Dual-mode QR bridge modal to capture high-res photos on mobile and beam directly to garage tablets.
   - Weak 4G garage resilience with IndexedDB offline queue (`offline-photo-queue.ts`).

2. **Sub-5-Second 4K AI Pipeline (`src/server/providers/ai`)**
   - Dual-adapter architecture: automatically routes to `MockImageEditProvider` (zero server cost for instant testing) when `FAL_KEY` is empty, or `FalImageEditProvider` (FLUX.1 Fill + Meta SAM 2 + 4K ESRGAN) when configured.
   - Automated circuit breaker protection and atomic Postgres credit reservation (`reserve_credits` / `rollback_credits`).

3. **Tuning Studio Workspace (`src/features/studio`)**
   - Car Viewport commands 85% of screen dominance.
   - Itemized cashier summary breakdown (Retail parts + workshop labor + 3% escrow deposit).
   - Customer-View PIN Lock mode (`CustomerViewLockModal.tsx`): hides wholesale prices and sensitive tabs when handing the tablet to customers in the bay.

4. **B2B Workshop Console & Inventory (`src/features/seller`)**
   - 1-Click Master Catalog importer for Vossen, BBS, Brembo, Akrapovic, SunTek, and XPEL.
   - Custom inventory part uploader with OEM bolt pattern, width, and offset fitment validation.
   - Voucher redemption terminal: instantly validates 3% customer booking vouchers and transfers escrow deposits.

5. **B2C Marketplace & 3% Escrow Engine (`src/features/marketplace`)**
   - Anti-disintermediation masking: Workshop identities remain masked (`Verified Partner #ID`) until customer pays 3% deposit.
   - Receipt upload and automated verification workflow.
   - Permanent cryptographic CarVision Tuning Passport for vehicle resale equity.

6. **0$ Client-Side 60fps Video Reel Engine (`src/features/video`)**
   - WebCodecs hardware-accelerated canvas sequencer (`canvas-sequencer.ts`).
   - Synced 808 bass drops with screen shake triggers at 1.8s, 3.6s, 5.4s, 7.2s, and outro brand card.
   - Zero cloud GPU rendering expense: 100% computed on client device.

7. **Internationalization & Arabic RTL (`messages/`, `src/i18n`)**
   - Full 8-language localization: Uzbek (`uz`), Russian (`ru`), English (`en`), Arabic (`ar`), Turkish (`tr`), Kazakh (`kk`), Kyrgyz (`ky`), Tajik (`tg`).
   - Zero physical CSS directional utilities enforced by automated CI linter (`scripts/check-physical-direction.mjs`).

---

## 🛠️ Architecture & Directory Layout

```
CarVision/
├── messages/                  # 8-Locale complete dictionaries (uz, ru, en, ar, tr, kk, ky, tg)
├── plans/                     # 16 Normative architectural specification documents (v2.0)
├── public/                    # PWA icons, manifest, 3D wireframe models, service worker
├── scripts/
│   └── check-physical-direction.mjs  # CI guard blocking physical CSS classes
├── src/
│   ├── app/                   # Next.js 15 App Router
│   │   ├── [locale]/          # Localized routes (/, /studio, /seller, /marketplace, /admin)
│   │   ├── api/v1/            # Secure Next.js route handlers
│   │   └── sw.ts              # Serwist Service Worker with runtime caching
│   ├── components/            # Reusable UI primitives (Button, Modal, Sheet, PriceTicker)
│   ├── domain/                # Pure business logic (Money, Pricing, Credits, Angles, Fitment)
│   ├── features/              # Feature modules:
│   │   ├── admin/             # Super Admin console & manual billing
│   │   ├── camera/            # Smart 3D camera HUD, sensors & WebP compression
│   │   ├── marketplace/       # Masked shop directory, checkout & vouchers
│   │   ├── seller/            # Workshop console, PIN lock & catalog importer
│   │   ├── studio/            # Viewport, angle switcher & cashier drawer
│   │   └── video/             # WebCodecs 0$ reel renderer & audio sequencer
│   └── lib/                   # Supabase clients, offline photo queue & helpers
├── supabase/
│   ├── migrations/            # 13 core tables, RLS policies, atomic functions
│   └── seed.sql               # Pricing tiers, master catalog & system settings
└── tests/
    ├── domain/                # 100% Vitest unit tests for business rules
    └── e2e/                   # Playwright end-to-end integration test suites
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)

### 2. Installation
```bash
git clone https://github.com/asadbek3723/CarVision.git
cd CarVision
pnpm install
```

### 3. Environment Setup
Copy the sample environment file:
```bash
cp .env.example .env.local
```
Fill in your credentials or leave `FAL_KEY` empty to run on the built-in zero-cost high-fidelity mock engine.

### 4. Supabase Setup
Run the SQL migrations located in `supabase/migrations/` in your Supabase SQL Editor:
1. `20261016000000_core_schema.sql` (Creates 13 core tables & views)
2. `20261016000001_rls_policies.sql` (Enforces Row Level Security on every table)
3. `20261016000002_atomic_functions.sql` (Atomic credit reservations & voucher redemption)
4. `seed.sql` (Seeds master catalog & subscription plans)

---

## 🧪 Testing & Verification

The project includes strict automated quality gates:

```bash
# Run complete verification (ESLint + RTL Physical Direction Guard + TypeScript + Vitest)
pnpm check

# Run individual test suites
pnpm test          # 24 Vitest domain unit tests
pnpm test:e2e      # Playwright E2E browser tests
pnpm check-direction # Verifies zero physical CSS utilities for Arabic RTL

# Production build
pnpm build
```

---

## 🔒 Security & Money Principles
- **Money Minor Units:** All monetary values (`price_cents`, `deposit_amount_cents`) are strictly stored as integer cents to eliminate floating-point rounding errors.
- **Atomic Credit Operations:** Credits are reserved with PostgreSQL `FOR UPDATE` row locks, ensuring zero race conditions or double-spending.
- **Anti-Disintermediation:** Workshop phone numbers, addresses, and GPS coordinates are masked behind a PostgreSQL view (`shops_public_masked`) until a 3% escrow deposit receipt is verified.
- **Zero Physical CSS:** Every UI component utilizes CSS logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) to support Arabic RTL without mirrored visual defects.

---

## 📄 License
Proprietary & Confidential &copy; CarVision Technologies. All rights reserved.
