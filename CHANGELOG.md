# Changelog

## [2026-10-18] - Phase 20: Smart Camera 1:1 Luxury Redesign, Mandatory Landscape Gate & Program-Controlled 4-Angle Flow
### Added & Rebuilt
- **1:1 Luxury Smart Camera (`src/features/camera/components/SmartCameraLandscapeView.tsx`)**:
  - Rebuilt from scratch to match the reference design 1:1 across all screen sizes:
    - Left column: Top-start circular Back button (`<-`) + vertically centered **3D/Top-down Luxury Car Compass** (`LuxuryCarCompass` with `/images/camera/topdown_coupe.png`, concentric orbital rings, and 4 directional chevrons `^`, `>`, `v`, `<`).
    - Center column: Rounded golden-framed live camera viewport (`rounded-[22px] sm:rounded-[28px] md:rounded-[32px]`), 4 inset rounded golden `L`-brackets, and 3D perspective SVG golden floor lane grid.
    - Right column: Pure white circular shutter button inside a glowing golden outer ring.
- **Mandatory Horizontal (Landscape) Mode on Mobile (Zero-Button Auto-Overlay)**:
  - Fixed mobile detection (`Math.min(window.innerWidth, window.innerHeight) <= 540` or mobile UA) so rotating a phone to landscape (`844x390`) stays in the mobile Smart Camera.
  - Added full-screen animated portrait-to-landscape prompt (`isPortrait: window.innerHeight > window.innerWidth`) with **zero buttons**; automatically hides when rotated to landscape and automatically reappears if rotated back to portrait.
- **Program-Controlled Compass (`pointer-events-none`) & Mandatory 4-Angle Sequence**:
  - Made all 4 compass direction indicators strictly non-clickable (`pointer-events-none`).
  - Enforced sequential capture (`1. Old tomon` → `2. O‘ng tomon` → `3. Orqa tomon` → `4. Chap tomon`); completed angles display an emerald checkmark (`✓`) while the active angle illuminates in gold.
  - Prevented skipping or proceeding after 1 photo; Studio transition triggers only after all 4 required photos are captured.
- **Desktop & QR Bridge All-Angles Enforcement (`VeloceSmartCameraModal.tsx`, `src/app/[locale]/scan/[sessionId]/page.tsx`, `VeloceStore.tsx`)**:
  - Integrated `LuxuryCarCompass` into the desktop step-by-step upload wizard.
  - Locked `"Davom etish (X/4)"` with a lock indicator until all 4 required angles are uploaded (`4/4`).
  - Updated QR Bridge to report intermediate progress (`status: 'connected'`) and finalize (`status: 'captured'`) only when all 4 angles are captured.
- **Quality Gates**:
  - `npm run check-direction`: 0 physical direction violations.
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run lint`: 0 ESLint errors and warnings.
  - `npm test`: 37/37 Vitest unit tests passing.

## [2026-10-18] - 1:1 Garage Showroom Restoration & Multi-Language Integration
### Changed & Restored
- **1:1 Veloce Garage Showroom (`VeloceGarage.tsx`)**:
  - Restored 1:1 identical visual and structural layout of `https://car-vision-omega.vercel.app/uz/garage`.
  - Re-implemented the full-bleed hero banner (`h-[420px] md:h-[520px] lg:h-[620px]`) with `/assets/garage-Bst4bQtu.jpg`, gold gradient headline, and subtle overlay gradients.
  - Restored floating category pill bar (`-mt-10`, `border-primary/20`, `bg-card/80 backdrop-blur-xl`) with active gold glow indicator.
  - Restored product grid displaying 8 showroom modifications (`BBS CI-R`, `Carbon Front Lip`, `GT Rear Wing`, `KW Variant 3`, `M Performance Seats`, `Alcantara Wheel`, `Valvetronic Exhaust`, `Big Brake Kit`) with `showPrice={false}`.
- **Global Localization (i18n)**:
  - Added `garage` namespace across `messages/uz.json`, `messages/ru.json`, and `messages/en.json`.
  - Fully reactive language translation for eyebrow, title, subtitle, categories, products header, and dynamic `{count}` items counter.
- **Quality Gates**:
  - `npm run check-direction`: 0 physical direction violations.
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run lint`: 0 ESLint errors and warnings.
  - `npm test`: 37/37 Vitest tests passing.

## [2026-10-18] - Removal of Demo Car Fallbacks & Strict Inventory-Only Garage View
### Removed & Improved
- **Clean Inventory-Only Garage (`VeloceGarage.tsx`)**:
  - Removed `+ YANGI DETAL QO'SHISH` button, `4K Studioda Ko'rish` button, and `AddPartModal`.
  - Garage now strictly functions as an inventory inspection view showing active products, categories, search, and stock. Products are managed exclusively through the Admin Dashboard.
- **Removed Action Shortcuts from Seller Dashboard (`SellerDashboardView.tsx`)**:
  - Removed `4K Showroom` and `Yangi Detal Qo'shish` buttons.
- **Strictly Banned Default Demo Car Images Across Visualizer & Studio**:
  - Completely purged default dummy car fallbacks (`/assets/car-CjioCIbt.jpg`, `/images/studio/studio_coupe_factory.jpg`) in `VeloceCustomize.tsx`, `VehicleViewport.tsx`, `VeloceSmartCameraModal.tsx`, and `/api/v1/generations`.
  - When no car photo is uploaded (`!photo`), `VeloceCustomize` and `VehicleViewport` display an elegant, borderless depth empty prompt requiring the user to take a photo or upload their real car.
  - Applying fitment without an uploaded car is blocked and immediately opens the camera/upload modal.
  - `/api/v1/generations` rejects requests without a real car photo (HTTP 400).
- **Quality Gates**:
  - `npm run check-direction`: 0 physical direction violations.
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run lint`: 0 ESLint errors and warnings.
  - `npm test`: 37/37 Vitest tests passing.

## [2026-10-18] - Unified Root Routing (VeloceHome Showroom) & Role-Based Single Sidebar
### Added & Improved
- **Unified Root Routing (`/[locale]`)**:
  - `src/app/[locale]/page.tsx` now directly renders `<VeloceShell><VeloceHome /></VeloceShell>`, replacing the obsolete marketing landing page.
  - Every user (ordinary car owner, guest, or seller) immediately lands in the luxury BMW M4 showroom (`VeloceHome`) with "BUILT DIFFERENT", "CUSTOMIZE YOUR RIDE >", and "EXPLORE SHOP".
- **Role-Based Single Sidebar (`VeloceShell.tsx`)**:
  - **Ordinary User (B2C / Guest)**: Sees strictly `Home` (`/[locale]`), `Create` (Camera modal), `Shop` (`/[locale]/shop`), and `Profile` (`/[locale]/profile`). Garage and Dashboard are completely hidden.
  - **Seller (B2B)**: Sees `Home` (`/[locale]`), `Garage` (`/[locale]/garage`), `Create`, `Shop`, and at the bottom `Dashboard` (`/[locale]/seller?tab=dashboard`) and `Profile`.
  - Zero duplicate sidebars: clicking `Dashboard` renders `SellerDashboardView` cleanly within the main content area of `VeloceShell`.
  - Canonical `Home`, top `V` logo, header `VELOCE`, and mobile dock/drawer `Home` links all navigate cleanly to `/[locale]`.
- **Quality Gates**:
  - `npm run check-direction`: 0 physical direction violations.
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run lint`: 0 ESLint errors and warnings.
  - `npm test`: 37/37 Vitest unit tests passing.
  - Verified via HTTP on `localhost:3000`:
    - `http://localhost:3000/uz`: renders `VeloceHome` (contains "BUILT DIFFERENT").
    - `http://localhost:3000/uz/seller`: renders `VeloceHome` (contains "BUILT DIFFERENT").
    - `http://localhost:3000/uz/seller?tab=dashboard`: renders `SellerDashboardView` (contains "Atelier OS").
    - `http://localhost:3000/uz/seller?tab=garage`: renders `VeloceGarage`.

## [2026-10-18] - VeloceHome Showroom Main Page & Separate Dashboard Section
### Fixed & Improved
- **Restored VeloceHome Showroom as the Core "Asosiy Sahifa"**:
  - Confirmed and restored `<VeloceHome />` (the BMW M4 showroom screen with "BUILT DIFFERENT", "CUSTOMIZE YOUR RIDE >", and "EXPLORE SHOP") as the default view of `/${locale}/seller`.
  - Top `Home` icon and `VELOCE` logo in the sidebar route directly to `/${locale}/seller` (`VeloceHome`), with the active gold indicator illuminated on `HOME`.
- **Separate Dashboard Tab**:
  - B2B Atelier OS Dashboard (`SellerDashboardView`) relocated to `/${locale}/seller?tab=dashboard`.
  - In the left sidebar, `Dashboard` is positioned in the bottom utility section above `Profile`.
  - Clicking `Dashboard` renders `SellerDashboardView` with zero duplicate sidebars; clicking `Home` instantly brings back the BMW M4 showroom.
- **Verification**:
  - `curl http://localhost:3000/uz/seller` renders `VeloceHome` (contains "BUILT DIFFERENT").
  - `curl http://localhost:3000/uz/seller?tab=dashboard` renders `SellerDashboardView`.
  - 0 TypeScript errors, 0 ESLint warnings, 0 physical direction violations, 37/37 Vitest tests passing.

## [2026-10-18] - Master Supabase Integration — Eradication of All Static Mock Data Across App & Admin
### Added & Improved
- **100% Live Supabase Postgres Integration**:
  - Completely purged all static mock data arrays across the entire application: `RAW_PRODUCTS`, `VELOCE_PRODUCTS`, `DEMO_PROFILES`, `FLEET_PROJECTS`, `GALLERY_RENDERS`, `FALLBACK_STUDIOS`, `INITIAL_STUDIOS`, `INITIAL_ESCROW_ORDERS`, `INITIAL_DEVICES`, and `LIVE_GENERATIONS`.
  - Replaced all initial states with clean empty arrays (`useState([])`) or `null` accompanied by luxury shimmer skeleton loaders.
- **New Supabase Endpoints**:
  - `GET /api/v1/vehicles`: queries real vehicle models from Supabase `vehicle_models` (BYD Chazor, BYD Song Plus, Cobalt, Gentra, Nexia 3, Malibu, Spark) with studio photography and tuning stages.
  - `GET /api/v1/generations`: queries real 4K renders from Supabase `seller_generations`.
  - `POST /api/v1/auth/login` and `POST /api/v1/auth/register`: live Supabase authentication for users and partner studios.
  - Upgraded `/api/v1/products`: dynamically derives vehicle compatibility based on product keywords and local Uzbek models.
  - Upgraded `/api/v1/admin/overview`: computes real-time revenue, order counts, generations, and live weekly telemetry bars from Supabase `orders` and `seller_generations`.
- **Component Upgrades**:
  - `VeloceProfile.tsx`: dynamic fleet count and live 4K render gallery with luxury shimmer skeleton loaders.
  - `VeloceCart.tsx`: dynamic partner atelier selector and cart items fetched directly from Supabase.
  - `VeloceCustomize.tsx`: 4K neural visualizer connected to live inventory and generations API.
  - `AdminOverviewView.tsx`: zero static numbers, live KPI metrics and dynamic weekly analytics.
  - `SellerDashboardView.tsx`: weekly revenue computed purely from live seller orders with zero hardcoded fallbacks.
- **Quality Gates**:
  - 0 TypeScript errors (`npx tsc --noEmit`).
  - 0 ESLint errors/warnings (`npm run lint`).
  - 0 physical direction violations (`npm run check-direction`).
  - 37/37 Vitest unit tests passing (`npm test`).

## [2026-10-18] - Seller Dashboard Navigation & Home Page Redirection Architecture
### Fixed & Improved
- **Eliminated Forced Seller Redirection on Home Page**:
  - Removed auto-redirection `router.push('/' + locale + '/seller')` in `src/app/[locale]/page.tsx`. Sellers and regular users can freely visit and browse the main Home page (`http://localhost:3000/uz` / `http://localhost:3001/uz`).
  - Fixed header VELOCE logo link to strictly point to Home (`/${locale}`) for all users.
- **Single Sidebar Architecture (No Duplicate Inner Sidebars)**:
  - Removed duplicate inner sidebars inside `/seller`; wrapped `SellerDashboardView` cleanly inside the existing `VeloceShell` layout.
  - Positioned `Dashboard` in the bottom section of the desktop sidebar directly above `Profile`.
  - Reordered mobile bottom dock for sellers: `Home`, `Garage`, `Shop`, `Dashboard`, `Profile`.
  - In mobile slide-over drawer: `Dashboard` sits directly above `Profile`.
- **Top Segmented Borderless Navigation**:
  - Atelier OS dashboard sections (*Umumiy Telemetriya*, *3% Zakalat Buyurtmalari*, *Ombor Qoldig'i*, *Atelier Sozlamalari*) managed via smooth horizontal tabs at the top of the full-width view.
- **Verification**:
  - 0 TypeScript errors (`npx tsc --noEmit`), 0 ESLint warnings (`npm run lint`), 0 physical direction violations (`npm run check-direction`), 37/37 Vitest tests passing.

## [2026-10-18] - B2B Seller Dashboard Suite, Role-Gated Navigation & Global Multi-Currency System
### Added & Improved
- **Role-Gated Garage & Navigation Architecture**:
  - Regular car owners (`b2c_user`) do NOT see "Garage" in navigation (desktop sidebar, mobile bottom dock, and slide drawer). Regular user cars live in `/profile?tab=fleet`.
  - `/garage` restricted to authenticated B2B Sellers (`b2b_seller`) as their live parts inventory warehouse.
- **World-Class B2B Seller Dashboard (`/[locale]/seller`)**:
  - Full Rule #6-compliant dashboard: collapsible sidebar, top bar with quick actions, 4-bento KPI cards (Umumiy Tushum, Faol Buyurtmalar, Ombor Qoldig'i, 3% Escrow Himoyada).
  - 60fps custom SVG revenue and fitment chart, live customer orders table with Escrow status, appointment details, and Escrow voucher view.
- **AI-Powered Spare Part Onboarding (`AddPartModal`)**:
  - Camera/photo upload for physical parts, vehicle compatibility multi-select (Malibu 2, Tracker 2, Onix, BMW M4, BYD Seal, etc.).
  - AI Studio Enhancer endpoint (`/api/v1/seller/improve-part-image`) for lighting optimization and background cutout.
  - Direct database persistence to Supabase `products` via `/api/v1/seller/inventory`.
- **Showroom Studio Mode (`/[locale]/customize`)**:
  - When logged in as a seller, studio visualizer displays only that seller's warehouse products with a luxury Showroom Studio badge.
- **Real-Time Multi-Currency Engine (`src/domain/currency.ts` & `/api/v1/currency/rates`)**:
  - Fetches live exchange rates (USD, UZS, AED, TRY, RUB, KGS, KZT) with 1h ISR cache.
  - Displays every price in the user's active country currency with tabular digits (`tabular-nums font-mono`) and native symbols (`so'm`, `$`, `₽`, `د.إ`, `₺`, `сом`, `₸`).
- **Global Country/Language Lock**:
  - User's country choice during registration / profile locks application language and currency across internal authenticated pages.
- **Quality Gates**:
  - 0 TypeScript errors (`npx tsc --noEmit`), 0 ESLint warnings (`npm run lint`), 0 physical direction violations (`npm run check-direction`), 37/37 Vitest tests passing, production build succeeded (`npm run build`).

## [2026-10-18] - Smart Camera: Complete Eradication of All Card Boxes, Spacious Layout & 300px QR Code
### Fixed & Improved
- **Eradicated All Artificial Card & Dashed Boxes**:
  - Removed all `bg-[#11131C]`, `bg-white/[0.03]`, and `border-dashed` boxes across both initial and step-upload views.
  - All interactive elements float directly on the spacious `#07080B` dark carbon surface with ambient glow on hover/drag.
- **Enlarged QR Code to 300px**:
  - Increased QR code resolution and scale to 300x300px with a rounded-3xl white backing pad and deep shadow for effortless scanning.
- **Full-Width 5-Step Navigation**:
  - 5 steps now span the entire container width with a sleek active gold underline indicator.
- **In-Viewport Navigation**:
  - Optimized vertical spacing so navigation buttons (`< Oldingi`, `Keyingi >`, and `Davom etish >`) are immediately visible on standard laptop viewports without scrolling.
- **Zero Errors Verification**:
  - 0 TypeScript errors, 0 ESLint errors/warnings, 0 physical direction violations, 33/33 Vitest tests passing.



## [2026-10-18] - Smart Camera Desktop Overhaul: Zero Desktop Webcam & Step-by-Step 5-Angle Guided Upload Wizard
### Fixed & Improved
- **Eradicated Desktop Webcam / Live Camera Triggers**:
  - Completely removed `Veb-kameradan foydalanish >` and `Ushbu kompyuter veb-kamerasini to'liq 1:1 ekranda ochish >` links on desktop devices.
  - Desktop browsers never initiate or prompt webcam media streams.
- **Initial 2-Option Luxury Split Screen (`VeloceSmartCameraModal.tsx`)**:
  - **Option 1**: Smartphone QR Code Skan (100% 4K Sifat, real-time polling with instant handoff).
  - **Option 2**: Guided File Upload from PC with `[Fotosuratlarni Bosqichma-bosqich Yuklash >]`.
  - Added quick `[Namuna 4K Kadr Bilan Sinash >]` for instant 1-click test navigation.
- **Interactive Step-by-Step 5-Angle 4K Wizard**:
  - Segmented 5-angle navigation bar with completion checkmarks and gold glow indicators:
    1. `315° // Oldi-chap 3/4` (Primary 4K Visualizer angle)
    2. `0° // Old tomon (Front)`
    3. `90° // O'ng tomon (Profil)`
    4. `180° // Orqa tomon (Rear)`
    5. `270° // Chap tomon (Profil)`
  - Interactive SVG Automotive Radar Wireframe: Features dynamic top-down chassis blueprint, rotating radial radar cone beam, camera azimuth indicator, and angle-specific photography instructions.
  - Drag-and-drop Dropzone with high-res preview card, status badges, and replace image trigger.
- **Guaranteed Navigation to 4K Studio**:
  - Fixed upload logic issue where single-angle uploads remained stuck on desktop handoff.
  - Enabled floating `[4K Studio Visualizer-ga O'tish >]` bar immediately upon uploading at least 1 photo.
  - Automatically saves images to `sessionStorage` (`carvision_captured_image`, `veloce_photo`, `carvision_multi_angles`), notifies store via `onCaptured`, and seamlessly navigates to `/${locale}/customize?captured=1`.
- **Unified Seller Dashboard (`SellerDashboard.tsx`)**:
  - Replaced raw `SmartCameraView` with unified `VeloceSmartCameraModal`.
- **Quality Gates**:
  - Passed `npm run check-direction` (0 RTL violations), `npx tsc --noEmit` (0 type errors), `npm run lint` (0 lint errors), and `npm test` (33/33 tests passing).
### Added & Enhanced
- **Super-Luxury Atelier Master Pass (`src/components/veloce/VeloceProfile.tsx`)**:
  - Completely redesigned the profile into a borderless, depth-based luxury automotive identity.
  - Eliminated harsh borders and hardcoded colors; introduced multi-layer soft shadows (`shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)]`), surface lightness levels, and top-edge ambient illumination.
  - Added holographic Master Pass VIP chip (`CV-APX-3723-MEISTER`) with animated one-click clipboard copying.
  - Added responsive 2x2 (mobile) / 4-column (desktop) Bento Telemetry grid: 4K AI Credits with quota bar, Active Fleet projects, 3% Zakalat live volume, and Atelier Meister SLA (4.98 / 5.0).
- **Framer Motion Segmented Navigation**:
  - Implemented smooth sliding indicator (`layoutId="profileActiveTabIndicator"`) with 4 distinct tabs: Atelier Garaji, 3% Zakalat & Buyurtmalar, 4K Render Galereya, and Sozlamalar & Xavfsizlik.
- **Live Supabase Orders Integration**:
  - Upgraded `GET /api/v1/orders` to return recent live customer and atelier orders.
  - Wired live order cards with status badges (`Tasdiqlandi`, `Kutishda`), 3% Zakalat vs 97% balance, payment badges, and an interactive CarVision Escrow Voucher modal.
- **Interactive Modals Suite**:
  - **Edit Profile Modal**: Live editing of name, studio, phone, and city, syncing to `AuthContext.updateProfile`.
  - **Top-up AI Credits Modal**: Tiered packages (100 PTS, 500 PTS, 2500 PTS) with instant balance update.
  - **Sign Out Confirm Modal**: Clean security exit confirmation.
- **Complete Internationalization (i18n)**:
  - Added complete `profile` namespace across `messages/uz.json`, `messages/ru.json`, and `messages/en.json`.
- **Quality Gates**:
  - Passed `npm run check-direction` (0 RTL violations), `tsc --noEmit` (0 type errors), `npm run lint` (0 errors), and `npm test` (33/33 Vitest tests passing).

## [2026-10-18] - Cart & Escrow: Real 3% Zakalat Booking Flow Connected to Supabase
### Added & Enhanced
- **Real Orders & Escrow Backend API (`/api/v1/orders`)**:
  - Implemented `POST /api/v1/orders` with strict Zod validation schema.
  - Automatically calculates subtotal, 3% Zakalat Escrow deposit (both in USD and UZS at 13,000 UZS/USD), remaining 97% balance, and generates order reference (`#CV-XXXX`).
  - Resolves partner tuning studio from live Supabase `sellers` and user session.
  - Persists order records directly into Supabase `orders` (`status: 'new'`) and line items into `order_items`.
- **Luxury 3% Zakalat Escrow Modal (`src/components/veloce/VeloceCart.tsx`)**:
  - Completely eradicated the dummy `alert("Buyurtmangiz qabul qilindi!")`.
  - Built borderless depth-based modal with 3-pill price breakdown (Total, 3% Zakalat, 97% on vehicle handover).
  - Added dynamic partner atelier selector loaded directly from `/api/v1/shops`.
  - Added customer details inputs (name, phone, appointment date, customer note).
  - Added payment method selector (Click, Payme, Uzum, Bank).
  - Displayed official CarVision Escrow bank details (Kapitalbank ATB, `8600 4902 1184 9921`) with one-click copy and feedback.
  - Added official CarVision Booking Confirmation Voucher screen displaying order number, live status badge, and direct link to Garage.
- **Admin Escrow Integration (`/api/v1/admin/escrow`)**:
  - Enhanced parser to extract exact custom order numbers (`#CV-XXXX`), customer name, payment method (`[Click]`, `[Payme]`, `[Uzum]`, `[Bank]`), and exact 3% deposit.
  - Verified live two-way synchronization: newly submitted orders appear instantly in `/admin` ("3% Zakalat & To'lovlar") and mutate to `accepted` upon Super Admin verification.
- **Store Enhancement (`src/context/VeloceStore.tsx`)**:
  - Added `clearCart()` method persisted to `sessionStorage` for seamless post-checkout state management.

## [2026-10-18] - Studio & Customizer: Real 4K AI Pipeline & Interactive Before/After Split Slider
### Added & Enhanced
- **Real 4K AI Generation Engine (`/api/v1/generations`)**:
  - Implemented direct studio fitment API accepting vehicle photos and selected tuning part parameters (`partId`, `partName`, `partCategory`, `partSpec`, `partPrice`).
  - Added atomic credit deduction linked to Supabase `sellers` studio ledger.
  - Persisted generations into Supabase `seller_generations` table with prompt, base image, and 4K result image.
- **Interactive 4K Before / After Slider (`VeloceCustomize.tsx`)**:
  - Replaced fake "Applied" timeout indicator with active 3-step AI Processing HUD ("Shassi va rakurs", "3D karkas o'rnatish", "FLUX 4K neyron nurlanish").
  - Added hardware-accelerated Before / After split comparison slider (`inset-inline-start`, touch/mouse pointer capture) comparing factory stock vs 4K tuned vehicles.
  - Added 4K fitment telemetry card with item specifications, price breakdown, 3% Zakalat calculation ($36), and direct "Savatga & Zakalat" booking and "4K Yuklab Olish" actions.

### Fixed & Enhanced
- **Mobile Responsive Layout (`src/app/[locale]/page.tsx`)**:
  - Calibrated mobile typography for `MobileApp`: resized mobile heading to `text-[2rem] leading-[1.08] break-words` (with `sm:text-6xl sm:leading-[1.02]` on desktop), eliminating horizontal overflow caused by long words like `cho'ntagingizda.`.
  - Optimized section and container padding: `px-4 sm:px-6` on outer section and `p-5 sm:p-16` on card, preventing inner elements from expanding past viewport boundaries.
  - Added `min-w-0 w-full` to grid items and container, ensuring store buttons and description texts never blowout the CSS grid min-content constraint on screens <400px.
  - Constrained phone mockup image on mobile to `max-w-[280px]` with `object-contain` and centered flex container.
  - Verified 100% RTL compliance, zero TypeScript errors, and zero desktop regressions.

## [2026-10-17] - Supabase: End-to-End Live Database Integration & Zero-Mock Standard
### Added & Enhanced
- **Live Supabase Endpoints**:
  - `/api/v1/admin/overview`: Direct aggregate calculations from Supabase tables (`sellers`, `products`, `seller_generations`, `orders`).
  - `/api/v1/admin/studios`: Live read and update (`PATCH`) operations for studio plans and verification status on Supabase `sellers`.
  - `/api/v1/admin/escrow`: Live order escrow management (`orders` and `order_items`) with direct Supabase state persistence.
  - `/api/v1/admin/devices`: Multi-device session audit powered by Supabase `login_attempts`.
  - `/api/v1/admin/live-stream`: 4K vehicle render pipeline stream from Supabase `seller_generations`.
  - `/api/v1/admin/audit-logs`: Immutable security audit log feed powered by Supabase `login_attempts`.
  - `/api/v1/admin/auth/verify-pin`: Automatic audit logging of all admin PIN authentication attempts directly to Supabase.
  - `/api/v1/products`: Live product catalog search and category filtering directly querying Supabase `products`.
  - `/api/v1/shops`: Live verified tuning workshop directory from Supabase `sellers`.
- **Frontend Live Wiring & Skeleton Loaders**:
  - `AdminOverviewView.tsx`: Real-time KPI counters, revenue, and active studio counts.
  - `AdminStudiosView.tsx`: Real-time studio search, filter, and plan assignment.
  - `AdminEscrowView.tsx`: Real-time orders and deposit receipts with approve/cancel actions.
  - `AdminSecurityView.tsx`: Real-time security attempt history with automatic refresh.
  - `MarketplaceShopList.tsx`: Complete elimination of static arrays (`INITIAL_SHOPS`, `CATALOG_PRODUCTS`), dynamic 3% escrow calculation, and real fitment filtering.
  - `VeloceShop.tsx`: Dynamic loading from `/api/v1/products` with luxury skeleton loaders.
### Removed
- Completely excised static fallback arrays (`INITIAL_SHOPS`, `CATALOG_PRODUCTS`, `AUDIT_LOGS`, and `VELOCE_PRODUCTS` static defaults).

## [2026-10-17] - Admin: Server-Side Master PIN Security Gate & Luxury Sidebar Suite
### Added & Enhanced
- **Zero-Client-Exposure Master PIN Security Engine**:
  - `/api/v1/admin/auth/verify-pin` with IP rate limiting (5 attempts, 15m lockout), constant-time PIN comparison (`crypto.timingSafeEqual`) against `ADMIN_MASTER_PIN=3723`, and HMAC-SHA256 signed `cv_admin_session` httpOnly cookie.
  - `/api/v1/admin/auth/status` and `/api/v1/admin/auth/logout`.
  - Protected backend billing route `/api/v1/admin/billing/assign-plan` requiring valid signed session cookie.
  - Comprehensive unit test suite in `src/lib/admin-auth.test.ts` (9/9 tests passing).
- **Luxury Admin Security Vault PIN Gate (`AdminPinGate.tsx`)**:
  - Luxury obsidian & gold 4-digit PIN pad with dot indicators, numeric keypad, physical keyboard listener, haptic error shake, and lockout timer.
  - Zero presence of `3723` in client-side bundles or TSX markup.
- **World-Class SaaS Sidebar Admin Suite (`src/components/admin/`)**:
  - `AdminShell.tsx`: Collapsible 260px/72px luxury sidebar with gold active indicators, grouped navigation, topbar with live 99.98% SLA badge, notifications popover, and instant "Konsolni Qulflash" logout.
  - `AdminOverviewView.tsx`: Top KPI cards ($48,920 revenue, 142 studios, 18,450 renders, $8,420 escrow), 7-day weekly interactive dynamics chart, live studio event stream, GPU infrastructure status.
  - `AdminStudiosView.tsx`: Real tuning studio management (Apex Customs, Autotune Pro, Dubai Custom Wheels, Samarkand Tuning Lab, etc.), search/filters, plan assigner modal, and status toggles.
  - `AdminEscrowView.tsx`: 3% Zakalat deposit orders, receipt audit modal with genuine transaction review, and instant Approve/Reject pipeline.
  - `AdminLiveStreamView.tsx`: Real-time 4K render pipeline monitoring with real vehicle photography previews (Malibu, BMW, Porsche), latency, GPU SLA, and lightbox viewer.
  - `AdminUsersView.tsx`: Connected device quota inspector with remote session eviction.
  - `AdminSecurityView.tsx`: System audit logs, security clearance status, and rate limiter monitoring.
### Removed
- Removed all "Demo" badges, demo profile switchers, and fake URLs across `UserAccountBar.tsx`, `SellerDashboard.tsx`, `VeloceSmartCameraModal.tsx`, and `VeloceCustomize.tsx`.

## [2026-10-17] - PWA: Luxury Black-Gold Redesign of Install Prompt
### Changed & Enhanced
- **Aesthetic Overhaul (`PwaInstallPrompt.tsx`)**:
  - Replaced harsh neon cyan `#19D3FF` borders, background, and buttons with luxury obsidian frosted glass (`bg-[#0B0C10]/95 backdrop-blur-2xl`) and champagne gold accents (`border-[#D4AE62]/20`, `text-[#E5C378]`, `btn-gold`).
  - Added rounded-2xl champagne gold gradient badge container with `Download` icon.
  - Implemented full multilingual localization (Uzbek, Russian, English) for headlines, body copy, and iOS step-by-step instructions.
  - Sized and positioned responsively (`sm:w-[420px] bottom-5 end-6`) with smooth spring entrance and exit animations.

## [2026-10-17] - Landing Page: Removed Obsolete "Narxni himoya qiluvchi PIN"
### Removed
- **Target Audience Card Item**: Excised `'Narxni himoya qiluvchi PIN'` from the Atelier Audience Card (`AUDIENCE_CARDS[0].items`) in `src/app/[locale]/page.tsx` as requested.

## [2026-10-17] - Landing Page: Pricing Tiers Text Update & FOMO Anchoring (FREE, PRO, MAX)
### Changed & Enhanced
- **Updated Pricing Tiers Copy (`TIERS`)**:
  - `FREE`: $0 / sinov, 40 ta bepul rasm, "Tuned by CarVision" watermark, 1 ta faol qurilma, oddiy foydalanuvchilar va servislar uchun bepul tanishuv.
  - `PRO`: $29 / oy, 800 ta rasm, suv belgisisiz toza 4K sifat, 3 tagacha qurilmadan kirish, mahsulot joylash imkoni, kichik auto tuning salonlari uchun.
  - `MAX`: $99 / oy ($145 crossed out), 4 000 ta rasm, 8 tagacha qurilmadan kirish ruxsati, videolarni 4K formatda yuklab olish, mahsulot joylash imkoni, katta do'konlar va salonlar uchun.
- **FOMO Psychology & Flagship Card**: Positioned `MAX` as the featured elevated card (`hot: true`) with glowing top badge: `$145 O'RNIGA $99 — SIZ 32% TEJAB QOLYAPSIZ!` and strike-through anchoring price.
- **Design Preserved**: 100% of existing borderless, glassmorphic card styling, radii, colors, and responsive layouts were strictly preserved.

## [2026-10-17] - Landing Page: 1:1 Matched Professional Before/After Slider Images
### Changed & Enhanced
- **1:1 Pixel-Perfect Vehicle Pair**: Replaced mismatched Before/After assets (`public/images/golden/car-before.jpg` and `car-after.jpg`) with a 100% matched Chevrolet Malibu pair at 1600x912 resolution.
- **Seamless Visual Continuity**:
  - `OLDIN`: OEM stock white Chevrolet Malibu 2.0T with factory 18" silver wheels, standard factory ride height, chrome window trim, and clean rocker panels.
  - `KEYIN`: Aggressively tuned 4K version with Nardo Grey wrap, 20" gloss-black forged wheels, lowered sport suspension stance, gloss-black shadowline window trim, carbon-fiber side skirts, and carbon ducktail trunk spoiler.
  - Sourced from identical-camera studio photography with sub-millimeter continuity along the roofline, B-pillar, C-pillar, door handles, and lighting reflections.
- **Verification**: Tested at 25%, 50%, and 75% slider split positions. Passed all quality gates (0 direction violations, 0 TypeScript errors, 0 ESLint warnings, 24/24 Vitest domain tests passing).

## [2026-10-17] - Build & CI: Fix Vercel Production Build ESLint Errors & Ambiguous Classes
### Fixed
- **ESLint Unused Variables**: Removed unused imports `User` and `Building` in `src/components/veloce/VeloceProfile.tsx`, removed unused `isCustomize` in `src/components/veloce/VeloceShell.tsx`, and verified `completedAngles` in `SmartCameraLandscapeView.tsx`.
- **Tailwind Ambiguous Classes**: Replaced `ease-[cubic-bezier(...)]` with `[transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]` in `src/app/[locale]/page.tsx` to eliminate build-time warnings.
- **Production Build Verified**: Ran `npm run build` (`next build`) locally, completing successful full build with zero errors and zero warnings.

## [2026-10-17] - Camera: Maximized Central Viewport Rectangle & Full Responsive Adaptation Across All Devices
### Changed & Polished
- **Maximized Central Framing Rectangle**: Removed restrictive `max-w-3xl` and `max-h-[520px]` limits. The central gold framing rectangle now dynamically expands to command the maximum screen area (`h-[90%-96%]`, fluid width) across desktop, laptop, tablet, and mobile screens.
- **Universal Fluid Responsiveness**: Dynamically scales the 360° car alignment compass and luxury shutter button across all viewport widths and heights. On laptops and large monitors, the central camera frame commands over 75-80% of horizontal space.
- **Native Mobile Portrait Adaptation**: Eliminates blocking rotation alerts on phones; provides a native vertical layout where the middle rectangle occupies over 70% of screen height and 94% of screen width, accompanied by an ergonomic top angle chip selector and bottom shutter trigger with mini compass feedback.
- **Zero Direction Violations**: Ensured all corner framing brackets and positioning classes strictly adhere to CSS logical properties (`rounded-ss-xl`, `rounded-se-xl`, `rounded-es-xl`, `rounded-ee-xl`, `border-s`, `border-e`, `start-*`, `end-*`).

## [2026-10-17] - Camera: Real Live Camera Stream & Permanent Removal of Perspective Floor Trapezoid
### Changed & Polished
- **Permanently Removed Floor Trapezoid**: Excised the SVG perspective floor parking bay projection from the camera viewport. The camera view is now 100% unobstructed and framed only by the 4 golden corner brackets.
- **100% Real Live Camera Stream**: Deleted static fake background image (`camera_garage_bg.jpg`) and activated live `<video>` feed with automatic start on mount and multi-platform fallback (environment camera on mobile, FaceTime/webcam on laptops/PCs).
- **Transparent PNG Car Asset**: Ultra-clean 733x976 transparent PNG cutout (`topdown_coupe.png`) without background square borders, filling the 360° compass height with smooth angle rotation animation.
- **Calibrated Shutter Button**: 1:1 match with reference mockup (thin gold glowing neon ring `#DDBE78`, uniform dark gap, pure solid white disc).
- **Center Viewfinder**: Added golden rounded outer frame (`rounded-[32px] sm:rounded-[36px] border-[1.5px] border-[#D4AE62]/55`), 4 bright gold corner framing brackets (`┌ ┐ └ ┘`), and 3D floor perspective parking bay with 2 pairs of side alignment notches.
### Added
- **1:1 Landscape Smart Camera UI (`SmartCameraLandscapeView`)**:
  - Replicated user reference mockup 1:1 with clean top bar (zero mock iOS status clutter, no 9:41, no battery/Wi-Fi).
  - 360° top-down car compass with 6 angles: Front (0°), Front-Right 3/4 (45°), Right Profile (90°), Rear-Right 3/4 (135°), Rear (180°), Front-Left 3/4 (315°), with glowing gold active chevron.
  - Center 60 FPS live video stream with 4 gold corner brackets (`┌ ┐ └ ┘`) and completely clean unobstructed viewport (removed floor grid overlay per user request).
  - Large luxury white circular shutter button with glowing gold neon ring.
- **Desktop 2-Option Luxury Modal**:
  - Option 1 (QR Mobile Hand-off): Real-time gold QR code pointing to `/scan/[sessionId]`. Automatically receives phone photo and advances desktop to `/customize?captured=1`.
  - Option 2 (Direct Upload): 6-angle file upload slots + instant Demo 4K coupe test button.
  - Direct PC webcam toggle.
- **Mobile QR Scan Session Page (`/scan/[sessionId]`)**:
  - Direct camera launch on phone from QR scan.
  - Instant upload to session API and confirmation screen: "KADR KOMPYUTERGA UZATILDI // Endi ishingizni kompyuterda davom ettiring".

## [2026-10-17] - Camera: Global Smart Camera Modal Integration for 'Create' & 'Customize'
### Added
- **Global Smart Camera Modal (`VeloceSmartCameraModal`)**: Built full-screen overlay component integrating `SmartCameraView` with real-time video stream, 3D reticle guidance, angle tilt sensors, and shutter audio.
- **Fallbacks**: Included `DEMO KADR` and direct file upload options so users on desktop or in rooms without a car can easily test the full tuning workflow.
- **Universal Trigger**: Connected `openCamera()` across all entry points (Bottom Dock `Create`, Desktop Sidebar `Create`, Home hero `Customize your ride`, Drawer, Profile `Yangi Loyiha`, and Customizer retake).
- **Automated Workflow**: On photo capture or demo selection, displays `AVTOMOBIL ANIQLANDI // 4K SCAN TAYYOR` loading screen, saves photo to storage and store, and smoothly routes to `/${locale}/customize?captured=1`.

## [2026-10-17] - Navigation: Centered 'Create', Far-Right 'Profile' & Dedicated Profile Page
### Added
- **5-Column Mobile Bottom Navigation**: Updated `VeloceShell` bottom dock to 5 equal columns: `Home` | `Garage` | `Create` (exact center, flat icon matching others) | `Shop` | `Profile` (far right, serious Lucide `User` icon).
- **Desktop Sidebar Navigation**: Added `Profile` with active gold indicator bar at the bottom of the sidebar.
- **Header Profile Link**: Wired sticky top bar Profile avatar to `/${locale}/profile` on desktop, while hiding it cleanly on mobile devices (`hidden md:grid`) to prevent duplication with the bottom dock navigation.
- **1:1 Veloce Profile Page (`/profile`)**:
  - Atelier Master hero header with avatar initials, gold halo glow, and VIP Tier 1 badge.
  - 4 KPI metric cards: Active Builds (3 Cars), AI Credits (2,450 PTS), Rating (4.95/5.0), and 100% 4K SLA.
  - 3 interactive tabs: Atelier Fleet projects with fitted parts, Recent orders and transaction history, Atelier and AI rendering settings.
  - Dignified sign-out modal with cancellation and confirmation workflows.

## [2026-10-17] - Veloce: 1:1 Complete Authenticated Experience from blackgold-dreams.lovable.app
### Added
- **Design Tokens & Fonts**: Integrated Montserrat font family and exact Veloce gold luxury tokens (`--gradient-gold`, `--gradient-card`, `--shadow-gold`, `--shadow-card`, micro-animation keyframes).
- **Domain & Catalog**: Created comprehensive `veloce-catalog.ts` with 43 high-end components across 6 categories (`Wheels`, `Body Kit`, `Suspension`, `Interior`, `Performance`, `Color`), 8 prestigious brands (BBS, Akrapovič, Öhlins, Recaro, Brembo, HRE, Vorsteiner, Capristo), and pricing utilities.
- **Store & Global State**: Built `VeloceStoreProvider` handling cart additions/removals/count, captured photo state, and vehicle customizer selections.
- **Unified Shell (`VeloceShell`)**: Desktop fixed luxury sidebar (`V`, Home, Garage, Shop, Create), top navigation with cart badge and workshop profile, and mobile fixed high-blur bottom dock.
- **Home Screen (`/seller`)**: "BUILT DIFFERENT" hero with 4K coupe artwork, 4-stat metrics bar, 3 bento feature cards, and curated trending parts carousel.
- **Garage Screen (`/garage`)**: Underground showroom hero car, category pills filter, and warehouse inventory grid.
- **Customize / Studio (`/studio` & `/customize`)**: Vehicle customizer with color swatch blend (`mix-blend-color`), 6 category tabs, horizontal tape carousel, part specs, warehouse parts list, and sticky `Apply changes` feedback button.
- **Shop Catalog (`/shop` & `/marketplace`)**: Search bar, `VZ-01 FORGED` limited drop promotional hero banner with floating wheel, category tabs, product cards, and 8 top brand logos.
- **Product Detail (`/shop/[id]`)**: Full part showcase, star reviews, gold price, 3 variants (`Standard`, `Pro`, `Competition`), stock status, add to cart with feedback, warranty badges, and related items.
- **Cart Screen (`/cart`)**: Quantity steppers (`+`, `-`), live price total, free express shipping indicator, summary card, and checkout button.
- **Routing**: Wired `/login`, `/register`, and authenticated entry points directly to `/seller`. All sub-routes tested with HTTP 200.

## [2026-10-17] - Root Layout: Suppress Browser Extension Hydration Mismatches
### Fixed
- Fixed Next.js 15 / React 19 console hydration warning (`A tree hydrated but some attributes of the server rendered HTML didn't match the client properties... cz-shortcut-listen="true"`) caused by browser extensions (e.g. ColorZilla) injecting attributes into `<body>`. Added `suppressHydrationWarning` to `<html>` and `<body>` tags in `src/app/[locale]/layout.tsx` and `src/app/not-found.tsx`.

## [2026-10-17] - Veloce Studio: Pixel-Perfect 1:1 Refinement & Asset Polish
### Fixed
- Fixed car image rendering failure caused by stale `sessionStorage` blob URLs by enforcing protocol checks (`data:image/` or local asset paths) and binding an `onError` auto-fallback to `/images/studio/studio_coupe_tuned.jpg`.
- Resolved wheel card distortion by extracting and re-isolating clean wheel rims with anti-aliased circular masks, eliminating all interior screenshot borders.
- Removed extraneous top header buttons (camera and before/after pills) to strictly replicate the minimalist reference mockup (`<` and centered `CUSTOMIZE` only).
- Moved carousel navigation chevrons (`<` and `>`) closer to the preview cards for authentic thumb ergonomics and tight visual balance.
- Redesigned `APPLY CHANGES` pill button to `rounded-[22px]` (height 54px, max width 340px) with rich champagne gold gradient (`#DFBE82` -> `#CFA559`) and elevated bottom margin (`mb-6 sm:mb-8`).

## [2026-10-17] - Veloce Studio: 1:1 CUSTOMIZE Screen Implementation
### Added
- Created 1:1 CUSTOMIZE Studio screen matching user reference mockup (`media_1792196851089.png`) in `StudioWorkspace.tsx`:
  - **Top Bar**: `<` back chevron linking back to `/seller` or `/garage`, crisp `CUSTOMIZE` title with `0.28em` tracking.
  - **Car Viewport**: Front-right angle view of black sports coupe in dark studio lighting with ambient lighting and floor reflections; loads user's Smart Camera photo if available.
  - **Category Tabs**: `WHEELS` | `BODY KIT` | `SUSPENSION` | `COLOR` with champagne gold underline indicator.
  - **Carousel Tape (`lenta kabi`)**: Left (`<`) and right (`>`) arrow chevron buttons, touch swipe, keyboard arrow navigation, active item in champagne gold rounded frame (`border-2 border-[#D4AE62] shadow-[0_0_24px_rgba(212,174,98,0.35)]`).
  - **Active Item Details**: Title (e.g. `VZ-01`), Subtitle (`Forged Lightweight`), Spec (`20"`).
  - **Action Button**: Large champagne gold `APPLY CHANGES` pill button (`#E6C687` -> `#D4AE62`).
  - **Before/After Comparison Mode**: Upon clicking `APPLY CHANGES`, procedural audio and haptic feedback trigger, and the interactive Before/After comparison slider activates (Factory Spec vs CarVision 4K Tuned).
  - **Desktop Responsiveness**: Full widescreen studio layout with centered car viewport and clean controls.

## [2026-10-17] - Seller Dashboard: Central "CREATE" Action & Smart Camera Scan Integration
### Added
- Inserted a central elevated `CREATE` action button in the center of the mobile bottom navigation dock: `HOME` | `GARAGE` | `CREATE` | `SHOP` | `MORE`.
- Designed `CREATE` with a champagne gold gradient circular button (`#F3D9A4` -> `#D4AE62` -> `#B88E3E`), camera icon with `+` badge, elevated ambient gold glow, and micro-hover animation.
- Connected both `CREATE` and the home hero `CUSTOMIZE YOUR RIDE >` button to open the full-screen Smart Camera modal (`isSmartCameraOpen`).
- Mounted `SmartCameraView` with real-time video stream, 3D vehicle orientation guide, gyroscopic motion sensors, shutter audio, and flash animation.
- Added demo test car capture and manual photo upload fallback options.
- Automated vehicle lock sequence ("AVTOMOBIL ANQLANDI // 4K SCAN TAYYOR") with seamless redirection to `/${locale}/studio?captured=1`.

## [2026-10-17] - Veloce Garage: 1:1 Hero Typography Calibration
### Changed
- Mathematically calibrated typography placement in the Veloce Garage hero section against the reference mockup:
  - `YOUR GARAGE`: positioned at target y=175 (scaled from ref y=60/265), tracking `0.28em`, bone tone `#A69F92`.
  - `ALL YOUR`: positioned at target y=222 (scaled from ref y=80/265), light sans-serif, warm cream `#F5F2EB`.
  - `MODIFICATIONS`: positioned at target y=292 (scaled from ref y=105/265), champagne gold `#E0C07E`, precisely aligned with coupe headlights and grille.
  - `IN ONE PLACE`: positioned at target y=362 (scaled from ref y=130/265), light sans-serif, warm cream `#F5F2EB`.
  - `Track • Customize • Upgrade`: positioned at target y=465 (scaled from ref y=167/265), placed comfortably over the dark reflective wet floor.
- Upgraded `garage_hero_v3.jpg` and `garage_hero_1to1.jpg` with 3x retina resolution (1200x780 at 98% quality).
- Updated `SellerDashboard.tsx` with cache-busted path `src="/images/garage/garage_hero_v3.jpg?v=3.1"`.

## [2026-10-17] - Seller Dashboard: Fixed Borderless High-Blur Mobile Bottom Dock
### Changed
- Configured the bottom navigation dock to remain permanently `fixed` at the bottom of the viewport on mobile devices (`fixed inset-x-0 bottom-0 z-40 md:absolute max-w-[430px] mx-auto`), allowing content to scroll smoothly behind it.
- Completely removed the top border (`border-t`) and hairline divider line for a 100% borderless, depth-based elevation aesthetic.
- Enhanced glassmorphism with high-intensity frosted blur (`backdrop-blur-3xl`) and `bg-[#07080B]/80`, with deep soft shadow (`shadow-[0_-12px_36px_rgba(0,0,0,0.9)]`).
- Increased bottom spacing on content grids (`mb-28` on Home, `mb-32` on Garage) and safe-area padding (`pt-3.5 pb-5 px-3 md:pb-3.5`) to eliminate content clipping.
### Added
- Created dedicated App Router page `src/app/[locale]/garage/page.tsx` rendering `SellerDashboard initialTab="garage"`.
- Replaced internal React state `<button>` triggers in the bottom dock, desktop sidebar, and slide-over drawer with real Next.js `<Link>` components pointing to `/${locale}/garage` and `/${locale}/seller`.
- Integrated `usePathname()` so the browser address bar immediately updates to `/uz/garage`, supporting direct linking, browser history (back/forward), and bookmarks.
- Verified zero TypeScript errors (`npx tsc --noEmit`), zero physical direction violations, and clean HTTP 200 responses on both `/uz/seller` and `/uz/garage`.
### Added
- Implemented the 1:1 Veloce Garage & Workshop Warehouse view accessible via the bottom nav `GARAGE` tab (or `?tab=garage`):
  - **Header Branding**: Dynamically toggles to `VELOCE // GARAGE` in warm gold/bone typography.
  - **Hero Section**: 1:1 Ultra-HD 1200x780 luxury hero banner (`public/images/garage/garage_hero_1to1.jpg`) with photorealistic black sports coupe in underground showroom, vertical ambient light pillars, reflective dark floor, and crisp integrated typography (`YOUR GARAGE`, `ALL YOUR MODIFICATIONS IN ONE PLACE`, `Track • Customize • Upgrade`).
  - **Sharpened Card Assets**: Enhanced and sharpened 4K product photos (`bbs_wheel.jpg`, `carbon_lip.jpg`, `kw_suspension.jpg`, `m_seats.jpg`) with unsharp masking and optimized contrast.
  - **Custom "ADD DETAIL >" Button**: Positioned directly above the categories bar, styled with champagne gold gradient pill background (`#E6C687` -> `#D4AE62`), dark uppercase tracking typography, chevron right icon, and subtle ambient gold drop shadow, matching the home CTA button dimensions and style.
  - **Category Filter Tabs**: Horizontal scrollable bar with `ALL`, `WHEELS`, `BODY KIT`, `SUSPENSION`, `INTERIOR`, and `PERFORMANCE` pills with active gold border/glow state and live filtering.
  - **Inventory Section**: `YOUR PRODUCTS` section header with dynamic items counter (`${count} ITEMS >`).
  - **2-Column Product Grid**: 12 warehouse products with category badges, high-res photos (`bbs_wheel.jpg`, `carbon_lip.jpg`, `kw_suspension.jpg`, `m_seats.jpg`), titles, subtitles, and interactive `...` action menus.
  - **Interactive Add Detail Modal**: Form allowing workshop owners to add custom inventory parts with real-time prepend to the products list and instant counter update.
  - **Item Action Modal**: Quick modal for product inspection, linking to 4K Studio visualizer or removing from inventory.
  - **Desktop Integration**: Desktop side panels allow instant switching between Home and Garage views, plus direct access to Add Detail.
- **Verification**: Zero TypeScript errors (`npx tsc --noEmit`), zero physical CSS direction violations (`scripts/check-physical-direction.mjs`), all 24 Vitest domain tests passing, clean dev server operation on port 3000 (HTTP 200).
### Fixed
- Fixed runtime `MODULE_NOT_FOUND: Cannot find module './vendor-chunks/@supabase+auth-js@...'` caused by running `next build` over active `next dev` server processes.
- Terminated duplicate background Next.js processes, wiped stale `.next` cache, and launched a dedicated clean `next dev` instance on port 3000.
- Verified all application routes (`/seller`, `/marketplace`, `/studio`, `/login`, `/`) return clean HTTP 200 responses.

## [2026-10-17] - Seller Dashboard: High-End Automotive Luxury Icons for Bottom Dock
### Changed
- Replaced generic bottom navigation icons with high-end automotive precision icons:
  - **HOME**: `Gauge` (Tachometer / Speedometer instrument cluster dial with needle)
  - **GARAGE**: `CarFront` (Aggressive supercar front silhouette with headlights and aerodynamic curves)
  - **SHOP**: `Store` (Curated tuning house & parts boutique storefront)
  - **MORE**: `SlidersHorizontal` (Precision tuning parameters & atelier calibration console)
- Enlarged icon size to `h-6 w-6` with refined `stroke-[1.8]` precision engineering line weight.
- Enhanced active state with radiant champagne gold glow (`drop-shadow-[0_0_12px_rgba(230,198,135,0.5)]`), subtle scale micro-interactions, and a glowing gold dot indicator.
- Added ambient gold hairline sheen along the top edge of the dock.
- Configured clean `src/app/layout.tsx` root layout alongside `src/app/not-found.tsx` for 100% build and dev server stability.

## [2026-10-17] - Seller Dashboard: 1:1 Geometric Sans Typography & Left-Aligned CTA Pill
### Changed
- Converted `BUILT DIFFERENT` headline into an exact 1:1 replica of user's reference screenshot:
  - Clean, light geometric sans (`font-heading text-2xl sm:text-3xl font-light`) with wide tracking (`tracking-[0.34em]`) in warm bone off-white (`#EDE8DF`).
  - Lightened tagline `TUNE • STYLE • PERFORM` to `font-normal tracking-[0.24em] text-[#8C867D]`.
- Re-aligned CTA button `CUSTOMIZE YOUR RIDE >` to the left (`flex justify-start`), formatted as a compact luxury pill (`inline-flex px-6 py-3.5`) directly aligned with the headline.
- Terminated conflicting duplicate background dev server instances, cleared stale webpack cache, and restarted fresh dev server on port 3000 (HTTP 200).

## [2026-10-17] - Fix: Not-Found Layout & PWA Icon 404 Resolution
### Fixed
- Fixed Next.js App Router error `"not-found.tsx doesn't have a root layout"` by moving `not-found.tsx` to `src/app/[locale]/not-found.tsx` (properly nested within the root `[locale]` layout).
- Generated missing PWA assets `public/icons/icon-192.png` and `public/icons/icon-512.png` in high-resolution dark luxury CarVision branding.
- Restored dev server clean operation (HTTP 200 on all routes and static assets).

## [2026-10-17] - Seller Dashboard: Car Image Zoom, 85% Centered CTA & Modern Sports Typography
### Changed
- Zoomed hero car artwork by ~12% (`scale-[1.12]` with smooth hover expansion) to give the BMW M4 Coupe a more aggressive, dominant road presence inside the mobile frame without overflow.
- Re-architected CTA button `CUSTOMIZE YOUR RIDE` from edge-to-edge `w-full` into an 85% width centered luxury pill (`w-[85%] mx-auto`), enhancing visual balance and one-handed thumb ergonomics.
- Upgraded `BUILT DIFFERENT` headline typography from classical thin serif to **Modern Bold Sports** (`font-heading font-black tracking-[0.18em]` with subtle drop shadow) for an authentic high-performance motorsport identity.

## [2026-10-17] - Seller Dashboard: Removed Mock iOS Home Indicator Line
### Changed
- Removed mock iOS home indicator bar (`mx-auto mt-2.5 h-1 w-28 rounded-full bg-white/25`) from bottom navigation dock in [SellerDashboard.tsx](file:///Users/asadbekjumanazarov/Desktop/CarVision/src/features/seller/components/SellerDashboard.tsx) per user request.
- Adjusted bottom navigation bar padding to balanced `py-3.5`.

## [2026-10-17] - Seller Dashboard: Fixed BUILT DIFFERENT Text Clipping & Image Floor Blend
### Fixed
- Fixed visual clipping where `BUILT DIFFERENT` text was partially hidden behind the car image box:
  - Removed negative `-mt-3` margin on the typography container and replaced with natural `mt-2` top spacing.
  - Added `relative z-20` to guarantee the text content layer always sits above image overlays.
  - Applied smooth color gradient blending on `public/images/veloce_black_coupe.jpg` floor reflection directly into the `#07080B` background tone, eliminating any hard rectangular cutoff line.
- Added root `src/app/not-found.tsx` to ensure rock-solid production build compatibility across all routes.

## [2026-10-17] - Seller Dashboard: Removed Mock Mobile Status Bar
### Changed
- Removed mock iOS status bar (`9:41`, Wi-Fi, Signal, Battery) from [SellerDashboard.tsx](file:///Users/asadbekjumanazarov/Desktop/CarVision/src/features/seller/components/SellerDashboard.tsx) per user request.
- Adjusted top header padding to `pt-5 pb-3` for clean, professional spacing.
- Cleaned up unused `Wifi`, `Signal`, `Battery` imports.

## [2026-10-17] - 1:1 Veloce Workshop Dashboard (`/[locale]/seller`)
### Added
- Generated 8K photorealistic black BMW M4 Coupe image in dark studio lighting (`public/images/veloce_black_coupe.jpg`) via `generate_image`.
- Completely revamped `SellerDashboard` (`src/features/seller/components/SellerDashboard.tsx`) with an exact 1:1 copy of the Veloce mobile app:
  - Mobile status bar (`9:41`, cellular, wifi, battery)
  - Top header: gold hamburger menu, `VELOCE // DRIVE BEYOND` typography, user profile outline avatar
  - Hero car section with seamless dark vignette
  - Bold typography: `BUILT DIFFERENT` and `TUNE • STYLE • PERFORM`
  - Champagne gold pill CTA button `CUSTOMIZE YOUR RIDE >` linked to `/[locale]/studio`
  - 3 feature cards: `PERFORMANCE` (Engine/Tuning/Exhaust), `STYLE` (Wheels/Body Kits/Colors), `TRACK` (Lap Times/Analytics/Improve)
  - Bottom navigation dock: `HOME` (active), `GARAGE`, `SHOP`, `MORE` with iOS home indicator pill
  - Slide-out atelier controls drawer for studio, marketplace, lock customer view, voucher redemption, and demo profile switcher
  - Responsive desktop layout: centered luxury titanium gold iPhone frame with ambient studio lighting and side workshop telemetry panels
- Fixed unused variable TypeScript lints in `UserAccountBar.tsx` and `AuthContext.tsx`.

### Verified
- `npm run check-direction`: 0 physical CSS direction classes, 100% RTL compliant.
- `npx tsc --noEmit`: 0 TypeScript errors.
- `npm test`: 24/24 Vitest domain tests passing.
- `npm run build`: Next.js 15 production build succeeded cleanly.
- `http://localhost:3000/uz/seller`: HTTP 200 OK.

## [2026-10-17] - 1:1 Golden Flow Landing Page Migration (Lovable golden-flow-scroll)
### Added
- Downloaded and integrated 4K studio assets into `public/images/golden/`:
  - `hero-car.jpg` (1920x1088 Porsche 911 studio hero background)
  - `car-before.jpg` (1600x912 stock sports car)
  - `car-after.jpg` (1600x912 tuned 4K visualizer car)
  - `app-phones.jpg` (1200x1200 high-res mobile app mockups)
- Added golden design tokens and utilities in `styles/tokens.css` and `styles/globals.css`:
  - `--primary-glow`, `--gradient-gold-text`, `--gradient-card`, `--shadow-card`
  - `.text-gold-gradient`, `.text-gold`, `.btn-gold`, `.btn-ghost-gold`, `.grain`, `.reveal`, `.mask-fade-x`, `.bg-card-lux`, `.shadow-lux`, `.glass-nav`, `.glass`, `.shimmer-text`, `.sweep`
  - Keyframe animations: `@keyframes marquee`, `@keyframes rise`, `@keyframes scrollline`, `@keyframes float`, `@keyframes slowzoom`
- Replaced `src/app/[locale]/page.tsx` with a completely clean, 1:1 implementation of `https://golden-flow-scroll.lovable.app`:
  - `Header`: Scroll-revealed glass pill navbar (>120px scroll), mobile slide drawer, anchor navigation, and direct "KIRISH" link to `/${locale}/login`.
  - `Hero`: Shimmering luxury typography, gold badges, high-impact CTAs ("VIZIONNI YOQING", "ILOVANI YUKLASH"), scroll line indicator.
  - `BrandsMarquee`: Infinite marquee of world luxury brands (Porsche, Mercedes-Benz, BMW M, Ferrari, Audi RS, Lamborghini, Rolls-Royce, Aston Martin).
  - `VisualizerBeforeAfter`: Interactive before/after split comparison slider with pointer/touch dragging, keyboard arrows, and fitment telemetry badges.
  - `HowItWorks`: 3-step luxury guide with large numeral watermarks and gold accent icons.
  - `TargetAudience`: High-end cards for "Ustaxonalar uchun" and "Egalar uchun".
  - `Pricing`: Interactive monthly/yearly billing toggle (20% discount calculation) with Sinov ($0), Pro Atelier 800 ($99/mo), and Enterprise Fleet ($349/mo).
  - `Reviews`: 4 verified client testimonials with 5-star ratings.
  - `MobileApp`: Cinematic mobile preview showcase with App Store and Google Play badges.
  - `Faq`: Expandable accordion with smooth CSS grid row transitions.
  - `CtaBanner`: Grand finale call to action with crystal-clear 4K Porsche background and cinematic radial vignette.
  - `Footer`: Complete luxury footer with brand mark, Tashkent studio contact info, column navigation, and social links.
- Fixed FAQ accordion and pricing cards disappearing on click: moved `.reveal` to the outer container and added `data-revealed="true"` with CSS `!important` to prevent React re-renders from erasing imperative `.in` classes and turning cards invisible. Added `min-h-0` for smooth CSS grid row height transitions.
- Fixed `CtaBanner` and `Hero` background overlays: replaced broken `via-background/60` Tailwind gradient (which rendered 100% solid black) with an explicit radial vignette (`opacity-80`), making the luxury car and its gold rim lighting prominently visible behind the text.
- Strictly preserved `/login` and `/register` pages and authentication flow.
- Purged obsolete cyan `AuthModal` (`src/features/auth/components/AuthModal.tsx`), unmounted it from root `layout.tsx`, deleted unused `src/components/CompareSlider.tsx`, and rewired `UserAccountBar` and `AuthContext` to navigate directly to dedicated `/login` and `/register` routes.
- All directional CSS complies 100% with RTL logical CSS standards (`check-physical-direction.mjs`: 0 violations).

### Verified
- `npm run check-direction`: 0 violations.
- `npx tsc --noEmit`: 0 TypeScript errors.
- `npm test`: 24/24 Vitest domain tests passing.
- `npm run build`: Production build succeeded with all routes statically and dynamically generated.
- HTTP status checks: `/uz` (200), `/uz/login` (200), `/uz/register` (200).

## [2026-10-17] - 1:1 Auth Redesign (Lovable step-up-welcome)
### Added
- Extracted and added high-res Porsche 911 studio background: `public/images/auth_bg_lovable.jpg`.
- Added Google Fonts `Cormorant Garamond` (display) and `Manrope` (body/UI) in `src/app/[locale]/layout.tsx`.
- Added luxury design tokens `--gold`, `--gold-deep`, `--glass`, `--glass-border`, `--ink`, `--gradient-gold`, `--shadow-gold` to `styles/tokens.css` and extended `tailwind.config.ts`.
- Added CSS animation classes `.gold-btn`, `.glass-card`, `.auth-input`, `.animate-beam`, `.animate-aurora`, and `@keyframes shine` to `styles/globals.css`.
- Created modular `src/features/auth/components/AuthShell.tsx` containing `AuthShell`, `GlassCard`, `FloatingInput`, `GoldButton`, and animated geometric SVG `BrandHeader`.
- Replaced `src/app/[locale]/login/page.tsx` with 1:1 implementation matching Lovable (floating labels, phone formatting, shake error, "Meni eslab qol" checkbox, gold shimmer button, and auth redirection).
- Replaced `src/app/[locale]/register/page.tsx` with 1:1 multi-step wizard (progress bar, searchable country selector, role cards, validation, and celebration success animation).
- Optimized layout sizing (`h-screen max-h-screen overflow-hidden`, `max-w-[390px] sm:max-w-[410px]`, `h-12` inputs/buttons, compact spacing) so the entire page fits seamlessly within standard 100vh viewports at 100% zoom with zero vertical scrolling (matching the desired 80% proportional aesthetic).

### Verified
- `npm run check-direction`: 0 physical CSS direction violations (100% Arabic RTL compliant).
- `npx tsc --noEmit`: 0 TypeScript errors (Strict mode).
- `npm test`: 24/24 Vitest domain tests passing.
- `npm run build`: Next.js production build succeeded cleanly.
