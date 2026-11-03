---
trigger: always_on
---

# DESIGN RULE (COMPONENTS, MOTION, LAYOUT)

Apply together with design.md (tokens and philosophy live there). Use tokens only.

---

## 1. COMPONENT STANDARDS
Every interactive component needs ALL states: default, hover, active/pressed, focus-visible, disabled, loading, error. Data components also need empty and skeleton states.

- **Buttons**: Primary (accent solid or subtle gradient + glow), Secondary (soft tinted bg), Ghost, Danger. Heights 40/44/48. Press = `scale(.98)`. Loading = inline spinner, width stays stable. Icon-label gap 8. One primary button per view area.
- **Cards**: radius 16-24, e1/e2, padding 20-32. Hover lift (`translateY(-2px)` + one shadow level up) only if clickable.
- **Inputs/Selects/Textareas**: height 44-48, filled style, top or floating label, helper and error text, inline validation (Zod), correct `type`, `inputmode`, `autocomplete`. Custom select/dropdown, never native look. Phone inputs use a mask.
- **Modals/Drawers**: blurred dim backdrop, spring animation, e4, focus trap, ESC closes, scroll lock. Bottom sheet on mobile.
- **Toasts**: stacked, animated, auto-dismiss with progress, undo action.
- **Tables/Lists** (data-heavy): sticky header, sort, search, filters, pagination, row skeletons. Add bulk actions, export, column visibility only when the use case needs them. Mobile = card list, never a squeezed table.
- **Tabs / segmented controls**: animated sliding indicator (shared layout).
- **Badges/Chips**: soft tinted bg + strong text, pill radius, no border.
- **Tooltips/Popovers**: e3, 300ms delay.
- **Charts**: Recharts, smooth curves, soft gradient fills, minimal gridlines, custom tooltip, draw-in animation, palette from tokens.
- **Skeletons**: shimmer matching the real layout. Never a lone spinner for page loads.
- **Empty states**: image/illustration + short title + helpful text + primary action.
- **Avatars**: image with initials fallback on tinted bg, optional status dot.
- **Errors**: say what happened and how to fix it, with retry. Never raw error text.

---

## 2. ICONS & IMAGERY
- ONE icon set (Lucide, Phosphor, or Tabler). Sizes 16/18/20/24, stroke 1.5-2. Optional soft tinted rounded container for feature icons.
- Never emojis, stickers, clip-art, or mixed icon sets in UI.
- Images: real high-quality photography, 3D renders, or custom illustrations, used generously (hero, cards, banners, empty states, auth, onboarding). Use `next/image`, WebP/AVIF, correct `sizes`, lazy loading, blur placeholder, fixed aspect ratio, meaningful alt, subtle gradient overlay under text.
- Realistic content only: realistic uz/ru names, prices in so'm, real car makes and models.

---

## 3. MOTION (always present, always subtle)
- Framer Motion (React), GSAP only for complex scroll, CSS transitions for simple cases.
- Required:
  - Route transition (fade + small translate)
  - Staggered entrance for lists and grids (40-80ms)
  - Scroll-reveal on landing sections (once)
  - Hover and press feedback on every interactive element
  - Animated number counters on stats
  - Shared-layout animation for tabs, active nav, filters
  - Skeleton shimmer, smooth accordions, animated toasts/modals/drawers
  - Optimistic updates with subtle success feedback
- Animate only `transform` and `opacity`. Never width/height/top/left on large areas. Keep 60fps.
- Honor `prefers-reduced-motion`: remove parallax and large movement, keep fades.
- Motion needs a purpose. If it distracts or slows the user, remove it.

---

## 4. LAYOUT & RESPONSIVENESS (mandatory)
- Mobile-first. Breakpoints: 360, 640, 768, 1024, 1280, 1536, 1920. Verify at 375, 768, 1024, 1440, 1920.
- Use Grid/Flex, `clamp()`, `min()/max()`, container queries, `dvh` instead of `vh`.
- Content max-width 1200-1280 (dashboards fluid, max 1600). Ultra-wide must not stretch content.
- No horizontal scroll, clipped text, overlapping elements. Tap targets at least 44x44.
- Mobile patterns: bottom nav or drawer, bottom sheets, sticky primary action, safe-area insets, thumb-reachable actions.
- Stress test: very long text, very short text, 0 / 1 / 1000 items, slow network, and the longest locale (Russian and Uzbek strings are 20-40% longer than English; never size containers to English text).

---

## 5. ACCESSIBILITY & PERFORMANCE
- Semantic HTML, correct heading order, labels on every input, ARIA on custom components, full keyboard navigation, visible focus, screen-reader-friendly modals and menus.
- Lighthouse targets: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 95+.
- Code-split, lazy-load below the fold, preload critical font and hero image, CLS < 0.1, virtualize long lists, keep bundle small.