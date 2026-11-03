# 02_DESIGN_SYSTEM.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace
**Document type:** UI/UX design system: principles, tokens, layout, components, motion, states
**Audience:** AI coding agents (Gemini in Antigravity), engineers, any designer
**Status:** Normative. UI that violates this document does not merge.
**Read together with:** `01_PRD_BUSINESS_LOGIC.md` (requirements `FR-STU-*`), `05_CODING_STANDARDS.md` (section 11: styling rules)

---

## 1. Design intent

CarVision must feel like a **premium automotive configurator**: calm, dark, confident, and effortless. A workshop owner hands a tablet to a customer; within seconds the customer must understand what to do without instructions, in any of eight languages.

### 1.1 Five principles
1. **The car is the hero.** The vehicle image gets the screen. Everything else floats, is translucent, and hides when the user touches the car.
2. **One primary action per screen.** There is always one obvious next step (Capture, Generate, Book). Secondary actions are quiet.
3. **Simple, not sparse.** Few choices at a time, large targets, generous spacing. Detail lives in sheets that open on demand.
4. **Calm motion, instant feedback.** Every tap responds within 100 ms. Animations explain what changed; they never decorate or delay.
5. **Nothing clipped, nothing overlapping.** The layout survives every screen size, orientation, text size, and language, including Arabic (RTL) and the longest Russian/Uzbek strings.

### 1.2 What "premium" means here (and what it does not)
**Is:** restrained palette (near-black, graphite, one accent), precise alignment, consistent radii, soft glass panels, tabular numerals for prices, high-quality imagery, quiet transitions.
**Is not:** neon overload, gradients on everything, heavy shadows, ornamental icons, busy backgrounds, tiny text, carousels inside carousels, and pop-ups stacked on pop-ups.

### 1.3 Theme
**Dark theme only** (v1). The vehicle photo and its reflections look best on near-black, and shop tablets benefit from lower glare. There is no light theme and no toggle. Do not add one.

---

## 2. Design tokens

Tokens are the single source of truth. Components use token names only. No raw hex, px, or font size outside `src/styles/tokens.css` and the Tailwind theme that maps to it.

### 2.1 Color

```css
/* src/styles/tokens.css */
:root {
  /* Surfaces (darkest -> lightest) */
  --color-bg:            #0A0B0F;  /* app background, studio backdrop */
  --color-surface-1:     #12141A;  /* cards, panels */
  --color-surface-2:     #1A1D26;  /* raised: sheets, selected cards */
  --color-surface-3:     #242836;  /* hover/pressed, inputs */
  --color-glass:         rgba(18, 20, 26, 0.72);   /* floating HUD */
  --color-glass-strong:  rgba(18, 20, 26, 0.88);   /* sheets over the car */

  /* Borders */
  --color-border-subtle: rgba(255, 255, 255, 0.07);
  --color-border:        rgba(255, 255, 255, 0.12);
  --color-border-strong: rgba(255, 255, 255, 0.22);

  /* Text */
  --color-text:          #F5F7FA;  /* primary */
  --color-text-2:        #A9B0C0;  /* secondary */
  --color-text-3:        #8A92A6;  /* tertiary (still AA on surface-1) */
  --color-text-disabled: #5B6275;  /* disabled only, never for meaningful text */

  /* Brand accent (use sparingly: primary action, selection, focus, progress) */
  --color-accent:        #19D3FF;
  --color-accent-strong: #00B8E6;
  --color-accent-soft:   rgba(25, 211, 255, 0.14);
  --color-on-accent:     #04141A;  /* text/icons on accent */

  /* Semantic */
  --color-success:       #2BD67B;
  --color-success-soft:  rgba(43, 214, 123, 0.14);
  --color-warning:       #FFB020;
  --color-warning-soft:  rgba(255, 176, 32, 0.14);
  --color-danger:        #FF4D5E;
  --color-danger-soft:   rgba(255, 77, 94, 0.14);

  /* Premium highlight for top plan / savings only */
  --color-gold:          #E8C26A;
  --color-gold-soft:     rgba(232, 194, 106, 0.14);

  /* Focus */
  --color-focus-ring:    #19D3FF;
}
```

Rules:
- **Accent is rare.** At most one accent-filled element per screen (the primary button), plus small accent details (selected outline, progress, active angle).
- **Red (`danger`) is only for destructive and error states.** It is never a brand or promotion color. Generate is *not* red.
- **Green (`success`)** is used for "aligned", "confirmed", "saved", and savings badges. **Gold** is for the top plan and the best-value badge.
- **Contrast:** body text uses `--color-text` or `--color-text-2`. `--color-text-3` is for captions on `surface-1` and darker. `--color-text-disabled` is never used for text a user must read. All text pairs meet WCAG AA.
- Never convey meaning by color alone (add icon or label).

### 2.2 Typography

**Fonts (open licenses, self-hosted via `next/font`):**
- Latin and Cyrillic (including Kazakh, Kyrgyz, Tajik letters) and Turkish: **Inter**
- Arabic: **Noto Sans Arabic** (applied by `:lang(ar)`)
- Before release, run a glyph coverage page for every locale (including Uzbek `oʻ`/`gʻ` using U+02BB, Turkish `İ ı ş ğ`, Tajik `ӣ ҷ ҳ қ ғ ӯ`, Kazakh `ә ғ қ ң ө ұ ү һ і`, Kyrgyz `ң ө ү`). A missing glyph is a release blocker.

**Scale (fluid with `clamp`, never fixed px):**

| Token | Use | Size |
|---|---|---|
| `--text-display` | Hero numbers, language picker title | `clamp(2rem, 1.4rem + 2.4vw, 3.25rem)` |
| `--text-title-lg` | Screen titles | `clamp(1.5rem, 1.2rem + 1.2vw, 2.25rem)` |
| `--text-title` | Section titles, sheet titles | `clamp(1.125rem, 1rem + 0.6vw, 1.5rem)` |
| `--text-body-lg` | Primary buttons, item names | `clamp(1rem, 0.95rem + 0.3vw, 1.125rem)` |
| `--text-body` | Default text | `clamp(0.9375rem, 0.9rem + 0.2vw, 1rem)` |
| `--text-caption` | Hints, labels | `clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem)` |
| `--text-price` | Price ticker | `clamp(1.25rem, 1.05rem + 1vw, 2rem)` with tabular numerals |

Rules:
- Minimum rendered text size is 13 px. Never smaller.
- Weights: 400 body, 500 labels, 600 buttons/titles, 700 only for large numbers.
- Numbers that change (prices, credits, percentages) use `font-variant-numeric: tabular-nums` so nothing shifts while counting.
- Line height: 1.45 body, 1.2 titles, **1.65 for Arabic**. Arabic letter-spacing is always `normal`.
- Never use uppercase transforms on Cyrillic/Arabic/Turkish (breaks `İ/i`). Do not rely on `text-transform`.
- Text must still work at 200% OS font scaling (see 9.3).

### 2.3 Spacing, radius, elevation

- **Spacing:** 4-px base. Tokens `--space-1` (4) to `--space-12` (48) on a 4/8 rhythm. Touch layouts default to `--space-4` (16) gutters on phones, `--space-6` (24) on tablet and larger.
- **Radius:** `--radius-sm` 10, `--radius-md` 14, `--radius-lg` 20, `--radius-xl` 28, `--radius-pill` 999. Cards `md`, sheets `xl` (top corners), buttons `md`, chips `pill`.
- **Elevation:** by **surface color and border**, not heavy shadows. One soft shadow token `--shadow-float: 0 12px 40px rgba(0,0,0,0.45)` for floating HUD and sheets only.
- **Glass:** `backdrop-filter: blur(16px) saturate(140%)` on `--color-glass`. At most **two** blurred layers visible at once. If `prefers-reduced-transparency` is set, or the runtime performance flag `perf=lite` is on (low-end tablets, detected by sustained frame drops), glass falls back to solid `--color-glass-strong`.

### 2.4 Iconography
- **Lucide** icon set, 24 px grid, 1.75 px stroke, `currentColor`.
- Icon-only buttons have a translated `aria-label` and a 48×48 hit area.
- Directional icons (arrows, chevrons, back, next) **flip in RTL**. Non-directional icons (camera, car, lock, check) do not.

### 2.5 Motion tokens
| Token | Value | Use |
|---|---|---|
| `--motion-fast` | 120 ms | press feedback, chip select |
| `--motion-base` | 220 ms | HUD show/hide, card select |
| `--motion-slow` | 380 ms | sheets, page transitions |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | entering |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | moving |
| spring (Framer) | `stiffness 380, damping 34` | price counter, sheet |

Rules: animate `transform` and `opacity` only. Honor `prefers-reduced-motion` (replace motion with a fade of ≤ 120 ms and stop looping animations). No animation blocks input.

---

## 3. Layout system

### 3.1 Device classes (the only layout switches allowed)

| Class | Condition | Typical device |
|---|---|---|
| `phone-portrait` | width < 640 px, portrait | Phones |
| `phone-landscape` | height < 520 px, landscape | Phones rotated |
| `tablet` | 640–1023 px width | iPad / Android tablets, both orientations |
| `desktop` | 1024–1799 px width | Laptops, monitors |
| `tv` | ≥ 1800 px width | Showroom TV / big monitor |

Implement with container queries and `@media (orientation)` in one `useDeviceClass()` hook and CSS variables. Never branch on user-agent strings.

### 3.2 Safe areas and viewport
- Full-screen layouts use `100dvh` (never `100vh`) and respect `env(safe-area-inset-*)`.
- In PWA standalone mode there is no browser chrome. Provide our own back affordance on every non-root screen.
- The studio and camera screens disable pull-to-refresh and rubber-band scrolling (`overscroll-behavior: none`) inside those screens only.

### 3.3 The Zero-Clipping Law (applies to every screen)

1. No fixed width or height on any element that contains text. Use `min-width`, `max-width`, `flex`, `grid`, `min-w-0`.
2. Text containers have an explicit overflow policy:
   - **Item names:** 2 lines max, then ellipsis (`line-clamp-2`); full name appears in the item sheet.
   - **Buttons and chips:** text wraps to a second line before it is ever cut; chips in rails scroll, they never shrink.
   - **Prices, credit counts, percentages, booking codes:** never truncated, never wrapped mid-number, `white-space: nowrap`, with space reserved.
3. Horizontal collections (categories, items, angles) are **scroll-snap rails** with `flex-shrink: 0` children and a fading edge hint. They are never compressed to fit.
4. Test every screen with: the longest Russian string, the longest Uzbek string, Arabic (RTL), Turkish, 200% font scale, and the smallest supported width (320 px).
5. Stacked floating elements never overlap: each HUD region has a reserved zone (section 5.1). If zones collide on a small screen, secondary elements collapse into a menu; the car view is never covered by more than the allowed percentage.
6. Add a **pseudo-localization** dev mode that expands every string by 40% and wraps it in brackets. CI runs visual tests with it on.

### 3.4 Grid and containers
- Marketing/public pages: max content width 1200 px, centered.
- Studio: full-bleed, no page scroll (`overflow: hidden`), internal scrolling only in rails and sheets.
- Dashboard/admin: max width 1440 px, responsive grid with 4/8/12 columns.

---

## 4. Core components

All components live in `src/components/ui` (primitives) or their feature's `components/`. Variants via `cva`. Every component documents states: default, hover (pointer devices only), pressed, focus-visible, disabled, loading, error.

### 4.1 Button
| Variant | Look | Use |
|---|---|---|
| `primary` | accent fill, `--color-on-accent` text | The one main action per screen |
| `secondary` | `surface-2` fill, border | Alternatives |
| `ghost` | transparent, text-2 | Tertiary, toolbar |
| `danger` | `danger-soft` fill, danger text | Destructive |

- Heights: `md` 48, `lg` 56 (primary on touch). Min width 96. Padding inline 20.
- Loading: label replaced by spinner **and** width kept (no layout jump). Disabled buttons explain why through a visible helper text, not only a gray style.
- The **Generate** button is `primary`, `lg`, shows a small cost chip ("1 credit") inside, and changes label to "Update preview" when the result is outdated.
- Pressed state: scale 0.98 over `--motion-fast`.

### 4.2 Chip / Segmented control
Category chips: pill, height 44, inline padding 16, icon + label, selected = `accent-soft` fill + accent border + text. Mode switch (Quick / 360°) is a 2-option segmented control, height 44, full width on phones.

### 4.3 Item card (catalog)
- Size: width `clamp(120px, 28vw, 168px)` in rails; image area is square-ish with transparent-background product image (`object-fit: contain`) on `surface-1`.
- Content (nothing more): image, name (2 lines), price (nowrap), and a corner state icon.
- States:
  - **default**
  - **selected:** accent outline 2 px, check badge at corner, `surface-2`
  - **not visible from this angle:** dimmed 60%, small camera badge; tap opens the "Capture [Rear] photo" sheet (FR-STU-05)
  - **out of stock / on order:** "On order" tag; still selectable if the shop allows
- A long press or an info button opens the **Item sheet** (large images, description, fit info, shop, price breakdown). Details never live on the card.

### 4.4 Price ticker
- Floating glass pill at the top (end side). Shows `Total` label (caption) and the amount (`--text-price`).
- Amount animates with a rolling counter (spring) over ≤ 400 ms, then settles; it never causes layout shift (tabular numerals, reserved width for the longest expected amount).
- Tap opens the **Itemized sheet**: each selected item (image, name, price, remove ✕), labor total, grand total, and display-currency line when applicable.
- Currency display follows the user setting; billing math is always USD minor units (see `04`).

### 4.5 Before/After slider
- A full-bleed comparison with a single vertical divider and a 48 px circular handle (arrows icon, flips in RTL only for the arrows, not the slider orientation).
- Labels "Before" and "After" sit in small glass capsules at the top corners and fade while dragging.
- Pointer-down on the car/handle hides all HUD within 200 ms; pointer-up restores after 300 ms.
- Keyboard: left/right arrow moves 5%, Home/End jump to 0/100%. Screen-reader value: "Comparison position 50 percent".
- When no result exists, the slider is not shown; the original photo and a clear "Generate" prompt are.

### 4.6 Sheets, modals, toasts
- **Bottom sheet** (phones/tablet portrait) / **side sheet** (landscape, desktop). Drag handle, snap points 40% / 90%, `--color-glass-strong`, `--radius-xl` on leading corners. Closing by swipe, backdrop tap, Escape, or close button.
- **Modal** only for blocking decisions (confirm, upgrade). Max width 480, one primary action. Never stack modals; replace content instead.
- **Toast:** non-blocking, bottom (above dock), 4 s, one at a time, never covers the primary action.
- **Banner:** inline, persistent until resolved (low credits, expiring plan). One banner at a time.

### 4.7 Credit meter
Compact pill in the top bar for shops: icon + number (`tabular-nums`). Tap opens plan details. Color states: normal (text-2), warning (`warning`), critical (`danger`), each with an icon change. The pill is hidden in Customer View.

### 4.8 Form fields
Height 52, label above (never placeholder-only), helper/error text below, error uses `danger` + icon + text. Inputs use the correct `inputmode` and `autocomplete` (`tel`, `email`, `one-time-code`). Phone input supports country prefix selection (UZ, KG, AE, TR, KZ, TJ first). Forms never require horizontal scroll and never hide the primary button behind the keyboard (scroll into view, sticky footer button using `dvh`).

### 4.9 Progress, skeleton, empty, error
- **Skeleton:** shimmer 1.4 s, respects reduced motion; matches final layout dimensions.
- **Render progress:** see 6.3. Never a bare spinner.
- **Empty states:** one illustration-free line of text, one explanation, one action ("No items yet — import from the Master Catalog").
- **Error states:** what happened (human words), what the user can do (retry / contact), and whether money/credits are safe ("Your credit was returned").

---

## 5. The Studio (main screen)

### 5.1 Anatomy and reserved zones

```
┌──────────────────────────────────────────────────────────┐
│ [Back]  [Vehicle chip ✎]                  [Price ticker] │  ← TOP BAR (glass, ≤ 56 px)
│                                                          │
│                                                          │
│                  VEHICLE VIEWPORT                        │  ← car image, object-fit: contain
│            (pinch to zoom, drag to pan,                  │     tap = toggle HUD
│             before/after divider)                        │
│                                                          │
│  [Angle compass]                       [Night] [Report]  │  ← FLOATING TOOLS (start / end edges)
│ ┌──────────────────────────────────────────────────────┐ │
│ │ (Wheels)(Tires)(Bumper)(Lights)(Spoiler)(Color)...   │ │  ← DOCK: category rail
│ │ [card][card][card][card][card] →                     │ │     item rail
│ │ [        ✦ Generate · 1 credit        ]              │ │     primary action
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

Zones are reserved and mutually exclusive: top bar, start-edge tools, end-edge tools, dock. Nothing else floats over the car.

### 5.2 Space rules
- **Dock expanded:** vehicle viewport ≥ 62% of the viewport height (phone portrait). Dock height ≤ 38%.
- **Dock collapsed:** only the price + Generate pill; viewport ≥ 85%.
- **HUD hidden** (while dragging, zooming, comparing): viewport 100%.
- The dock has three states: `expanded`, `collapsed`, `hidden`. Swipe down collapses, tap on the collapsed pill expands.
- The car image is **never cropped**: `object-fit: contain` on `--color-bg`. If the photo is portrait on a landscape screen (or vice versa), it letterboxes cleanly on a subtle radial vignette; the user can zoom to fill.

### 5.3 Layout per device class

| Class | Dock / panel | Angle selector | Notes |
|---|---|---|---|
| `phone-portrait` | Bottom dock (rails) | Compass, bottom-start, above dock | One-handed reach; primary button in the thumb zone |
| `phone-landscape` | **Side panel at the end edge**, width `clamp(260px, 32vw, 340px)`; items in a 2-column vertical grid, category chips in a horizontal rail at the panel top | Compass moves to the top of the start edge | Top bar slims to 44 px; price ticker inside the panel header if space is short |
| `tablet` (portrait) | Bottom dock with larger cards | Angle strip (8 thumbnails of captured photos) at the start edge | Customer-facing; larger type |
| `tablet` (landscape) | Side panel at end edge, width 380 px | Angle thumbnails strip at start edge | Same as desktop structure |
| `desktop` | Persistent side panel at the end edge, width 420 px | Angle thumbnails strip at start edge | Mouse wheel zoom; Space toggles before/after |
| `tv` | Side panel 480 px, type scale ×1.25 | Thumbnails strip | "Showroom" look: larger cards, QR to open on phone; no tiny text |

### 5.4 Angle selector ("compass")
A 56 px glass disc with a top-down car icon and eight tap points (the eight angles). Captured angles are filled, the active one is accented, missing ones are hollow and open the capture sheet. It is language-free, one-thumb friendly, and replaces numbered tabs. On wide layouts it becomes a vertical strip of photo thumbnails with the same states.

### 5.5 Vehicle chip
Top bar, start side: "Chevrolet Malibu 2 · 2019–2023" with an edit pencil. Tapping opens a sheet: make → model → generation search. If recognition confidence is low the chip is highlighted in `warning` with "Confirm your car".

### 5.6 Customer View (showroom)
When the shop hands over the tablet, the UI hides: credits, settings, other tabs, admin entry. The top bar shows only the vehicle chip and price. Exit requires the shop PIN (long-press the CarVision mark). Customer View never shows internal shop prices or cost data, only what the customer should see.

---

## 6. Key interactions

### 6.1 Selecting items
1. Tap a category chip: the item rail filters; chip is selected.
2. Tap a card: it is added (or replaces the same-slot item); haptic tick (where supported); the price ticker rolls to the new total; the card shows the selected state.
3. If the item cannot be seen from the current angle: switch angle animation (crossfade ≤ 220 ms) or open the capture sheet.
4. The result image is marked **Outdated** (small amber capsule at the end-edge tool zone) and Generate becomes "Update preview".

### 6.2 Generating
1. Generate shows cost; tap.
2. Immediate acknowledgement (≤ 100 ms): button loading state, dock collapses to the progress pill.
3. See 6.3 for the visual.
4. On success: preview appears with a short reveal, then upgrades to 4K without a flash (crossfade). A subtle success haptic (where supported).
5. On failure: inline message "Something went wrong. Your credit was returned." with Retry.

### 6.3 Render progress ("scan")
A thin accent light line sweeps across the **original photo** left to right at constant speed while a soft shimmer passes over the areas being modified; a label shows a stage ("Detecting parts", "Placing items", "Sharpening to 4K") and a percentage that never goes backwards. Stages are mapped to real job states when available and otherwise to honest time-based estimates, capped at 95% until done. Reduced motion: progress bar + stage label only.

### 6.4 Haptics and sound
- Vibration API is **not supported on iOS Safari/PWA**. Haptics are an enhancement on Android only; every haptic has an equivalent visual cue. Never rely on haptics for meaning.
- Android patterns: select 10 ms; aligned in camera `[20, 40, 20]`; success 35 ms.
- No sound by default (workshops are loud). Sound only in the video reel.

### 6.5 Language switching
Available from the first screen and from Settings at any time. Switching is instant, keeps the current screen state, and flips layout direction for Arabic with no reload flicker.

---

## 7. Screens (visual rules; behavior is in `03_SCREENS_AND_FLOWS.md`)

### 7.1 Language picker (first screen)
Dark full-bleed with a slow, subtle hero image of a car in a studio (static image + gentle parallax, no video). Title in the detected language. A grid of **large language buttons showing the native name** ("Oʻzbekcha", "Русский", "English", "Türkçe", "العربية", "Кыргызча", "Қазақша", "Тоҷикӣ"). **No flags** (languages are not countries; flags cause confusion and offense). One tap selects and continues. Grid: 2 columns on phones, 4 on larger.

### 7.2 Role choice
Two large cards: "I own a car" and "I run a tuning/detailing shop", each with a one-line benefit. Nothing else on the screen.

### 7.3 Shop dashboard
Top: credit meter and plan status card (plan, days left, credits, **Upgrade/Contact** action). Below: three big actions: **New car**, **Inventory**, **Bookings**. Referral card with code and QR below. No dense tables on phones: lists use cards.

### 7.4 Inventory
Grid of item cards with price badge; filters by category and fit; a prominent "Import from Master Catalog" and "Add custom item". Price editing is inline in a sheet with a numeric keypad.

### 7.5 Plans (Pricing sheet)
Three plan cards (Pro, Max, Ultra); Max highlighted ("Most popular", accent border), Ultra with gold ("Best value"). Each shows price, credits, **cost per image**, and the savings capsule (green) computed from the database (see PRD 5.5). The action is **"Contact to activate"** (opens the configured Telegram link with a prefilled message); there is no card form. Cards stack vertically on phones.

### 7.6 Marketplace
Partner cards: masked title, district, rounded distance, rating or "New", and the items from this partner in the build. A lock icon and the line "Address and contacts unlock after you book" appear on every card. No exact location, ever.

### 7.7 Booking
A 3-step flow with a progress indicator: **Review → Pay deposit → Confirmation**. The summary stays visible (sticky on large screens; collapsible bar on phones) with total, **deposit (credited to your bill)**, and **remaining at the shop**. The receipt upload shows file preview, a clear state ("Checking your receipt…", "Waiting for confirmation, usually within X"), and never a dead end.

### 7.8 Tuning Passport
A premium read-only page: the before/after slider on top, itemized list, total, shop name, validity date, and the actions "Save", "Reserve with deposit". Built for phones, shareable.

### 7.9 Admin console
Same tokens, desktop-first. Dense but calm: sticky header, left navigation (collapses to icons, then a menu on small widths), tables inside scroll containers with sticky first column and priority columns, summary cards on top, charts minimal (line and bar, one accent color + neutral). Global search (Cmd/Ctrl+K) finds shops/users instantly. Dangerous actions require a typed or explicit confirmation and show the audit note field.

---

## 8. Camera UI (visual language; math in `08_SMART_CAMERA.md`)

- Full-bleed camera feed; the **silhouette overlay** (thin 2 px outline) for the target angle sits at the viewport center.
- Overlay color is state: **neutral** (`text-2`), **close** (`warning`), **aligned** (`success`) with a short confirmation pulse and the automatic shutter countdown ring (600 ms).
- A single **guidance pill** at the top (glass): short imperative text with an arrow icon ("Move closer", "Step right", "Lower the phone"). One instruction at a time, max 3 words in most languages; it updates at most twice per second so it never flickers.
- A **level line** (horizon) appears only when tilt exceeds a threshold.
- Bottom: angle dots (8, filled when captured), manual shutter button 72 px, flash toggle, "Upload instead" action.
- Permission-denied and unsupported states have designed screens with exact steps to enable the camera.
- Orientation: the guide asks for landscape orientation for side and 45° angles when it would give a better frame, with a clear "rotate your phone" illustration; it never forces rotation.

---

## 9. Accessibility, localization, resilience

### 9.1 Accessibility
- Contrast AA everywhere; focus-visible ring: 2 px `--color-focus-ring` with 2 px offset on every interactive element.
- Targets ≥ 48 px (44 px absolute minimum), spacing ≥ 8 px between adjacent targets.
- Landmarks, headings, labels, and live regions for status ("Preview ready", "Credit returned").
- Full keyboard operation on desktop, including slider and sheets (focus trap and return).
- No information conveyed by color or motion alone.

### 9.2 RTL (Arabic)
`dir="rtl"` at the root. Use logical properties only. Mirror layout, rails, back/next icons, progress direction, and sheet side. **Do not mirror** the vehicle viewport, the before/after slider's meaning (Before always on the physical left in LTR; in RTL the labels swap sides so "Before" remains the original image), numerals' internal order, the compass, or the camera overlay. Test every screen in RTL before merge.

### 9.3 Text scaling and small screens
Support OS text scale up to 200%. At large scales: chips wrap their label to two lines (height grows), item cards grow, dock moves to its collapsed state by default and exposes categories in a sheet. Minimum supported width 320 px.

### 9.4 Weak network and offline
Show connection state in a quiet inline indicator. Uploads show per-photo progress and a retry; captured photos are never lost. Offline screen: honest explanation, what still works, retry.

### 9.5 Performance rules for visuals
Hero and catalog images as AVIF/WebP with explicit dimensions and blur placeholders; no autoplay video on public pages; one backdrop blur region at a time on low-end devices; no animations on offscreen elements; Three.js and video code loaded only on their routes.

---

## 10. Content and microcopy rules

- Short, friendly, confident. Verbs first: "Generate", "Retake", "Book", "Choose your car".
- No jargon ("inpainting", "credits" is fine, "tokens" is not). Say "preview" and "4K".
- Money: always show the currency symbol or code next to amounts; show USD alongside local display currency when they differ.
- Honesty: never use urgency tricks, fake counters, fake reviews or fake ratings. Savings badges only show real computed values.
- Every error message states cause, effect on money/credits, and the next action.
- All copy lives in `messages/*.json`, written to expand up to 40% in other languages (design for it).

---

## 11. Brand assets

- Wordmark "CarVision" (the owner supplies or commissions the logo; until then use a clean text wordmark in Inter 600 with a thin accent underline detail).
- App icon: dark square with the mark; maskable PWA icon with safe zone.
- Splash: `--color-bg` with the mark, no animation longer than 800 ms.
- Photography: dark studio cars with natural reflections; no stock-photo clichés, no watermarked images.

---

## 12. Quality gates for UI work

A UI task is complete only if:
- [ ] Uses tokens only (no raw colors, sizes, or radii)
- [ ] Verified in `phone-portrait`, `phone-landscape`, `tablet` (both), `desktop`, `tv`
- [ ] Verified in `uz`, `ru`, `ar` (RTL), `tr` and pseudo-localization at 40% expansion
- [ ] Verified at 320 px width and 200% font scale
- [ ] No text clipped, no overlapping zones, no layout shift when numbers change
- [ ] Loading, empty, error, offline states exist and are designed
- [ ] Keyboard and screen-reader pass for interactive components
- [ ] Reduced motion and reduced transparency respected
- [ ] Screenshots of the above attached to the pull request
