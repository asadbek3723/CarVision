---
trigger: always_on
---

# DESIGN RULE: PREMIUM, BORDERLESS, DEPTH-BASED UI

Apply to every UI task. The result must feel like a $100M SaaS product designed by a senior product designer: calm, expensive, precise. It must NEVER look AI-generated, templated, or like default component-library output.

---

## 0. BEFORE DESIGNING
- Ask me: brand personality, target audience, reference sites I like, primary accent color, light/dark/both, language(s).
- Define the design tokens FIRST (section 1), then build components from tokens. Never hardcode colors, shadows, radii, or spacing inside components.
- Reuse existing components. Never create a second version of a button, card, or input.

---

## 1. DESIGN TOKENS (single source of truth)
Create them as CSS variables / Tailwind theme extension.

### Spacing (4px base)
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128. Use only these values. Section padding on desktop: 80-128px; on mobile: 48-64px.

### Radius
- sm 8px (chips, small inputs), md 12px (buttons, inputs), lg 16px (cards), xl 24px (large panels, modals), full (avatars, pills).
- Nested elements: inner radius = outer radius minus padding.

### Elevation (multi-layer shadows, tinted, never pure black)
Use layered shadows: one tight contact shadow + one wide soft shadow. Example (light mode):
- e1: `0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)`
- e2: `0 2px 4px rgba(16,24,40,.04), 0 4px 12px rgba(16,24,40,.06)`
- e3: `0 4px 8px rgba(16,24,40,.04), 0 12px 32px rgba(16,24,40,.08)`
- e4: `0 8px 16px rgba(16,24,40,.06), 0 24px 56px rgba(16,24,40,.12)`
- Accent glow (primary buttons / highlights): `0 8px 24px -6px <accent @ 40% opacity>`
- Inset highlight for premium feel: `inset 0 1px 0 rgba(255,255,255,.6)`
- Dark mode: reduce shadow opacity, rely more on surface lightness steps + subtle inner top highlight (`inset 0 1px 0 rgba(255,255,255,.05)`).
- Elevation rules: page background = lowest, cards = e1/e2, dropdowns/popovers = e3, modals = e4. Hover raises one level.

### Color
- Neutral scale: 10 steps (50-950), slightly tinted toward the brand hue (never pure gray, never pure #000 or #FFF for large surfaces).
- ONE accent color with a 10-step scale. Semantic colors: success, warning, danger, info (each with soft background + strong text variants).
- Surfaces (light): app background (off-white/soft gray), card (white), raised (white + e2), muted (neutral-50/100).
- Surfaces (dark): background neutral-950, card neutral-900, raised neutral-800. Never pure black.
- Separation is done by SURFACE TONE + SHADOW + SPACE, not by lines.
- Subtle gradients allowed (very low contrast) on hero areas, primary buttons, and stat cards. No rainbow, no neon, no purple-to-pink "AI gradient" clichés.
- Always ship light AND dark mode with a theme toggle (respect system preference, persist choice).
- Contrast: WCAG AA minimum (4.5:1 body text, 3:1 large text/UI).

### Typography
- Font: one premium sans (Inter, Geist, Manrope, or Plus Jakarta Sans). Optional second display font for headings only. Self-host with `font-display: swap`.
- Scale (fluid with clamp): 12, 14, 16 (body), 18, 20, 24, 30, 36, 48, 60, 72.
- Body 16px (14px allowed in dense dashboards), line-height 1.5-1.65; headings line-height 1.1-1.3, letter-spacing -0.01 to -0.03em.
- Weights: 400 body, 500 UI labels, 600 headings, 700 only for big display. Max 3 weights per screen.
- Tabular numbers (`font-variant-numeric: tabular-nums`) for all stats, tables, prices.
- Max line length 60-75 characters for paragraphs.

---

## 2. BORDERLESS PHILOSOPHY
- Default: NO borders on cards, panels, inputs, buttons, tables, nav.
- Replace borders with: surface tone difference, elevation shadow, spacing, or a soft inset shadow (`inset 0 0 0 1px rgba(0,0,0,.04)` is allowed ONLY as a barely-visible ring where contrast would otherwise fail, e.g. white card on white background).
- Dividers: avoid. Use spacing and background bands. If unavoidable, 1px at max 4-6% opacity.
- Focus state must be visible and beautiful: soft 3-4px ring in accent color at ~25% opacity (accessibility is not optional, this is not a "border").
- Inputs: filled soft background (neutral-100), no border, inner shadow or ring on focus, raise slightly.
- Tables: no grid lines; zebra via subtle tone or row hover highlight; generous row height (52-60px).

---

## 3. COMPONENT STANDARDS
Every component needs ALL states: default, hover, active/pressed, focus-visible, disabled, loading, error, empty.

- **Buttons**: Primary (accent gradient or solid + glow shadow), Secondary (soft tinted bg), Ghost, Danger. Height 40/44/48. Press = scale(.98). Loading = inline spinner, width stays stable. Icon + label spacing 8px.
- **Cards**: radius 16-24, e1/e2, padding 20-32, hover lift (translateY -2px + shadow up one level) only if clickable.
- **Inputs/Selects/Textareas**: height 44-48, filled style, floating or top label, helper + error text, inline validation, clear button where useful. Custom select/dropdown (never the native browser look). Use proper `inputmode`, `autocomplete`, `type` attributes.
- **Modals/Drawers**: backdrop blur + dim, scale/slide-in animation, e4, focus trap, ESC to close, scroll lock, bottom-sheet on mobile.
- **Toasts**: stacked, animated, auto-dismiss with progress, action button (undo).
- **Tables/Lists**: sticky header, sortable, search, filters, pagination, row selection, bulk actions, column visibility, export, row skeletons, mobile = card list (never a squeezed table).
- **Tabs, Segmented controls**: animated sliding indicator (shared layout animation).
- **Badges/Chips**: soft tinted background + strong text, pill radius, no borders.
- **Tooltips/Popovers**: e3, small arrow optional, delay 300ms.
- **Charts**: Recharts/Chart.js, smooth curves, soft gradient area fills, no gridline clutter, custom tooltip, animated on mount, accessible colors, consistent palette from tokens.
- **Skeletons**: shimmer loaders matching the real layout (never a lone spinner for page loads).
- **Empty states**: illustration/image + short title + helpful text + primary action.
- **Avatars**: image with fallback initials on soft tinted background, status dot.

---

## 4. ICONS, IMAGERY, NO-GO LIST
- Icons: ONE premium set only (Lucide, Phosphor, or Tabler). Consistent size (16/18/20/24) and stroke width (1.5-2). Optional soft tinted rounded-square container behind feature icons.
- NEVER use emojis, stickers, or clip-art in UI. Never mix icon sets.
- Images: use real, high-quality photography, 3D renders, or custom illustrations generously (hero, cards, banners, backgrounds, empty states, auth screens, onboarding). Use `next/image` or equivalent: WebP/AVIF, correct sizes/srcset, lazy loading, blur placeholder, fixed aspect ratios (no layout shift), meaningful alt text, subtle overlay gradient when text sits on images.
- Use realistic content in layouts. No "Lorem ipsum", no "John Doe", no "Feature 1/2/3".
- Avoid the AI-template look: no centered-everything hero with a purple gradient blob, no three identical icon cards in a row as the only layout, no generic stock gradients, no excessive glassmorphism, no random decorative shapes, no overuse of bold gradients on text.
- Vary layout rhythm: bento grids, asymmetric splits, large media sections, sticky storytelling, oversized typography moments.

---

## 5. MOTION & ANIMATION (ALWAYS PRESENT)
- Library: Framer Motion (React) / GSAP (complex scroll) / CSS transitions (simple).
- Timing: micro 120-200ms, UI 200-300ms, page/section 400-600ms. Easing: `cubic-bezier(.22,1,.36,1)` (ease-out-expo feel) for entrances; ease-in-out for movement. Springs for drawers/modals (stiffness ~300, damping ~30).
- Required animations:
  - Page/route transitions (fade + slight translate)
  - Staggered entrance for lists, grids, cards (40-80ms stagger)
  - Scroll-reveal for landing sections (once, not repeating)
  - Hover/press feedback on every interactive element
  - Animated number counters on stats
  - Animated chart draw-in
  - Shared-layout animations for tabs, active nav indicator, filters
  - Skeleton shimmer, smooth accordion height, animated toasts/modals/drawers
  - Optimistic UI updates with subtle success feedback
- Animate only `transform` and `opacity` (GPU). Never animate width/height/top/left on large areas. Maintain 60fps.
- Always honor `prefers-reduced-motion` (disable parallax/large movement, keep fades).
- Animation must be purposeful and subtle, never distracting or slow.

---

## 6. LAYOUT & RESPONSIVENESS (MANDATORY)
- Mobile-first. Breakpoints: 360, 640, 768, 1024, 1280, 1536, 1920+. Design and verify at: 360px, 390px, 768px, 1024px, 1440px, 1920px.
- Use CSS Grid/Flex, `clamp()` for fluid type and spacing, `min()/max()`, container queries for components, `dvh` instead of `vh` on mobile.
- Content container max-width 1200-1280px (dashboards fluid with max 1600px). Ultra-wide must not stretch content ridiculously.
- No horizontal scroll, no clipped text, no overlapping elements, no tiny tap targets (min 44x44px).
- Mobile patterns: bottom nav or drawer, bottom sheets instead of modals, sticky primary action, tables become cards, touch-friendly spacing, safe-area insets (iOS notch).
- Images and videos responsive with fixed aspect ratios.
- Test with long text, very short text, 0 items, 1 item, 1000 items, and slow network.

---

## 7. ADMIN PANEL / DASHBOARD STANDARD
ALWAYS sidebar-based, like Linear / Vercel / Stripe / Notion-level SaaS.
- **Sidebar**: collapsible (full to icon-only), grouped sections with labels, icon + label, animated active indicator, badges/counters, user card + workspace switcher at the bottom, tooltips in collapsed mode, mobile = slide-in drawer. Width ~260px / collapsed ~72px. Persist state.
- **Top bar**: breadcrumbs, global search with Cmd/Ctrl+K command palette, notifications panel, theme toggle, profile menu, language switcher.
- **Dashboard home**: KPI stat cards (animated numbers, trend arrows, sparklines), main chart with range selector, recent activity feed, top lists, quick actions.
- **Pages**: data tables (search, filters, sort, pagination, bulk actions, export, saved views), detail pages with tabs, create/edit via drawer or full page, settings (profile, team, roles, security, billing, integrations), audit/activity log, notifications center.
- **System**: role-based access (hide + enforce), keyboard shortcuts, toasts, confirm dialogs for destructive actions, undo where possible, form validation (Zod), unsaved-changes guard, real-time/optimistic updates where useful.
- Same borderless, depth-based, animated system as everywhere else.

---

## 8. ACCESSIBILITY & PERFORMANCE
- Semantic HTML, correct heading order, labels on all inputs, aria attributes for custom components, full keyboard navigation, visible focus, screen-reader-friendly modals/menus.
- Lighthouse targets: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 95+.
- Optimize: code-split, lazy-load below-the-fold, preload critical fonts/hero image, avoid layout shift (CLS < 0.1), keep bundle small, virtualize long lists.

---

## 9. FINAL DESIGN CHECKLIST (run before reporting done)
- [ ] Uses tokens only, no hardcoded values
- [ ] No visible borders or emojis anywhere
- [ ] Depth via layered shadows and surface tones is consistent
- [ ] Light and dark mode both polished
- [ ] All component states exist (hover, focus, disabled, loading, error, empty)
- [ ] Animations present and smooth, reduced-motion respected
- [ ] Verified at 360 / 768 / 1024 / 1440 / 1920 widths
- [ ] Real images and realistic content, no placeholders
- [ ] Contrast, keyboard, and focus verified
- [ ] Looks custom-designed, not like a template. If not, iterate again.
- Then suggest 3-5 design/UX improvements for the next iteration.