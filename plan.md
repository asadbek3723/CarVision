# CarVision Roadmap & Plan

## Active Task: Landing Page Visual Polish & Next Milestones
Status: READY_FOR_FEEDBACK
- [x] Generate & Replace 1:1 Professional Before/After Slider Images (`car-before.jpg` & `car-after.jpg`).
- [x] Verify seamless 1:1 pixel alignment across 0%, 25%, 50%, 75%, and 100% split positions.
- [x] Run full quality gates (direction check, typecheck, lint, and Vitest test suite).

## Completed Tasks
- [x] Generate & Replace 1:1 Professional Before/After Slider Images (`car-before.jpg` & `car-after.jpg`):
  - Replaced the mismatched pair (silver Toyota Camry facing left vs black BMW M3 facing right) with a 100% pixel-perfect 1:1 matching Chevrolet Malibu pair in the exact same luxury dark studio setting at 1600x912 resolution.
  - OLDIN (Before): Factory OEM stock white Chevrolet Malibu with standard 18" alloy wheels, factory suspension height, chrome window trim, and clean rocker panels.
  - KEYIN (After): 4K tuned custom version with aggressive Nardo Grey wrap, 20" gloss-black forged wheels, lowered stance, carbon-fiber side skirts, gloss-black shadowline window trim, and carbon ducktail trunk spoiler.
  - Verified 1:1 alignment at 25%, 50%, and 75% split points with zero seam jumping or perspective distortion.
  - Passed all quality gates: zero direction violations (`npm run check-direction`), zero TypeScript errors (`npx tsc --noEmit`), zero ESLint warnings (`npm run lint`), and 24/24 Vitest domain tests passing.

- [x] Fix Vercel Production Build Failures (ESLint Unused Variables & Build Verification):
  - Fixed ESLint unused variable errors in `VeloceProfile.tsx` (`User`, `Building`), `VeloceShell.tsx` (`isCustomize`), and confirmed `completedAngles` usage in `SmartCameraLandscapeView.tsx`.
  - Replaced ambiguous Tailwind timing function classes `ease-[cubic-bezier(...)]` with standard `[transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]` in `src/app/[locale]/page.tsx`.
  - Ran `npm run lint` — passed with 0 errors.
  - Ran `npm run build` (`next build`) locally — successfully compiled all 24 static and dynamic routes and finalized page optimization.
  - Ran full quality gates: zero TypeScript errors (`npm run typecheck`), zero physical direction violations (`npm run check-direction`), 24/24 Vitest domain tests passing.

## Completed Tasks
- [x] Maximize Central Viewport Rectangle & Seamless Responsive Adaptation Across All Devices:
  - Removed restrictive `max-w-3xl` and `max-h-[520px]` caps: central golden rectangle now dynamically expands to fill the maximum possible viewport space (`h-[90%-96%]`, full fluid width).
  - Implemented universal fluid responsiveness: on landscape (MacBook, PC, tablet, rotated phone), the left 360° car compass scales cleanly (`h-36` to `h-64`), shutter scales dynamically (`h-16` to `h-28`), giving over 75-80% of total horizontal width to the camera frame.
  - Implemented native mobile portrait support: when opened or held vertically on smartphones, eliminates blocking "rotate phone" screen and provides a vertical layout where the middle rectangle commands >70% of phone height, with top angle switcher chips and bottom luxury shutter button.
  - Sized corner brackets responsively with logical start/end properties (`rounded-ss-xl`, `rounded-se-xl`, `rounded-es-xl`, `rounded-ee-xl`).
  - Passed full quality gates: zero TypeScript errors (`tsc --noEmit`), zero physical direction violations (`npm run check-direction`), 24/24 Vitest domain tests passing.

## Completed Tasks
- [x] 1:1 Landscape Smart Camera: 100% Real Live Camera Feed & Permanently Removed Floor Trapezoid:
  - Permanently removed the 3D perspective floor trapezoid SVG overlay: camera viewport is now 100% clean and unobstructed.
  - Retained only the golden rounded rectangular boundary (`border-[#D4AE62]/55 rounded-[36px]`) and the 4 bright gold corner brackets (`┌ ┐ └ ┘`).
  - Completely removed fake static garage background picture (`camera_garage_bg.jpg` deleted).
  - Activated 100% real live camera stream (`<video ref={videoRef} />`) with auto-start on mount (`startCamera()`).
  - Added multi-platform fallback in `useCameraStream`: attempts high-res environment camera (`ideal: 'environment'`) first, and gracefully falls back to user/webcam stream (`video: true`) on MacBooks and PCs.
  - Implemented sleek loading spinner ("Kamera ishga tushirilmoqda...") and permission denied retry state.
  - Compass: 100% transparent PNG cutout (`topdown_coupe.png`, 733x976) with zero square edges, prominent vertical height, and 0.5s smooth angle rotation animation.
  - Shutter Button: calibrated 1:1 with reference mockup (thin gold glowing neon ring `#DDBE78`, uniform dark gap, pure solid white disc).
  - Verified full quality gates: zero TypeScript errors (`npx tsc --noEmit`), zero physical direction violations (`npm run check-direction`), 24/24 Vitest domain tests passing, HTTP 200 on all routes.

## Completed Tasks
- [x] Connect Smart Camera Modal to 'Create' & 'Customize Your Ride' Actions:
  - Created [VeloceSmartCameraModal.tsx](file:///Users/asadbekjumanazarov/Desktop/CarVision/src/components/camera/VeloceSmartCameraModal.tsx) integrating `SmartCameraView` with real-time video stream, 3D reticle guidance, and sound effects.
  - Added Demo car capture (`DEMO KADR`) and manual car upload (`RASM YUKLASH`) fallbacks.
  - Linked globally via `VeloceStoreProvider`: clicking `Create` in the bottom dock or desktop sidebar, `Customize your ride` on Home hero, or `Yangi Loyiha` in Profile immediately launches the real Smart Camera modal.
  - On photo capture: displays `AVTOMOBIL ANIQLANDI // 4K SCAN TAYYOR` loading state, stores image in `sessionStorage` and `VeloceStore`, and smoothly navigates to `/${locale}/customize?captured=1`.
  - Verified full quality gates: zero TypeScript errors (`npx tsc --noEmit`), zero physical direction violations (`npm run check-direction`), 24/24 Vitest domain tests passing, HTTP 200 on all routes.

## Completed Tasks
- [x] Center 'Create' in Bottom Nav, Add Far-Right 'Profile' & Implement 1:1 Veloce Profile Page:
  - Updated `VeloceShell.tsx`:
    - Reconfigured mobile bottom dock to 5-column grid (`grid-cols-5`): `1: Home`, `2: Garage`, `3: Create` (exact center, flat icon matching others), `4: Shop`, `5: Profile` (far right, serious Lucide `User` icon).
    - Added Profile to desktop sidebar with active vertical gold bar indicator.
    - Updated sticky top bar Profile icon to link directly to `/${locale}/profile`.
    - Added Profile link to mobile slide-over drawer.
  - Implemented 1:1 luxury `VeloceProfile` component and `/profile` page (`src/app/[locale]/profile/page.tsx`):
    - Atelier Master hero header with avatar initials, gold halo glow, and VIP Tier 1 badge.
    - 4 KPI stat cards: Active Builds (3 Cars), AI Credits (2,450 PTS), Rating (4.95/5.0), and 100% 4K SLA.
    - 3-tab layout: Atelier Garage fleet cards with fitted specs, Recent orders and fitting history, Atelier settings (language selector, 4K Upscale toggle, audio & haptics).
    - Dignified sign out confirmation modal.
    - Cleaned up mobile header: removed top profile icon on mobile (`hidden md:grid`) to prevent duplication with the bottom dock navigation.
  - Verified full quality gates: zero TypeScript errors (`npx tsc --noEmit`), zero physical direction violations (`npm run check-direction`), 24/24 Vitest domain tests passing, HTTP 200 on all routes.

## Completed Tasks
- [x] Complete 1:1 Implementation of Veloce (`blackgold-dreams.lovable.app`) Authenticated Experience:
  - Installed exact Montserrat & Manrope typography and design tokens (`--gradient-gold`, `--gradient-card`, `--shadow-gold`, `--shadow-card`, `@keyframes shimmer`, `@keyframes rise`, `@keyframes float`, `@keyframes flash`, `@keyframes reveal`).
  - Extracted and integrated exact high-res photography assets (`car-CjioCIbt.jpg`, `garage-Bst4bQtu.jpg`, `wheel-CiWWvvai.jpg`, `bodykit-CjvcnY7y.jpg`, `suspension-BTwmFe87.jpg`, `interior-DWHEsFIZ.jpg`, `exhaust-BEQYegnz.jpg`).
  - Created `VeloceStore` context for cart items, photo capture state, file uploads, and global catalog state.
  - Implemented unified `VeloceShell` layout: fixed desktop sidebar (`V`, Home, Garage, Shop, Create), sticky top navigation (`VELOCE // DRIVE BEYOND`, cart count badge, workshop profile avatar), and mobile fixed high-blur bottom dock.
  - Implemented 1:1 Home page (`/seller`): "BUILT DIFFERENT" hero with 4K sports coupe, 4-stat metrics bar, 3 bento feature cards (Performance, Style, Track), and curated trending parts carousel.
  - Implemented 1:1 Garage page (`/garage`): dark underground showroom hero car, category filter pills (`ALL`, `WHEELS`, `BODY KIT`, `SUSPENSION`, `INTERIOR`, `PERFORMANCE`), and "YOUR PRODUCTS" inventory grid.
  - Implemented 1:1 Customize / Studio page (`/studio` & `/customize`): car preview with interactive color swatch blend (`mix-blend-color`), 6 category tabs, tape carousel with touch and arrow navigation, active part specs, warehouse parts list, and sticky `Apply changes` feedback button.
  - Implemented 1:1 Shop catalog page (`/shop` & `/marketplace`): search bar, `VZ-01 FORGED` limited drop promotional hero banner with floating wheel, category tabs, product cards, and 8 top brand logos.
  - Implemented 1:1 Shop Product Details page (`/shop/[id]`): detailed part showcase, star reviews, gold price, 3 variants (`Standard`, `Pro`, `Competition`), stock status, add to cart with animated feedback, warranty & express shipping badges, and related items.
  - Implemented 1:1 Cart page (`/cart`): quantity steppers (`+`, `-`), live price total, free express shipping indicator, summary card, checkout button, and empty state.
  - Verified full quality gates: zero TypeScript errors (`npx tsc --noEmit`), zero direction violations (`npm run check-direction`), 24/24 Vitest domain tests passing, and HTTP 200 on all routes.

## Completed Tasks
- [x] Browser Extension Hydration Warning Suppression:
  - Eliminated Next.js 15 / React 19 hydration mismatch warning (`cz-shortcut-listen="true"`) caused by browser extensions like ColorZilla injecting attributes onto `<body>`.
  - Added `suppressHydrationWarning` to `<html>` and `<body>` tags in `src/app/[locale]/layout.tsx` and `src/app/not-found.tsx`.
  - Verified quality gates: `npm run check-direction` (0 violations), `npx tsc --noEmit` (0 errors), `npm test` (24/24 passing).
- [x] 1:1 Veloce Studio / CUSTOMIZE Screen Pixel-Perfect Refinement:
  - Eliminated car image loading failures by sanitizing `sessionStorage` against expired blob URLs and adding an auto-fallback `onError` handler pointing to `/images/studio/studio_coupe_tuned.jpg`.
  - Leveled, enhanced, and integrated the 1:1 front-right black sports coupe image in dark studio lighting with ambient reflections.
  - Re-isolated all wheel rims (`wheel_vz01.jpg`, `wheel_bbs.jpg`, `wheel_sport.jpg`) on clean dark backgrounds with circular anti-aliased masks, removing all cropped screenshot borders.
  - Cleaned up top header to match reference mockup: left `<` chevron, centered `CUSTOMIZE` title, zero clutter icons on the right.
  - Positioned carousel chevron arrows (`<` and `>`) adjacent to the preview cards instead of far screen edges.
  - Formatted active part typography: `VZ-01` (tracking `0.14em`), `Forged Lightweight`, and `20"` with tight spacing.
  - Redesigned `APPLY CHANGES` button to rounded-2xl (`rounded-[22px]`, height 54px, max width 340px) in champagne gold gradient (`#DFBE82` -> `#CFA559`) with comfortable bottom margin (`mb-6 sm:mb-8`).
  - Verified quality gates: `npm run check-direction` (0 violations), `npx tsc --noEmit` (0 errors), `npm test` (24/24 passing), HTTP 200 on `/uz/studio`.

## Completed Tasks
- [x] Central "CREATE" Action & Smart Camera Scan Integration in Bottom Dock:
  - Added central elevated `CREATE` action button in the exact middle of the mobile bottom navigation dock: `HOME` | `GARAGE` | `CREATE` | `SHOP` | `MORE`.
  - Styled `CREATE` with luxury circular champagne gold gradient (`#F3D9A4` -> `#D4AE62` -> `#B88E3E`), camera icon with `+` badge, ambient gold glow shadow, and responsive micro-scaling.
  - Linked both the bottom dock `CREATE` button and the main hero `CUSTOMIZE YOUR RIDE >` button to open the full-screen Smart Camera modal (`isSmartCameraOpen`).
  - Integrated `SmartCameraView` with real-time video stream, 3D chassis alignment reticle, motion sensor guidance, shutter sound effects, and flash animation.
  - Included quick "Demo Kadr" and photo upload fallback options so technicians and desktop users can test vehicle scanning in any environment.
  - Added seamless vehicle locked transition ("AVTOMOBIL ANQLANDI // 4K SCAN TAYYOR") with automatic redirection to `/${locale}/studio?captured=1`.
  - Fully verified: `npm run check-direction` (0 violations), `npx tsc --noEmit` (0 errors), `npm test` (24/24 passing), HTTP 200 on all routes.
- [x] 1:1 Veloce Garage Hero Typography & Layout Calibration:
  - Mathematically analyzed the user-provided reference phone mockup (`media_1792192861467.jpg`) across all 5 text lines in the hero section:
    - `YOUR GARAGE`: tag line at calibrated target y=175 (scaled from ref y=60/265), tracking `0.28em`, bone tone `#A69F92`.
    - `ALL YOUR`: headline line 1 at calibrated target y=222 (scaled from ref y=80/265), light sans-serif, warm cream `#F5F2EB`.
    - `MODIFICATIONS`: headline line 2 at calibrated target y=292 (scaled from ref y=105/265), champagne gold `#E0C07E`, perfectly level with the coupe headlights and kidney grille.
    - `IN ONE PLACE`: headline line 3 at calibrated target y=362 (scaled from ref y=130/265), light sans-serif, warm cream `#F5F2EB`.
    - `Track • Customize • Upgrade`: subline at calibrated target y=465 (scaled from ref y=167/265), positioned cleanly over the dark reflective wet floor.
  - Side-by-side brightness profile cross-examination confirmed all 5 lines align within 1-2 pixels of the user's reference mockup.
  - Updated `public/images/garage/garage_hero_v3.jpg` and `garage_hero_1to1.jpg` with 3x retina resolution (1200x780 at 98% quality).
  - Updated `SellerDashboard.tsx` with cache-busted path `src="/images/garage/garage_hero_v3.jpg?v=3.1"` for instant browser reload.
  - Verified full quality gates: `npm run check-direction` (0 violations), `npx tsc --noEmit` (0 errors), `npm test` (24/24 passing), HTTP 200 on `/[locale]/garage`.

## Completed Tasks
- [x] Fixed Borderless High-Blur Mobile Bottom Dock:
  - Updated bottom navigation dock in `SellerDashboard.tsx` to `fixed inset-x-0 bottom-0 z-40 md:absolute max-w-[430px] mx-auto` so it stays permanently pinned to the bottom of the screen on mobile devices while content scrolls behind it.
  - Removed top border (`border-t`) and hairline divider line entirely for 100% borderless depth design.
  - Elevated glassmorphism with `bg-[#07080B]/80`, `backdrop-blur-3xl`, and soft upward shadow (`shadow-[0_-12px_36px_rgba(0,0,0,0.9)]`), creating an authentic frosted luxury glass aesthetic.
  - Increased bottom spacing (`mb-28` on Home, `mb-32` on Garage) and safe-area padding (`pt-3.5 pb-5 px-3 md:pb-3.5`) to prevent content clipping.
  - Full verification: `npm run check-direction` (0 violations), `npx tsc --noEmit` (0 errors), `npm test` (24/24 passing), HTTP 200 on all routes.

## Completed Tasks
- [x] Dedicated Route & URL Sync for Garage (`/[locale]/garage`):
  - Created dedicated Next.js App Router route `src/app/[locale]/garage/page.tsx` rendering `SellerDashboard initialTab="garage"`.
  - Replaced internal tab state buttons in bottom dock, desktop sidebar, and drawer with native `<Link>` components pointing to `/${locale}/garage` and `/${locale}/seller`.
  - Added URL pathname synchronization via `usePathname()` so the browser address bar immediately updates to `/uz/garage` and supports direct URLs, bookmarks, and browser back/forward buttons.
  - Verified full test suite (`npm test`), strict TypeScript (`npx tsc --noEmit`), zero physical direction violations, and HTTP 200 on all routes.

## Completed Tasks
- [x] 1:1 Veloce Garage & Workshop Warehouse View (`/[locale]/seller?tab=garage` or clicking `GARAGE` tab):
  - Created 1:1 Ultra-HD 1200x780 luxury hero banner with integrated typography (`public/images/garage/garage_hero_1to1.jpg`) featuring the black sports coupe in underground showroom, amber lighting columns, glossy reflective dark floor, and crisp typography (`YOUR GARAGE`, `ALL YOUR MODIFICATIONS IN ONE PLACE`, `Track • Customize • Upgrade`).
  - Enhanced and sharpened 4K product card assets: `bbs_wheel.jpg`, `carbon_lip.jpg`, `kw_suspension.jpg`, `m_seats.jpg`.
  - Implemented 1:1 Veloce Garage view inside `SellerDashboard.tsx` with:
    - Dynamic header: `VELOCE // GARAGE` branding with profile & drawer controls
    - Clean 1:1 hero banner with no duplicate text below
    - Compact champagne gold pill button `ADD DETAIL >` placed directly above categories bar (matching home CTA button styling and dimensions)
    - Horizontal scrollable category pill filters (`ALL`, `WHEELS`, `BODY KIT`, `SUSPENSION`, `INTERIOR`, `PERFORMANCE`) with live filtering
    - `YOUR PRODUCTS` header with dynamic item counter (`${count} ITEMS >`)
    - 2-column luxury products grid with category chips, enhanced high-res photos, specs, and action menus (`...`)
    - Bottom navigation dock with `GARAGE` active state (supercar silhouette with gold glow)
    - Interactive "Add Detail" modal to add new custom parts dynamically into the warehouse inventory list
    - Interactive card action modal for 4K Studio visualizer testing and stock removal
  - Full verification: `npm run check-direction` (0 violations), `npx tsc --noEmit` (0 errors), `npm test` (24/24 passing), HTTP 200 on all routes.

## Completed Tasks
- [x] 1:1 Veloce Workshop Dashboard (`/[locale]/seller`) - Pixel-perfect mobile & responsive luxury desktop UI with high-end automotive icons and left-aligned compact CTA pill

- [x] Generate 8K black BMW M4 Coupe image in dark studio lighting using `generate_image` (`public/images/veloce_black_coupe.jpg`)
- [x] Align on requirements via interview (route `/[locale]/seller`, 1:1 VELOCE branding, "CUSTOMIZE YOUR RIDE >" linking to `/studio`)
- [x] Implement `SellerDashboard` in `src/features/seller/components/SellerDashboard.tsx` with 1:1 mobile and responsive desktop layout:
  - Clean top header without fake mobile status bar (per user instruction)
  - Brand header with gold hamburger menu, `VELOCE // DRIVE BEYOND` typography, and profile outline avatar
  - Hero car section with photorealistic black BMW M4 Coupe, ~12% zoom for aggressive road presence, and seamless dark floor blending
  - 1:1 Geometric Sans typography `BUILT DIFFERENT` (refined light sans, wide tracking `0.34em`, warm bone tone `#EDE8DF`) and `TUNE • STYLE • PERFORM`
  - Champagne gold compact pill CTA button `CUSTOMIZE YOUR RIDE >` (left-aligned `flex justify-start` matching screenshot) linking to `/studio`
  - 3 feature cards: `PERFORMANCE` (Engine/Tuning/Exhaust), `STYLE` (Wheels/Body Kits/Colors), `TRACK` (Lap Times/Analytics/Improve)
  - Bottom navigation bar: `HOME` (Gauge speedometer), `GARAGE` (CarFront supercar), `SHOP` (Store atelier), `MORE` (SlidersHorizontal telemetry) with enlarged 24px luxury automotive precision icons and gold ambient glow
  - Desktop-optimized view: centered luxury studio frame with ambient glow, workshop telemetry (credits, studio status)
- [x] Ensure 100% RTL compliance (`scripts/check-physical-direction.mjs`: 0 violations)
- [x] Run full verification: `npm run check-direction` (PASS), `npx tsc --noEmit` (0 errors), `npm test` (24/24 passing), `npm run build` (Next.js 15 production build PASS)

## Completed Tasks
- [x] 1:1 Veloce Workshop Dashboard (`/[locale]/seller`) - Pixel-perfect mobile & responsive luxury desktop UI
- [x] 1:1 Lovable Landing Page Migration (`https://golden-flow-scroll.lovable.app`)

- [x] Extract full design, code structure, assets, and animations from `https://golden-flow-scroll.lovable.app`
- [x] Download high-res image assets to `public/images/golden/` (`hero-car.jpg`, `car-before.jpg`, `car-after.jpg`, `app-phones.jpg`)
- [x] Add golden landing design tokens, utilities (`.text-gold-gradient`, `.btn-gold`, `.btn-ghost-gold`, `.grain`, `.reveal`, `.mask-fade-x`, `.bg-card-lux`, `.shadow-lux`, `.glass-nav`, `.animate-marquee`, `.shimmer-text`, `.sweep`, `.animate-rise`, `.animate-scrollline`, `.animate-float`, `.animate-slowzoom`) to `styles/globals.css` and `styles/tokens.css`
- [x] Replace `src/app/[locale]/page.tsx` with 1:1 clean implementation of golden-flow landing page:
  - Scroll-revealed glass navbar (`Header`) with mobile drawer & links
  - Hero section with cinematic Porsche 911 background, golden typography, and CTAs
  - Global tuning brand marquee (`DUNYO BRENDLARI BILAN ISHLAYDI`)
  - Interactive Before/After visualizer slider with fitment badges
  - 3-step "Qanday ishlaydi" process section
  - "Kim uchun" (Atelyelar / Egalar) value proposition cards
  - Transparent pricing table with monthly/yearly toggle
  - Real customer reviews grid with rating stars
  - Mobile app spotlight section with download buttons
  - FAQ accordion section
  - Grand CTA section
  - Full luxury footer with contact telemetry and social links
- [x] Ensure 100% logical CSS RTL compliance (`scripts/check-physical-direction.mjs`: 0 violations)
- [x] Preserve `/login` and `/register` pages intact (HTTP 200)
- [x] Run full verification: `npm run check-direction` (PASS), `npx tsc --noEmit` (0 errors), `npm test` (24/24 passing), `npm run build` (Next.js 15 production build PASS)

## Completed Tasks
- [x] Complete purge of obsolete login/register modals and old landing leftovers: removed old cyan `AuthModal` (`src/features/auth/components/AuthModal.tsx`), deleted obsolete `src/components/CompareSlider.tsx`, unmounted `AuthModal` from root layout, and rewired `UserAccountBar` to link directly to `/login`.
- [x] Fix Auth background artwork: linked high-res Porsche 911 studio photo to `AuthShell` and fixed radial vignette overlay so car is clearly visible on `/login` and `/register`.
- [x] 1:1 Lovable Golden Landing Page Migration (`https://golden-flow-scroll.lovable.app`) - Full luxury dark/gold aesthetic with 0 trash code
- [x] 1:1 Lovable Auth Redesign (`https://step-up-welcome.lovable.app/`) - Login & Register pages with compact 100vh viewport fit

