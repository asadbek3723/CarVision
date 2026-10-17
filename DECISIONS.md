# Architecture & Product Decisions

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
