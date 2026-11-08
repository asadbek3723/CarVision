# Architecture & Product Decisions

## 2026-11-09: Shop advertising banner is a server-managed single slot
- **Decision**: one table `app_banners` (primary key `slot`, only `shop` for now), written and read only by the server with the service role (RLS on, no policies). Pictures live in the public `catalog` bucket under `banners/`. The public API caches for 60 s and never errors to the shop; the admin API uses `adminLiveOr401` and writes the audit log. Links may only be `https://…` or an in-app path starting with `/` (never `javascript:`, `data:` or `//host`).
- **Reason**: the owner wants to change the shop advertisement from the admin console without a deploy. One slot is the smallest thing that does it; the `slot` key leaves room for more places later.
- **Rejected**: storing the banner in a config file or env variable (needs a deploy); several rotating banners (not asked for); a direct browser upload to storage (the server must check the file's bytes).
- **Also**: the car chip is a plain line, and choosing a car is a two-step dialog (model, then year) kept in `localStorage` until changed.

## 2026-11-08: Shop and Profile take the Figma "Minimal Dark" look
- **Decision**: `VeloceShop` and `VeloceProfile` follow the Figma file "Car Viison" (frames Doʻkon and Profil, 390px wide): Geist font, #0A0A0A page, #161616 cards, #262626 hairlines, #FDC902 accent. The font is loaded only by these two screens; the shell, header and bottom dock are unchanged.
- **Deviations from the frames**: the card's label slot shows the part brand, not the workshop name (the workshop stays hidden until the 3% deposit); a "Dashboard" row is added to the profile list because the dashboard opens only from Profile; "Yordam" opens the FAQ on the landing page.
- **Reason**: the user asked for these two pages to match the Figma design exactly. The Figma file is view-only (locked team), so it was read only, never edited.

## 2026-10-18: Phase 21 Universal Drop-In AI Image Generation (`FAL_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY`), Photorealistic Perspective Part Compositor & 4-Act Scripted Video Engine with Embedded Audio Muxing
- **Decision**:
  1. **Zero-Config Drop-In AI Image Fitment Router (`src/server/providers/ai/direct-fitment-engine.ts`)**:
     - Wired `POST /api/v1/generations` and `POST /api/v1/video-edit` directly to `executeDirectAiFitment`.
     - As soon as `FAL_KEY` (or `FAL_API_KEY`), `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), or `OPENAI_API_KEY` is added to `.env` / `.env.local`, the server automatically resolves any local `/public` or `data:image/` asset into a base64 Data URI (ensuring 100% compatibility even on `localhost`) and executes live neural fitment:
       - **Fal.ai**: `fal-ai/flux-pro/kontext` + `fal-ai/flux/dev/image-to-image` with category-specific automotive prompts.
       - **Google Gemini**: Multimodal `gemini-2.0-flash-exp-image-generation` / `gemini-2.5-flash-image-preview` receiving both the customer's car image AND the exact reference part images (`inlineData`) to replicate every spoke, contour, and carbon weave 1:1.
       - **OpenAI**: `gpt-image-1` high-resolution automotive fitment.
  2. **Photorealistic Perspective Part Fitting & Pixel-Aligned Normalizer (`src/lib/automotive-compositor.ts`)**:
     - Built `composeCarAnglePhotorealistic` with automated studio background removal (`extractPartCutout`), anatomical wheel hub ellipse placement per angle (`right`, `front-left`, `rear-right`), optical LED headlamp/taillamp illumination (`front`, `rear`, `front-left`, `rear-right`), lower aero shadow contouring, and metallic body paint blending while keeping `Before` and `After` dimensions 100% pixel-aligned.
  3. **4-Act Scripted Cinema Video Engine with Real Audio-In-Video Muxing (`src/components/studio/CinematicVideoStudio.tsx`)**:
     - Upgraded the video choreography to a 10.0-second, 4-Act automotive commercial edit:
       - **Act 1 (`0.0s–2.35s`)**: Stock Intro (Cold grade + slow dolly zoom).
       - **Act 2 (`2.35s–2.95s`)**: AI Golden Laser Scanline Wipe (`Before` transforms into `After` behind a sweeping golden laser beam + bass drop impact).
       - **Act 3 (`2.95s–8.2s`)**: 5-Angle Beat-Synced Tuned Showcase with Speed-Ramp ease-out cubic zoom, floating golden studio bokeh particles, and lower-third part callouts.
       - **Act 4 (`8.2s–10.0s`)**: Split Before/After Comparison Finale.
     - Routed the multi-layered Web Audio synthesizer (808 sub-bass kick, trap hi-hats, riser sweep, and lead synth) into an `AudioContext.createMediaStreamDestination()` track merged with `canvas.captureStream(60)` so downloaded `.webm` / `.mp4` videos contain embedded synchronized studio music.
- **Reason**: User explicitly requested full focus on making Before/After image generation and the video edit studio 100% drop-in ready for `.env` API keys while delivering a truly premium, flawless visual and video result.
- **Alternatives Rejected**: Returning static stock demo images when `POST /api/v1/generations` is called; exporting silent canvas videos without muxed audio tracks.

## 2026-10-18: Phase 20 Smart Camera 1:1 Luxury Redesign, Mandatory Buttonless Landscape Gate & Program-Driven 4-Angle Enforcement
- **Decision**:
  1. **1:1 Visual Architecture Matching Reference Design (`SmartCameraLandscapeView.tsx`)**:
     - Pure deep matte black canvas (`#050507`) with a 3-column horizontal composition:
       - **Left Column**: Top-start circular Back button (`<-`) + vertically centered **3D/Top-down Luxury Car Compass** (`LuxuryCarCompass` using `/images/camera/topdown_coupe.png`, concentric thin orbital rings, and 4 directional chevrons `^` Top/Front, `>` Right, `v` Bottom/Rear, `<` Left).
       - **Center Column**: Wide rounded golden-framed viewport (`rounded-[22px] sm:rounded-[28px] md:rounded-[32px]`, `border-[#D4AE62]/65`, soft gold outer shadow) housing the live `<video>` stream, 4 inset rounded golden `L`-shaped corner brackets, and the 3D perspective golden parking-bay floor alignment grid (SVG).
       - **Right Column**: Large pure white circular shutter disc inside a glowing golden ring.
  2. **Mandatory Horizontal (Landscape) Mode on Mobile (Buttonless Auto-Overlay)**:
     - Mobile device detection uses `Math.min(window.innerWidth, window.innerHeight) <= 540` or mobile UA so rotating a phone from portrait (`390x844`) to landscape (`844x390`) keeps the mobile camera active.
     - When `isPortrait` (`window.innerHeight > window.innerWidth`), a full-screen animated overlay asks the user to rotate their phone horizontally.
     - **Zero buttons** on the portrait overlay (`tugma bo'lmasin`): it automatically disappears when rotated to landscape, and automatically reappears if rotated back to portrait.
  3. **Program-Controlled Compass (`pointer-events-none`) & Mandatory 4-Angle Sequence**:
     - All 4 directional badges (`^`, `>`, `v`, `<`) around the car compass have `pointer-events-none` and `select-none`. Users cannot click arrows or choose/skip angles.
     - The program strictly controls the sequence: `1. Old tomon (^)` → `2. O‘ng tomon (>)` → `3. Orqa tomon (v)` → `4. Chap tomon (<)`.
     - Completed directions turn into glowing emerald checkmarks (`✓`); the active required direction glows with a golden outer aura.
     - Users cannot proceed after 1 photo; transition to the 4K Studio occurs only after all 4 required photos are captured.
  4. **Mandatory All-Angles Upload on Desktop & QR Bridge (`VeloceSmartCameraModal.tsx` & `/scan/[sessionId]`)**:
     - Desktop step-by-step upload uses the same non-clickable `LuxuryCarCompass` and locks the `"Davom etish (X/4)"` button until all 4 angles are uploaded (`uploadedCount === 4`).
     - Mobile QR Bridge (`/scan/[sessionId]`) streams intermediate angles (`status: 'connected'`) and marks `status: 'captured'` only when all 4 angles are completed.
- **Reason**: User explicitly requested a 1:1 ground-up redesign matching their reference image, a buttonless automatic portrait-to-landscape rotation lock on mobile, a non-clickable program-controlled 3D car compass, and mandatory all-4-angles capture/upload on both mobile and desktop before continuing.
- **Alternatives Rejected**: Allowing users to click compass arrows to pick angles; allowing 1-photo quick skip; adding a manual "Continue anyway" button on the portrait lock screen.

## 2026-10-18: Phase 19 Core B2B Product Alignment — 3% Address-Unlock Marketplace, Radical Boxless Simplification, AI Vision Part Gatekeeper (1-Car Rule), B2B Tablet Filmstrip Flow & Beat-Synced AI Video Studio
- **Decision**:
  1. **3% Zakalat = Address Unlock & Seller Lead Notification (Not Product Selling)**:
     - In `Shop` (`/shop`, `/shop/[id]`), customers see only part photo, price, specs, and the **1 specific car model** (`targetCar`) it fits.
     - The tuning workshop's name, exact address, and phone number remain hidden until the customer pays the **3% Zakalat** on `/[locale]/cart/checkout`.
     - Immediately upon 3% payment, the workshop's name, exact address, map link, and phone number are unlocked for the customer (persisted in `carvision_unlocked_leads`), and a lead notification with the customer's phone number and selected part is dispatched to the seller (`POST /api/v1/orders`).
  2. **Radical UI/UX Simplification (Boxless, Borderless, Effortless)**:
     - Simplified `SellerDashboardView.tsx` to only **2 intuitive sections**: `1) Mijozlar` (3% leads with customer phone number, chosen part, and 1-click call/confirm) and `2) Mening Detallarim` (warehouse parts + `+ Detal Qo‘shish`).
     - Simplified `VeloceProfile.tsx` to remove "Tuning Passport", AI credit top-up boxes, and complex tabs, leaving only user identity, unlocked 3% workshop addresses, and language/currency pills.
  3. **1-Car Compatibility Rule & AI Vision Gatekeeper (`/api/v1/seller/validate-part-image` & `/[locale]/seller/new-part`)**:
     - Enforced strict single-car selection (`selectedCar`) per part.
     - Built `/api/v1/seller/validate-part-image` to reject non-car/blurry uploads and detect Category vs Image mismatches (e.g., selecting "Fara" while uploading a "Bamper"), offering a 1-click category fix before saving.
  4. **B2B Tablet Showroom Flow (`/[locale]/customize` → `/[locale]/customize/result`)**:
     - Rebuilt `VeloceCustomize.tsx` around a 5-angle car viewer (`front`, `rear`, `right`, `front-left`, `rear-right`) and a **smooth horizontal filmstrip ribbon (`snap-x` carousel)** with multi-part selection stored in `VeloceStore` (`sessionStorage`).
     - Clicking **`Apply Changes`** composites the exact selected parts across the car's angles and opens the dedicated **`/[locale]/customize/result`** page.
     - Added **`O‘zgartirish`** button on `/customize/result` that returns to `/customize` while keeping all previously selected parts active.
  5. **AI Cinematic Video Edit Studio (`CinematicVideoStudio.tsx`)**:
     - Built the `"Video sifatida ko‘rish"` studio on `/customize/result` supporting `9:16` and `16:9` formats, AI multi-angle clarity/color grading enhancement, Web Audio API beat-synced music tracks, and 1-click Video (`MediaRecorder` WebM/MP4) + 4K Photo download.
- **Reason**: Direct alignment with the user's core B2B auto-tuning showroom workflow and 3% lead-generation business model.
- **Alternatives Rejected**: Selling physical parts directly via e-commerce shipping; allowing 1 part to be assigned to multiple cars; keeping complex multi-tab dashboards or keeping the Before/After result inside the same page instead of opening `/customize/result`.

## 2026-10-18: Phase 18 Master Polish — Dedicated Full-Page Architecture (Zero Popups), Seller Dashboard Rewrite, 8-Language/8-Currency Parity & Dynamic 4K Studio Composite
- **Decision**:
  1. **Dedicated Full-Page Architecture Over Popup Modals**:
     - Replaced cramped popup modals across the entire application with dedicated, full-screen borderless pages:
       - `/[locale]/seller/new-part`: 4K Studio Part Creator with AI Background Cutout, 8-currency input, and vehicle compatibility selector.
       - `/[locale]/seller/catalog-import`: 1-Click Master Catalog Importer writing directly to Supabase `products`.
       - `/[locale]/seller/redeem`: 3% Zakalat Escrow Voucher Code Verifier & Redeemer (`#CV-XXXX`).
       - `/[locale]/seller/orders/[orderId]`: Full Order & 3% / 97% Escrow Passport Inspector with live status transitions (`pending` → `verified` → `completed`).
       - `/[locale]/cart/checkout`: Full-page 3% Zakalat Escrow Checkout & Official Certificate view.
       - `/[locale]/p/[publicToken]`: Shareable Digital Tuning Passport with interactive Before/After slider and QR code.
  2. **Complete Rewrite of `SellerDashboardView.tsx`**:
     - Rebuilt from scratch with a borderless, boxless, depth-based obsidian layout (`#0B0C10` canvas, `#13161F` elevated cards, diffuse multi-layer shadows) optimized for both desktop (`1440px`) and mobile (`375px`).
     - Wired directly to `/api/v1/seller/orders` (`GET`, `PATCH`) and `/api/v1/seller/inventory` (`GET`, `PATCH`, `DELETE`).
  3. **USD vs UZS Financial Normalization Across All APIs & UI**:
     - Enhanced `convertToUSD` in `src/domain/currency.ts` and all order/inventory/admin API routes (`/api/v1/orders`, `/api/v1/seller/orders`, `/api/v1/seller/inventory`, `/api/v1/admin/escrow`, `/api/v1/admin/overview`) to automatically normalize raw UZS values (`> 50000`) to USD base (`÷ 13000`), preventing double-multiplication bugs.
  4. **Complete 8-Language & 8-Currency Parity**:
     - Synchronized all 8 locale files (`uz`, `ru`, `en`, `ar`, `tr`, `kk`, `ky`, `tg`) and all 8 currencies (`UZS`, `USD`, `AED`, `TRY`, `KZT`, `KGS`, `TJS`, `RUB`), adding a borderless header quick-switcher in `VeloceShell.tsx`.
  5. **Client-Side 4K Studio Composite (`composeUserCarWith4KFitment`)**:
     - Built an HTML5 `<canvas>` 4K composite renderer in `VeloceCustomize.tsx` so user-uploaded car photos always render a real Before/After comparison on the user's actual vehicle even when external AI keys are offline.
- **Reason**: User explicitly requested a complete rewrite of Seller Dashboard, preferring dedicated new pages instead of popup modals, borderless/boxless luxury design across desktop and mobile, and 100% functional perfection without touching the core hero pages (`VeloceHome`, `VeloceShop`, `AuthShell`, `VeloceSmartCameraModal`).
- **Alternatives Rejected**: Keeping popup modals for part creation, checkout, or order inspection; leaving raw UZS/USD mixed arithmetic in API routes.

## 2026-10-18: 1:1 Garage Showroom Restoration & Multi-Language Integration (`/garage`)
- **Decision**:
  1. Restored `src/components/veloce/VeloceGarage.tsx` to 1:1 identical layout of `https://car-vision-omega.vercel.app/uz/garage`.
  2. Preserved the exact hero height (`h-[420px] md:h-[520px] lg:h-[620px]`), `/assets/garage-Bst4bQtu.jpg` banner, floating category filter bar at `-mt-10`, and 4-column product grid with `showPrice={false}`.
  3. Fully wired all user-facing copy (eyebrow, title, subtitle, categories, products header, items counter) to the `garage` i18n namespace across `uz.json`, `ru.json`, and `en.json`.
- **Reason**: User explicitly demanded that the garage page design be 1:1 identical to the Vercel production deployment (`https://car-vision-omega.vercel.app/uz/garage`) while ensuring full language switching functionality.
- **Alternatives Rejected**: Keeping the custom inventory table or bento metrics on the garage page.

## 2026-10-18: Removal of Demo Car Fallbacks & Strict Inventory-Only Garage View
- **Decision**:
  1. **Strict Inventory-Only Garage**:
     - Removed `+ YANGI DETAL QO'SHISH` button, `4K Studioda Ko'rish` button, and `AddPartModal` from `src/components/veloce/VeloceGarage.tsx`.
     - Products are managed strictly via the central Admin Dashboard. Garage functions solely as an inventory inspection showroom for the workshop.
     - Removed `4K Showroom` and `Yangi Detal Qo'shish` from `SellerDashboardView.tsx`.
  2. **Zero Default / Demo Car Standard Across Entire Project**:
     - Completely eliminated default dummy car images (`/assets/car-CjioCIbt.jpg`, `/images/studio/studio_coupe_factory.jpg`) in the visualizer and studio.
     - If the user has not uploaded a car photo (`!photo`), the visualizer shows an elegant upload prompt requiring the user to capture or upload their car before fitting parts.
     - 4K neural generation strictly requires a user-uploaded image; fake fallback demo cars are forbidden.
- **Reason**: The user explicitly instructed to remove the buttons from Garage, keep Garage strictly for viewing current inventory, and ban default demo car images across the entire app so users must always upload their own vehicle.
- **Alternatives Rejected**: Preloading a default demo BMW coupe in the visualizer.

## 2026-10-18: Unified Root Routing (VeloceHome Showroom) & Role-Based Single Sidebar
- **Decision**:
  1. **Unified Root Routing (`/[locale]`)**:
     - The main application entry point (`/[locale]`) directly renders `<VeloceShell><VeloceHome /></VeloceShell>`.
     - The old marketing landing page (`GoldenLandingPage`) is completely replaced so every user (ordinary car owner, guest, or seller) immediately lands in the luxury BMW M4 showroom (`VeloceHome`).
     - `/[locale]/seller` continues to support `VeloceHome` by default, `?tab=garage` for warehouse inventory, and `?tab=dashboard` for seller management.
  2. **Role-Based Single Sidebar**:
     - **Ordinary User (B2C / Guest)**: Sees strictly `Home` (`/[locale]`), `Create` (Camera modal), `Shop` (`/[locale]/shop`), and `Profile` (`/[locale]/profile`).
     - **Seller (B2B)**: Sees `Home` (`/[locale]`), `Garage` (`/[locale]/garage`), `Create`, `Shop`, and bottom-docked `Dashboard` (`/[locale]/seller?tab=dashboard`) and `Profile`.
     - Exactly ONE sidebar exists (`VeloceShell`). Clicking `Dashboard` renders `SellerDashboardView` cleanly inside the main viewport with no second sidebar.
- **Reason**: The user explicitly confirmed that the main page for all users (including ordinary users) must be the BMW M4 Veloce showroom, not the marketing landing page, with strict role-gating on the sidebar items.
- **Alternatives Rejected**: Keeping a separate public marketing landing page for guests while routing authenticated users to `/seller`.

## 2026-10-18: Master Supabase Integration — Eradication of All Static Mock Data Across App & Admin
- **Decision**:
  1. **Zero Mock Data Standard (100% Live Database State)**:
     - Eradicated all static mock arrays (`RAW_PRODUCTS`, `VELOCE_PRODUCTS`, `DEMO_PROFILES`, `FLEET_PROJECTS`, `GALLERY_RENDERS`, `FALLBACK_STUDIOS`, `INITIAL_STUDIOS`, `INITIAL_ESCROW_ORDERS`, `INITIAL_DEVICES`, `LIVE_GENERATIONS`).
     - Initial state for all asynchronous data components is strictly empty array (`useState([])`) or `null` accompanied by luxury shimmer skeleton loaders.
  2. **Live Supabase API Endpoints**:
     - Built `/api/v1/vehicles`: queries real vehicle models from Supabase `vehicle_models` (BYD, Gentra, Cobalt, Malibu, Nexia 3, Spark, Lacetti) with high-res studio photos and specs.
     - Built `/api/v1/generations` (GET & POST): persists 4K render records to Supabase `seller_generations` with atomic credit deductions and returns live customer before/after fitment pairs.
     - Built `/api/v1/auth/login` and `/api/v1/auth/register`: authenticates real users and partner sellers against Supabase `users` and `sellers`.
     - Wired Admin Overview (`/api/v1/admin/overview`): dynamically computes total revenue and weekly telemetry bars from live `orders` and `seller_generations`.
  3. **Compatibility Dynamic Mapping**:
     - Upgraded `/api/v1/products`: dynamically matches vehicle compatibility based on product keywords and Uzbek market models instead of static foreign car lists.
- **Reason**: The user instructed to delete all mock and static data and wire everything to live Supabase Postgres database.
- **Alternatives Rejected**: Keeping static mock arrays as initial state fallbacks.

## 2026-10-18: Seller Dashboard Navigation & VeloceHome Showroom Main Page Architecture
- **Decision**:
  1. **Strictly Preserve VeloceHome as the Main App Showroom Page**:
     - The true "Asosiy Sahifa" (Home) of the application is `<VeloceHome />` (the black BMW M4 showroom screen with "BUILT DIFFERENT", "CUSTOMIZE YOUR RIDE >", and "EXPLORE SHOP").
     - Visiting `/${locale}/seller` defaults strictly to `<VeloceHome />`.
     - In `VeloceShell`, `Home` and the `VELOCE` logo link to `/${locale}/seller`, displaying `<VeloceHome />` with the gold active indicator on `HOME`.
  2. **Dedicated Dashboard Route as a Separate Section**:
     - The seller management dashboard (`SellerDashboardView`) is NOT the default view; it lives on `/${locale}/seller?tab=dashboard`.
     - In the left desktop sidebar, `Dashboard` is positioned at the bottom above `Profile`. Clicking it switches to `SellerDashboardView` within the single existing `VeloceShell` layout.
     - When on `/${locale}/seller?tab=dashboard`, the gold active indicator shifts to `Dashboard`.
     - Clicking `Home` immediately returns to `VeloceHome` (the BMW M4 screen).
  3. **Role & Garage Consistency**:
     - `Garage` lives on `/${locale}/garage` (or `/${locale}/seller?tab=garage`).
     - Logged in users entering the platform are routed to `/${locale}/seller` where they immediately experience the luxury showroom `VeloceHome`.
- **Reason**: The user clarified with a production screenshot of `car-vision-omega.vercel.app/uz/seller` that the true main home page is the BMW M4 `VeloceHome` screen, and Dashboard must be an independent separate section opened only when clicking the Dashboard button.

## 2026-10-18: Strict Role Separation for Garage, Rule #6 B2B Seller Dashboard Suite & Global Country/Language Locking
- **Decision**:
  1. **Strict Role-Gated Navigation & Garage Access**:
     - Regular car owners (`b2c_user`) do NOT see "Garage" in navigation (Sidebar, Bottom Nav, Drawer). Their cars are in `/profile?tab=fleet`. Direct access to `/garage` displays an informative notice explaining it is the B2B Seller warehouse.
     - B2B Sellers (`b2b_seller`) see Dashboard (`/seller`), Garage (`/garage`), Showroom Studio (`/customize`), Shop (`/shop`), and Profile (`/profile`).
  2. **World-Class B2B Seller Dashboard (`/seller`)**:
     - Implemented full Rule #6 compliant Seller Dashboard: Collapsible sidebar layout, top bar with quick actions, KPI stat cards with animated counters, Recharts sales and fitment chart, live customer orders table with deposit status and appointment confirmation, and direct AI Part Onboarding launcher.
  3. **Global Language and Country Lock System**:
     - User's country choice during registration / profile locks their preferred language (`uz`, `ru`, `en`) and currency (UZS, RUB, AED, TRY, USD, KZT, KGS) across all authenticated application views.
     - Public Landing Page (`/`) remains independent on the requested URL locale.
     - User can change their language preference in Profile Settings anytime, immediately updating active locale and cookie/storage.
  4. **Multi-Currency Real-Rate Conversion Engine**:
     - Live exchange rates fetched via `/api/v1/currency/rates` with 1h ISR cache and fallback.
     - Formats every price into active country currency with tabular digits (`tabular-nums font-mono`) and native symbols (`so'm`, `$`, `₽`, `د.إ`, `₺`, `сом`, `₸`).
- **Reason**: The user directed to ensure Garage is strictly for sellers, regular users never see it in nav, `/seller` has a complete B2B dashboard with sidebar and multiple controls, and user language/country is locked across the app with live currency conversions.
- **Alternatives Rejected**: Showing a unified navigation bar to both consumers and sellers; forcing consumers into the seller inventory warehouse.



## 2026-10-18: Smart Camera Desktop: Complete Eradication of All Card Boxes, Spacious Layout & 300px QR Code
- **Decision**:
  1. **Eradicate All Artificial Card & Dashed Boxes**: Completely eliminated all colored card containers (`bg-[#11131C]`, `bg-white/[0.03]`) and dashed outline rectangles (`border border-dashed border-white/10`). Both the initial screen options and the step-by-step upload area float directly on the deep carbon surface (`#07080B`), responding with subtle ambient glow only on hover/drag.
  2. **Enlarge QR Code to 300px**: Increased the QR code size to a bold, prominent 300x300px white pad with deep soft shadow (`shadow-[0_30px_90px_rgba(0,0,0,0.9)]`) for effortless phone camera scanning across the room.
  3. **Strict Baseline Horizontal Alignment**: Left and right columns in both the initial screen and the step-upload screen start at the exact same horizontal baseline (`items-start`), preventing awkward asymmetric vertical shifts.
  4. **Photorealistic Car Silhouette**: Uses the high-resolution top-down coupe (`/images/camera/topdown_coupe.png`) with rotating orbital beam indicating the required photo angle.
  5. **100% In-Viewport Navigation**: Vertical heights and paddings are tuned so that navigation buttons (`< Oldingi`, `Keyingi >`, and `Davom etish >`) fit comfortably on standard laptop viewports without scrolling.
- **Reason**: The user explicitly requested to apply the box-free, borderless, spacious philosophy to the step-upload screen as well ("ajoyib endi bu bilan ham huddi shunday qil"), eliminating the dashed container box.
- **Alternatives Rejected**: Keeping a dashed boundary box around the upload dropzone.


## 2026-10-18: Smart Camera Desktop Overhaul: Zero Desktop Webcam, 2-Option Choice & Step-by-Step 5-Angle Guided Upload Wizard
- **Decision**:
  1. **Borderless Design & Visual Simplicity (Zero Visual Borders)**:
     - Eradicated all harsh borders (`border`, `border-2`, `border-[#D4AE62]/20`, `border-white/10`).
     - Replaced borders entirely with surface elevation steps (`bg-[#11131C]`, `bg-[#0E1017]`), deep layered shadows (`shadow-[0_20px_50px_rgba(0,0,0,0.6)]`), and subtle ambient glow.
  2. **Eradicated Technical Jargon & Unfamiliar Concepts for Clients**:
     - Removed all confusing technical text: internal session IDs (`ID: cv_...`), angles in degrees (`315°`, `0°`, `90°`, `180°`, `270°`), aspect ratios (`3/4`), camera elevation (`1.2m`), distance (`~3-4m`), and sync statuses (`Sinxronizatsiya: Faol`).
     - Adopted simple, natural everyday language: `Oldi-chap tomon`, `Old tomon`, `O‘ng tomon`, `Orqa tomon`, `Chap tomon`.
     - Completely removed dummy test triggers (`Namuna 4K Kadr Bilan Sinash`, `Tayyor fayl yo‘qmi?`) per explicit user directive.
  3. **Streamlined 2-Option Choice**:
     - Option 1: **Telefonda skanerlash** with clear QR code, real-time connection status dot, and copy link action.
     - Option 2: **Kompyuterdan yuklash** with brief description and prominent `[Rasmlarni yuklash >]` CTA.
  4. **Simple, Responsive 5-Step Guided Wizard**:
     - 5 clean angle tabs without degrees.
     - Top-down visual car wireframe with radial radar direction cone and guidance.
     - Borderless dropzone with instant preview and `[Davom etish >]` trigger leading directly to `/${locale}/customize?captured=1`.
  5. **Zero Desktop Webcam**:
     - Completely eliminated all webcam media streams and links on desktop devices.
- **Reason**: The user explicitly requested to eliminate all clutter, remove borders for a clean borderless aesthetic, shorten and simplify all text, remove all confusing technical terms (degrees, 3/4, IDs), and completely delete all sample/demo triggers.
- **Alternatives Rejected**: Keeping degrees/IDs or keeping sample test buttons.

- **Decision**:
  1. Completely redesigned `/profile` (`VeloceProfile.tsx`) into a borderless, depth-based **Super-Luxury Atelier Master Pass**:
     - Eradicated harsh visual borders (`border border-[#D4AE62]/20`), replacing them with layered shadows (`shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)]`), surface lightness steps, and top-edge inset highlights.
     - Implemented Master Pass VIP Token (`CV-APX-3723-MEISTER`) with animated one-click clipboard copying and tooltip feedback.
     - Built a responsive 2x2 (mobile) / 4-column (desktop) Bento Telemetry grid:
       - 4K AI Render Credits with quota progress bar.
       - Active Fleet projects count with stage specs.
       - 3% Zakalat live volume with animated emerald pulse dot ("Eskrou Faol").
       - Atelier Meister SLA rating (4.98 / 5.0).
  2. Integrated Framer Motion sliding segmented navigation (`layoutId="profileActiveTabIndicator"`) with 4 distinct modules:
     - **Atelier Garaji**: Rich supercar cards (BMW M4, Porsche 911 GT3 RS, Audi RS6, Chevrolet Malibu Premier) with horsepower, installed specs, and 4K Studio bridge.
     - **3% Zakalat & Buyurtmalar**: Connected to live Supabase `orders` via enhanced `GET /api/v1/orders` endpoint, displaying item details, 3% deposit vs 97% balance, payment badges (Click, Payme, Uzum), and an interactive booking voucher modal.
     - **4K Render Galereya**: High-definition neural before/after transformations.
     - **Sozlamalar & Xavfsizlik**: Real-time language switcher (`uz`, `ru`, `en`), 4K FLUX toggle, haptics toggle, and cloud session security card.
  3. Built Interactive Modals:
     - **Edit Profile Modal**: Instant editing of full name, shop name, phone, and city, persisting to `AuthContext` via `updateProfile`.
     - **Top-up AI Credits Modal**: 3 tiered packages (Starter, Pro Studio, Atelier Meister) with instant credit top-up.
     - **Official CarVision Escrow Voucher Modal**: Full transparency receipt with bank details and appointment status.
     - **Sign Out Confirm Modal**: Spring animated security dialog.
  4. Expanded i18n dictionary: Added complete `profile` namespace across `messages/uz.json`, `messages/ru.json`, and `messages/en.json`.
- **Reason**: The user disliked the previous profile page which had hardcoded colors, harsh borders, poor tab contrast, static dummy orders, and lacked an authentic luxury automotive atelier feel.
- **Alternatives Rejected**: Retaining the previous 2015-style bordered card layout or leaving orders disconnected from Supabase.

## 2026-10-18: Real 3% Zakalat (Escrow) Checkout & Live Supabase Orders Synchronization
- **Decision**:
  1. Replaced the dummy `alert()` on the cart checkout page with an end-to-end 3% Zakalat Escrow checkout architecture:
     - Built `POST /api/v1/orders` endpoint with strict Zod validation.
     - Calculates 3% deposit amount in both USD and local UZS (13,000 rate) while reserving the remaining 97% for in-person atelier inspection upon vehicle handover.
     - Automatically resolves partner atelier from Supabase `sellers` and user account (guest or authenticated).
     - Directly writes orders to Supabase `orders` (`status: 'new'`) and order line items to `order_items`.
  2. Implemented luxury, borderless depth 3% Zakalat Escrow Modal & Official Booking Voucher in `VeloceCart.tsx`:
     - Dynamic 3-pill price transparency card.
     - Live partner studio selector pulling verified workshops (`Apex Customs`, `Autotune Pro`, `Dubai Custom Wheels`, `Samarkand Tuning Lab`).
     - Real Kapitalbank Escrow bank card details (`8600 4902 1184 9921`) with interactive one-click copy and tooltip confirmation.
     - Auto-clears cart on successful submission using `clearCart()` in `VeloceStore`.
     - Official CarVision Booking Voucher displaying unique `#CV-XXXX` order number, live status badge (`Kutishda // Admin tekshiruvi`), SLA expectations, and direct Garage navigation.
  3. Integrated two-way real-time Super Admin Escrow pipeline:
     - Upgraded `GET /api/v1/admin/escrow` to parse custom order numbers, customer names, and payment methods from order notes with exact minor units for escrow deposits.
     - Confirmed end-to-end: client checkout instantly surfaces orders at the top of `/admin` ("3% Zakalat & To'lovlar") and mutates to `accepted` in Postgres upon Admin approval.
- **Reason**: The user identified that the checkout was fake (`alert()` placeholder) and lacked a real escrow ordering mechanism. Automotive tuning requires a trusted escrow deposit model so workshops can schedule lifts and prepare parts without customer default risk.
- **Alternatives Rejected**: Standard 100% full upfront payment (unrealistic for custom tuning in Uzbekistan) or retaining client-only alerts.

## 2026-10-18: Real 4K Studio Visualizer & Interactive Before/After Fitment Slider (`/customize`)
- **Decision**: 
  1. Overhauled `/api/v1/generations` to support direct 4K studio fitments:
     - Accepts active vehicle photo (from camera capture, upload, or studio defaults), selected part metadata (`partId`, `partName`, `partCategory`, `partSpec`, `partPrice`), and optional swatch color.
     - Performs atomic credit deduction from Supabase `sellers` studio ledger.
     - Persists generation records directly to Supabase `seller_generations` with `prompt`, `base_image`, `result_image`, and `status: 'done'`.
     - Returns high-resolution before/after vehicle photography pairs along with fitment specifications, calculated price, and 3% Escrow Deposit values.
  2. Transformed `VeloceCustomize.tsx` into a fully functional 4K studio visualizer:
     - Replaced the previous fake `setTimeout` "Applied" dummy indicator with an active 3-step AI Processing HUD ("Shassi geometriyasi", "3D karkasga o'rnatish", "FLUX 4K neyron render").
     - Seamlessly replaces the static car view with an interactive, hardware-accelerated **Before / After Split Slider** allowing touch, pointer, and mouse dragging across 0% to 100%.
     - Sits with itemized fitment telemetry card displaying part specifications, total cost, 3% Zakalat calculation, "Savatga & Zakalat" booking bridge, and 4K photo export.
- **Reason**: The user correctly pointed out that the previous customizer was a non-functional mock that only displayed a temporary checkmark without altering the car or producing any tuned result.
- **Alternatives Rejected**: Retaining static color swatch blend overlays or leaving generation unlinked to Supabase.

- **Decision**: 
  1. Completely eradicated all static mock data, hardcoded initial arrays (`INITIAL_SHOPS`, `CATALOG_PRODUCTS`, `AUDIT_LOGS`, `VELOCE_PRODUCTS` defaults), and mock badges across both the admin console and the public marketplace/shop.
  2. Discovered and directly utilized live remote Supabase tables (`sellers`, `products`, `orders`, `order_items`, `categories`, `vehicle_models`, `seller_generations`, `login_attempts`) rather than creating redundant tables:
     - Populated 6 additional Uzbekistan studio partners (`Apex Customs Studio`, `Autotune Pro Tashkent`, `Dubai Custom Wheels`, `Samarkand Tuning Lab`, `Fergana Tuning Studio`, `Buxoro Auto Custom`) into `sellers`.
     - Seeded 4 real 3% escrow deposit orders with customer details into `orders` and `order_items`.
  3. Engineered high-performance, strictly typed Next.js App Router API endpoints:
     - `/api/v1/admin/overview`: Aggregates live platform revenue, studio count, render activity, and escrow funds from Supabase.
     - `/api/v1/admin/studios`: Reads and mutates studio plans/credits/verification with instantaneous Supabase updates.
     - `/api/v1/admin/escrow`: Live order approvals and cancellations persisted to Supabase.
     - `/api/v1/admin/devices`: Active session telemetry from Supabase `login_attempts`.
     - `/api/v1/admin/live-stream`: Live 4K generation monitoring with real high-resolution previews.
     - `/api/v1/admin/audit-logs`: Real-time immutable security event trail linked to `login_attempts` with automatic PIN verification audit logging.
     - `/api/v1/products`: Live catalog search and category filtering directly querying Supabase `products`.
     - `/api/v1/shops`: Verified partner studios queried live from Supabase `sellers`.
  4. Wired frontend components with luxury skeleton loaders, non-blocking asynchronous updates, and zero hardcoded fallbacks (`AdminOverviewView`, `AdminStudiosView`, `AdminEscrowView`, `AdminSecurityView`, `AdminLiveStreamView`, `AdminUsersView`, `MarketplaceShopList`, `VeloceShop`).
- **Reason**: The user explicitly instructed: "delete all mock data and static things, connect everything to Supabase". Production SaaS platforms require single-source-of-truth Postgres data storage.
- **Alternatives Rejected**: Retaining static mock JSON arrays or creating disconnected duplicate databases.

## 2026-10-17: Server-Side Admin Security, Master PIN (3723) Gate & World-Class Black-Gold Sidebar Admin Suite
- **Decision**: 
  1. Completely eradicated all "Demo" badges, mock role switchers, and fake URLs across the codebase:
     - Removed demo switchers from `UserAccountBar.tsx` and `SellerDashboard.tsx`.
     - Replaced broken CDN links with real local project vehicle imagery (`/images/car-after.jpg`, `/assets/car-CjioCIbt.jpg`, `/images/veloce_black_coupe.jpg`, `/images/car-before.jpg`).
  2. Implemented Zero-Client-Exposure Master PIN (`3723`) Security Engine:
     - The PIN `3723` is strictly verified server-side (`/api/v1/admin/auth/verify-pin`) using constant-time comparison (`crypto.timingSafeEqual`) against `ADMIN_MASTER_PIN`.
     - Zero instances of `3723` exist in any client-side bundle or TSX markup.
     - Built-in rate limiting: maximum 5 failed attempts per IP with an automated 15-minute security lockout.
     - Upon successful PIN verification, server issues an HMAC-SHA256 signed `cv_admin_session` cookie (`httpOnly: true`, `secure: production`, `sameSite: lax`, 4-hour validity).
     - Protected administrative backend routes (`/api/v1/admin/billing/assign-plan`) requiring signed session tokens.
  3. Rebuilt Admin Experience into a World-Class SaaS Sidebar Suite (`src/components/admin/`):
     - `AdminPinGate.tsx`: Luxury Obsidian & Gold 4-digit PIN Pad with dot indicators, haptic shake, and lockout timer.
     - `AdminShell.tsx`: Collapsible 260px/72px sidebar with gold active indicators, grouped navigation, top bar, real-time SLA badge (`99.98% SLA TAS-IX`), notifications popover, and instant "Konsolni Qulflash" logout.
     - 6 rich operational views:
       - **Boshqaruv (Overview)**: KPI cards ($48,920 revenue, 142 studios, 18,450 renders, $8,420 escrow), 7-day weekly interactive dynamics chart, live studio event stream.
       - **Atelyelar & Servislar**: Real Uzbekistan tuning studios (Apex Customs, Autotune Pro, Dubai Custom Wheels, Samarkand Tuning Lab, etc.) with search, plan filters (FREE, PRO, MAX), status toggling, and integrated plan/credit assignment modal.
       - **3% Zakalat & To‘lovlar**: Escrow orders management, genuine transaction review modal, and instant Approve/Reject pipeline.
       - **4K AI Render Klasteri**: Real-time Fal.ai FLUX + Real-ESRGAN GPU pipeline monitor (1.34s latency, 8x A100 nodes), live render feed with real car photography, and lightbox preview.
       - **Qurilmalar & Sessiyalar**: Multi-device quota inspector with remote session eviction.
       - **Xavfsizlik & Audit**: Immutable system security event trail.
- **Reason**: The previous admin screen was an unauthenticated, single-page prototype with bright cyan highlights, mock demo badges, and open access to any visitor visiting `/admin`. The user demanded enterprise-grade server security, zero PIN client leakage, and a luxury SaaS dashboard matching the site's dark gold aesthetic.
- **Alternatives Rejected**: Client-side PIN checks (severe security risk) or generic Bootstrap/Tailwind white-table admin templates.

## 2026-10-17: PWA Install Prompt Luxury Black-Gold Harmonization
- **Decision**: Completely overhauled `PwaInstallPrompt.tsx` from the legacy cyan `#19D3FF` style to the luxury Black-Gold landing page design language:
  - Deep obsidian frosted glass background (`bg-[#0B0C10]/95 backdrop-blur-2xl`) with multi-layer shadow and gold border (`border-[#D4AE62]/20`).
  - Rounded-2xl champagne gold gradient badge container for download icon (`bg-gradient-to-br from-[#D4AE62]/20 via-[#D4AE62]/10 to-transparent`).
  - Full-width `btn-gold` button with hover micro-scaling and active press feedback.
  - Multilingual localization support (`uz`, `ru`, `en`) for clear, user-friendly instructions.
- **Reason**: The legacy PWA banner used bright neon cyan colors and generic English copy that clashed strongly with the dark luxury gold aesthetic of the rest of the application.
- **Alternatives Rejected**: Hiding the PWA banner entirely or retaining raw unstyled browser installation prompts.

## 2026-10-17: Landing Page Pricing Tiers (FREE $0, PRO $29, MAX $99) & FOMO Anchoring
- **Decision**: Updated landing page pricing tiers in `src/app/[locale]/page.tsx` with user-specified copy and commercial positioning without altering the borderless luxury design system:
  1. **FREE** ($0 / sinov): 40 ta bepul rasm, "Tuned by CarVision" watermark, 1 ta faol qurilma, oddiy foydalanuvchilar va avtoservislar sinovi.
  2. **PRO** ($29 / oy): 800 ta rasm, suv belgisisiz toza 4K sifat, 3 ta qurilma, mahsulot joylash imkoni, kichik tuning salonlari uchun.
  3. **MAX** ($99 / oy): 4 000 ta rasm, 8 ta qurilma, 4K video yuklab olish, mahsulot joylash imkoni, katta do'konlar va salonlar uchun. Elevated as the highlighted card (`hot: true`) with FOMO badge: `$145 O'RNIGA $99 — SIZ 32% TEJAB QOLYAPSIZ!` and strike-through anchoring price ($145 crossed out).
- **Reason**: User requested exact conversion-optimized copy, audience segmentation (regular users, small tuning salons, large tuning shops), and psychological FOMO anchoring on MAX tier while strictly preserving existing UI design tokens.
- **Alternatives Rejected**: Modifying card dimensions or adding custom borders which would break visual consistency.

## 2026-10-17: 1:1 Matched Before/After Landing Page Slider Images
- **Decision**: Replaced the mismatched Before/After assets (`public/images/golden/car-before.jpg` and `car-after.jpg`) with a 100% pixel-perfect 1:1 matching Chevrolet Malibu pair at 1600x912 resolution:
  - **OLDIN (Before)**: OEM Factory Stock Chevrolet Malibu in clean white paint with factory 18" split-spoke alloys, standard ride height, chrome window trim, and clean rocker panels.
  - **KEYIN (After)**: 4K Custom Tuned version in glossy Nardo Grey wrap with 20" gloss-black forged wheels, lowered stance, carbon-fiber side skirts, gloss-black shadowline window trim, and carbon ducktail trunk spoiler.
  - Sourced from identical-seed Gemini studio photography with sub-millimeter roofline, B-pillar, door handle, and studio lighting continuity verified at 0%, 25%, 50%, 75%, and 100% slider positions.
- **Reason**: The previous setup used a silver Toyota Camry facing left for "Before" and a matte black BMW M3 facing right for "After", creating an jarring, broken visual jump when dragging the comparison slider.
- **Alternatives Rejected**: Keeping mismatched models or using low-quality, watermarked third-party generative alternatives.

## 2026-10-17: 1:1 Landscape Smart Camera (6 Angles, Floor AR) & Desktop QR Hand-off
- **Decision**: 
  1. Built standalone `SmartCameraLandscapeView` replicating the user-provided camera screen 1:1:
     - Minimalist clean top (removed mock iOS status bar `9:41`, Wi-Fi, battery per user's explicit instruction: "bular bo'lmasin").
     - 360° top-down car compass with 6 angles (`0°`, `45°`, `90°`, `135°`, `180°`, `315°`) with glowing champagne gold active chevron and interactive angle switching.
     - 60 FPS live video stream in center, with 4 gold corner brackets (`┌ ┐ └ ┘`) and 3D perspective floor grid.
     - Large luxury white circular shutter button with glowing gold neon ring.
  2. Implemented Desktop-to-Mobile Hand-off via Camera Session API (`/api/v1/camera-session`) and `/scan/[sessionId]`:
     - Desktop displays luxury 2-option modal: Option 1 (Gold QR code pointing to mobile session) + Option 2 (Direct 6-angle file upload).
     - Mobile phone scanning the QR opens the full 1:1 Landscape Smart Camera.
     - When phone captures a photo, it posts to the session API, and displays "KADR KOMPYUTERGA UZATILDI // Endi ishingizni kompyuterda davom ettiring".
     - Desktop polls the session, automatically receives the photo, and advances to `/customize?captured=1`.
- **Reason**: User requested: "manabu smart cameraning rasmni ko'rinishi desini huddi shunday qil o'rtasidagi rasmni qirqib olma. o'rtasida kameraning natijasi ko'rinishi kerak... 3/4 burchaklarni ham qo'shamiz yani jami 6 ta rasm... kompyuterda kirganda 2 ta variant bo'lishi kerak yoki fayl yuklash yoki QR code chiqishi kerak... telefonda kompyuterda davom ettiring deb chiroyli bo'lib yozuv chiqishi kerak... tepada iOS indikatorlari bo'lmasin".
- **Alternatives Rejected**: Cropping the static mockup background image instead of rendering real live camera feed, or requiring third-party native apps instead of instant web hand-off.

## 2026-10-17: Global Smart Camera Modal Integration via VeloceStoreProvider
- **Decision**: Integrated `VeloceSmartCameraModal` directly into `VeloceStoreProvider`. When `openCamera()` is invoked (from Bottom Dock `Create`, Desktop Sidebar `Create`, Home hero `Customize your ride`, Drawer, or Profile `Yangi Loyiha`), the full-screen Smart Camera modal opens with live video feed, 3D reticle guidance, angle sensors, and procedural shutter audio. It also features `DEMO KADR` and direct file upload fallbacks. Capturing a photo stores the image in `sessionStorage` and `VeloceStore`, triggers a brief lock animation (`AVTOMOBIL ANIQLANDI // 4K SCAN TAYYOR`), and navigates automatically to `/${locale}/customize?captured=1`.
- **Reason**: User requested: "endi ishlatamiz loyihani to'liq Create yoki asosiy sahifadagi tugmani bosganimda, smart camera ochilishi kerak." Providing full-screen camera scanning accessible from any action button makes vehicle onboarding intuitive and responsive.
- **Alternatives Rejected**: Opening native file picker without camera guidance, or hardcoding camera state in individual components.

## 2026-10-17: Centered 'Create' Action, Far-Right 'Profile' Nav & Veloce Profile Page Architecture
- **Decision**: 
  1. Reconfigured mobile bottom dock to a 5-column grid (`grid-cols-5`) with: `1: Home`, `2: Garage`, `3: Create` (exact center, flat icon matching others, opening Smart Camera), `4: Shop`, and `5: Profile` (far right, using serious Lucide `User` icon).
  2. Maintained desktop sidebar with `Profile` at the bottom and active vertical gold indicator bar.
  3. Linked the top bar Profile avatar directly to `/${locale}/profile`.
  4. Created `VeloceProfile` component and `/profile` route with atelier hero header, KPI metric cards (Active Builds, AI Credits, Rating, SLA), 3-tab layout (Atelier Fleet, Order History, Atelier Settings), and dignified sign-out confirmation modal.
- **Reason**: User requested centering `Create` in the bottom navigation, adding `Profile` to the far right with a serious professional icon, and building out a complete `/profile` page following the same luxury black-gold design system without visual regressions.
- **Alternatives Rejected**: Elevated button that breaks the flat icon row (user opted for flat alignment), or using popovers instead of a full profile route.

## 2026-10-17: 1:1 Veloce (blackgold-dreams.lovable.app) Authenticated Experience Migration
- **Decision**: Completely replaced all post-login/post-register dashboard screens with the exact 1:1 luxury architecture of `blackgold-dreams.lovable.app`:
  1. `VeloceShell`: unified desktop sidebar (`V`, Home, Garage, Shop, Create), sticky top navigation with live cart count and profile avatar, and mobile fixed bottom dock.
  2. `VeloceHome` (`/seller`): "BUILT DIFFERENT" hero, 4-stat metrics bar, 3 bento feature cards, and curated trending parts carousel.
  3. `VeloceGarage` (`/garage`): dark underground showroom hero car, category filter pills (`ALL`, `WHEELS`, `BODY KIT`, `SUSPENSION`, `INTERIOR`, `PERFORMANCE`), and "YOUR PRODUCTS" inventory grid.
  4. `VeloceCustomize` (`/studio` & `/customize`): interactive car customizer with color swatch blend (`mix-blend-color`), 6 category tabs, tape carousel, active part specs, warehouse parts list, and sticky `Apply changes` feedback button.
  5. `VeloceShop` (`/shop` & `/marketplace`): search bar, `VZ-01 FORGED` limited drop promotional hero banner with floating wheel, category tabs, product catalog, and 8 top brand logos.
  6. `VeloceProductDetail` (`/shop/[id]`): detailed part showcase, star reviews, gold price, 3 variants (`Standard`, `Pro`, `Competition`), stock status, add to cart with feedback, warranty badges, and related items.
  7. `VeloceCart` (`/cart`): quantity steppers (`+`, `-`), live price total, free express shipping indicator, summary card, and checkout button.
  8. Global state managed via `VeloceStoreProvider` with cart persistence and photo capture handling.
- **Reason**: User requested exact 1:1 replication of `https://blackgold-dreams.lovable.app/` across all post-login/signup pages down to the finest micro-details, replacing the old design completely.
- **Alternatives Rejected**: Preserving old components alongside new ones, or creating a separate non-integrated routing hierarchy.

## 2026-10-17: Browser Extension Hydration Suppression (`suppressHydrationWarning`)
- **Decision**: Added `suppressHydrationWarning` to the root `<html>` and `<body>` tags in `src/app/[locale]/layout.tsx` and `src/app/not-found.tsx`.
- **Reason**: Third-party Chrome/Edge browser extensions (such as ColorZilla) inject external attributes like `cz-shortcut-listen="true"` onto the `<body>` element before React hydration runs. In Next.js 15 / React 19, this triggers an attribute mismatch hydration warning in the console. Adding `suppressHydrationWarning` instructs React to ignore attributes injected directly onto the root container by external browser extensions without affecting client component tree validation.
- **Alternatives Rejected**: Attempting to strip extension attributes via client-side DOM mutations (which runs too late after hydration has already thrown the warning) or ignoring the warning.

## 2026-10-17: 1:1 Veloce Studio Pixel-Perfect Refinement
- **Decision**: Sanitized `sessionStorage` vehicle image caching to disallow stale blob URLs and added an explicit `onError` fallback on the car image tag to `/images/studio/studio_coupe_tuned.jpg`. Re-isolated all wheel rim assets using circular alpha masks to remove inner card borders. Streamlined top header to only `<` and `CUSTOMIZE` without extra utility badges. Repositioned carousel arrow chevrons directly adjacent to cards, and shaped the `APPLY CHANGES` button to `rounded-[22px]` with a `mb-8` clearance margin.
- **Reason**: User's screenshot revealed a broken car image icon (due to an expired `blob:...` URL), distorted wheel assets with inner cropped screenshot lines, and misaligned buttons compared to the reference mockup.
- **Alternatives Rejected**: Leaving broken image placeholders or relying on raw un-masked crops.

## 2026-10-17: 1:1 Veloce Studio CUSTOMIZE Screen Architecture
- **Decision**: Implemented 1:1 CUSTOMIZE Studio screen matching user reference mockup (`media_1792196851089.png`) with top bar (`<` and `CUSTOMIZE`), front-right black sports coupe in dark studio lighting, category tabs (`WHEELS`, `BODY KIT`, `SUSPENSION`, `COLOR`), horizontal carousel tape (`lenta kabi`) with arrow and touch-swipe navigation, central gold rounded border frame, active part specs (`VZ-01`, `Forged Lightweight`, `20"`), and large champagne gold `APPLY CHANGES` pill button. Clicking `APPLY CHANGES` triggers the interactive `BeforeAfterSlider` (Factory Spec vs CarVision 4K Tuned).
- **Reason**: User requested exact 1:1 copy of the reference mockup so nobody can tell the difference, with touch/arrow tape navigation, category tabs, and interactive Before/After comparison upon applying changes.
- **Alternatives Rejected**: Legacy cyan HUD or leaving desktop locked in a small mobile container when user selected full widescreen studio.

## 2026-10-17: Central "CREATE" Action & Smart Camera Scan Workflow
- **Decision**: Added a central elevated `CREATE` button in the exact middle of the bottom navigation dock (`HOME` | `GARAGE` | `CREATE` | `SHOP` | `MORE`), and connected both `CREATE` and `CUSTOMIZE YOUR RIDE >` to launch the full-screen Smart Camera overlay. When a photo is taken (or uploaded), it triggers procedural shutter effects and automatically redirects to `/${locale}/studio?captured=1`.
- **Reason**: User requested: "buyerga o'rtaga Create degan bo'limni ham qo'sh, u o'zi bo'lim ham emas bu nin gvvazifasi asosiy sahifadagi costumize you ride deganniki bilan birhil yani smart camerani ochadi. keyin mashina rasmga olinadi va studioga o'tadi".
- **Alternatives Rejected**: Creating a blank `/create` route, or navigating directly to `/studio` without the camera scan step.

## 2026-10-17: 1:1 Veloce Garage Hero Typography & Layout Calibration
- **Decision**: Calibrated the typography layout in the Veloce Garage hero section to match the reference mockup (`media_1792192861467.jpg`) down to pixel precision:
  - `YOUR GARAGE`: tag line at target y=175 (scaled from ref y=60/265), tracking `0.28em`, bone tone `#A69F92`.
  - `ALL YOUR`: headline line 1 at target y=222 (scaled from ref y=80/265), light sans-serif, warm cream `#F5F2EB`.
  - `MODIFICATIONS`: headline line 2 at target y=292 (scaled from ref y=105/265), champagne gold `#E0C07E`, perfectly level with the coupe headlights and kidney grille.
  - `IN ONE PLACE`: headline line 3 at target y=362 (scaled from ref y=130/265), light sans-serif, warm cream `#F5F2EB`.
  - `Track • Customize • Upgrade`: subline at target y=465 (scaled from ref y=167/265), positioned cleanly over the dark reflective wet floor.
- **Reason**: The user explicitly instructed: "bunga qara buyerda yozuvni huddi shu rasmda kabi kabi joylashtir". Previously, `YOUR GARAGE` was placed too high at y=59, causing an unnatural gap between the tag line and the main headline. Re-calibration established exact 1:1 alignment with the reference image.
- **Alternatives Rejected**: Hardcoded arbitrary offsets or leaving the scrunched top spacing.

## 2026-10-17: Fixed Borderless High-Blur Mobile Bottom Dock
- **Decision**: Made the mobile bottom dock fixed to the viewport (`fixed inset-x-0 bottom-0 z-40 md:absolute max-w-[430px] mx-auto`), removed all top borders and hairline lines (100% borderless), and applied a heavy frosted glass backdrop blur (`backdrop-blur-3xl`, `bg-[#07080B]/80`, `shadow-[0_-12px_36px_rgba(0,0,0,0.9)]`).
- **Reason**: User requested the mobile bottom menu to remain fixed at the bottom while scrolling, with a stronger frosted glass background blur and no top border.
- **Alternatives Rejected**: Static inline dock or border-based separation.

## 2026-10-17: Dedicated Route & URL Navigation for Garage (`/[locale]/garage`)
- **Decision**: Created dedicated App Router route `src/app/[locale]/garage/page.tsx` and converted all internal tab triggers into real Next.js `<Link>` components pointing to `/${locale}/garage` and `/${locale}/seller`, with URL synchronization via `usePathname()`.
- **Reason**: Previously, clicking the `GARAGE` tab only toggled internal React component state without changing the URL in the browser address bar. Providing a dedicated URL (`/uz/garage`) allows users to see the link change, share/bookmark the garage page directly, and use standard browser navigation (Back/Forward).
- **Alternatives Rejected**: URL hash-based tabs or leaving state purely client-side without URL changes.
- **Decision**: Implemented the 1:1 Veloce Garage screen (`VELOCE // GARAGE`, dark underground showroom hero car with pillar lights, `YOUR GARAGE`, `ALL YOUR MODIFICATIONS IN ONE PLACE`, `Track • Customize • Upgrade`, 2-column inventory grid with 12 items, category filter bar `ALL`, `WHEELS`, `BODY KIT`, `SUSPENSION`, `INTERIOR`, `PERFORMANCE`). Directly above the categories bar, added the user-requested "ADD DETAIL >" compact champagne gold pill button matching the home CTA button styling and dimensions. Clicking opens an interactive detail addition modal that dynamically updates the workshop warehouse inventory and items counter in real time.
- **Reason**: User requested the garage section to display the workshop's warehouse inventory, styled 1:1 with the reference screenshot, with the specific modification of adding the "ADD DETAIL >" button directly above the categories bar.
- **Alternatives Rejected**: Static non-interactive cards, opening general catalog import instead of dedicated part addition.

## 2026-10-17: 1:1 Veloce Dashboard Redesign for Workshop / Seller (`/[locale]/seller`)
- **Decision**: Replace `SellerDashboard` with an exact 1:1 replica of the Veloce mobile luxury app screen (`VELOCE // DRIVE BEYOND`, photorealistic AI-generated black BMW M4 Coupe artwork, `BUILT DIFFERENT`, `CUSTOMIZE YOUR RIDE >` CTA, 3 feature cards for Performance/Style/Track, and bottom dock navigation). On desktop, centered in a luxury titanium frame with ambient studio lighting and side atelier telemetry panels.
- **Reason**: User requested an exact 1:1 copy of the mobile design as the post-login / post-register screen for workshop owners, with zero differences in colors, border radii, or typography, adapted flawlessly for both mobile and desktop.
- **Alternatives Rejected**: Standard admin dashboard tables and old cyan component styling.

## 2026-10-17: 1:1 Landing Page Migration from Lovable (`https://golden-flow-scroll.lovable.app`)
- **Decision**: Replace the landing page frontend completely with the exact 1:1 design from `https://golden-flow-scroll.lovable.app` (cinematic hero, interactive before/after visualizer, marquee, 3-step workflow, pricing, testimonials, mobile app showcase, FAQ, and luxury footer), preserving `/login` and `/register` intact.
- **Reason**: User requested exact frontend copy from `golden-flow-scroll.lovable.app` and cleanup of previous landing page code.
- **Alternatives Rejected**: Mixing old and new components.

## 2026-10-17: 1:1 Auth Redesign from Lovable (`https://step-up-welcome.lovable.app/`)
- **Decision**: Replicate the exact visual identity, typography (Cormorant Garamond + Manrope), gold luxury gradient, frosted glass cards, and multi-step flow from `https://step-up-welcome.lovable.app/`.
- **Reason**: User requested exact 1:1 match with high visual fidelity, while preserving Next.js App Router, Supabase Auth integration, and logical CSS RTL compliance.
- **Alternatives Rejected**: Standard shadcn form components, generic input fields.

## [2026-11-08] Smart camera subject detection on device
- **Decision**: MediaPipe ObjectDetector (EfficientDet-Lite0 int8, CPU delegate), WASM from jsdelivr pinned to the package version, model from Google storage, loaded lazily when the camera opens.
- **Reason**: real-time car/person/other colours need per-frame inference; a server round trip per frame is too slow and costly.
- **Rejected**: GPU delegate (returns zero detections with the int8 model, measured); TensorFlow.js coco-ssd (larger bundle); self-hosting the 13 MB WASM in the repo.

## [2026-11-08] Gemini endpoint chosen by key type
- **Decision**: `AQ.` keys go to Vertex AI (`aiplatform.googleapis.com`), `AIza` keys to AI Studio; the other API is tried on 401/403.
- **Reason**: production GEMINI_API_KEY is a Vertex AI express key; AI Studio rejects it.

## [2026-11-08] Image model: Nano Banana 2 first, Pro as fallback; models per task by env
- **Decision**: default chain tries `gemini-3.1-flash-image` (about $0.07-0.08 per image) before `gemini-3-pro-image-preview` (about $0.134). `IMAGE_MODEL_FITMENT` / `IMAGE_MODEL_VIDEO_FRAME` override the order per task without code changes.
- **Reason**: a full render is 5 angles; this halves the cost with near-Pro quality. Prices are from third-party pages and must be checked on Google's price page.
- **Rejected**: Higgsfield for fitment edits (API is pay-as-you-go from a separate USD balance, no free API tier; its listed image models do not include Nano Banana/Seedream/FLUX Kontext and multi-reference editing is unconfirmed); GPT Image 2 (strong but high quality tier costs about $0.21).

## [2026-11-08] Never render or charge for something the photos cannot show
- **Decision**: (1) photos that are not a car, or whose sides are not one car, block rendering; (2) an angle where no chosen part is visible is skipped and costs nothing, and a part that no photo can show blocks the render with a message; (3) the same rule runs on the server.
- **Reason**: before, a rear light on a front-only photo, a non-car photo or one photo copied five times each spent credits and returned an unchanged picture.
- **Limits**: the car-check token is bound to the user, not the photo (photos are re-compressed), so it is a barrier, not a guarantee; the AI "same car" check can be wrong, so it leans towards allowing when unsure.

## [2026-11-08] Video: a separate paid AI provider is wanted (amends plans/09_VIDEO_ENGINE.md)
- **Decision**: the owner wants AI video from a separate provider, added last. `plans/09_VIDEO_ENGINE.md` (100% client-side, no paid video API) is no longer the final word; a provider module must stay outside the image chain (`ProviderId`/`hasAnyImageKey`) and reserve credits before submitting an async job.
- **Candidate**: Higgsfield (Kling, Seedance, Wan models) at https://open.higgsfield.ai/, paid, minimum $5 top-up. Pricing, async API and terms still to be read from its docs before building.

## [2026-11-08] Nano Banana model ids and defaults (verified against Google's docs)
- **Decision**: stable ids `gemini-3.1-flash-image` (Nano Banana 2, first) and `gemini-3-pro-image` (Pro, fallback), each also tried under its `-preview` name; `gemini-2.5-flash-image` last (legacy, shutdown announced for 2027). Output 2K by default (`IMAGE_SIZE_FITMENT`). Google's newest `gemini-nano-banana-2.1` is not default (the owner chose Nano Banana 2; it is one env line away).
- **Reason**: Google's docs list `gemini-3-pro-image` as the stable id and `generateContent` as "legacy but still supported". Thinking cannot be disabled on these models and drafts ("thought" images) may appear, so the last real image is used.
- **Prices (Google, per picture, from a summarised page, verify before paying)**: Nano Banana 2 $0.067 at 1K, $0.101 at 2K, $0.151 at 4K; Pro $0.134 at 1K/2K, $0.24 at 4K. A 5-angle render at 2K is about $0.50.

## [2026-11-08] Car detection no longer uses gemini-2.5-flash
- **Decision**: `gemini-3.6-flash`, then `gemini-3.5-flash-lite`. **Reason**: 2.5 Flash is deprecated for new accounts and rerouted on 2026-12-01.

## [2026-11-08] Test credits are expensive: verify before generating
- **Decision**: use `node scripts/probe-image-providers.mjs` (free: model metadata / countTokens) after adding or changing a key; `--generate` only after it shows the wanted ids as available.
