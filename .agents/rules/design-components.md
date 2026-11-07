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
---

## 6. FOUNDATION: TOKENS AND SHARED COMPONENTS (use these, do not re-create)

Tokens live only in `styles/tokens.css` and reach code through `tailwind.config.ts`. Colours are stored as RGB channels (`--c-gold-500: 212 174 98`), so opacity modifiers work: `bg-gold-500/15`, `text-foreground/60`. Plain CSS/SVG uses the ready colour (`var(--gold)`, `var(--surface-1)`).

| Group | Tailwind | Token |
|---|---|---|
| Brand gold 50–900 (500 = `#D4AE62`) | `gold-50` … `gold-900`, `gold` (=500), `gold-soft` (=300), `gold-deep` (=600) | `--c-gold-*`, `--gold`, `--gold-soft`, `--gold-deep` |
| Warm neutral 50–950 | `neutral-50` … `neutral-950` (replaces Tailwind's grey neutral) | `--c-neutral-*` |
| Surfaces (page → popover) | `surface-0` `#0D0E12`, `surface-1` card, `surface-2` raised/field, `surface-3` popover/hover | `--c-surface-*`, `--surface-*` |
| Semantic | `primary` (=gold), `primary-foreground`, `foreground`, `muted-foreground`, `card`, `muted`, `accent`, `background` (current page bg `#0A0B0F`), `ink` (text on gold), `border` (`--line`, 6% white), `ring`, `success`, `warning`, `danger`, `danger-soft`, `destructive`, `info` | `--c-fg`, `--c-fg-muted`, … |
| Elevation | `shadow-e1` cards, `shadow-e2`, `shadow-e3` popovers, `shadow-e4` modals, `shadow-glow-gold` primary CTA only, `shadow-highlight` | `--e1`…`--e4`, `--glow-gold`, `--highlight` |
| Radius | `rounded-sm` 8, `rounded-md` 12 (inputs), `rounded-full` (buttons), `rounded-lg` 16 (cards), `rounded-xl` 24 (panels, modals), `rounded-full` | `--r-sm` `--r-md` `--r-lg` `--r-xl` |
| Motion | `duration-micro` 160ms, `duration-ui` 240ms, `duration-section` 500ms, `ease-brand` `cubic-bezier(.22,1,.36,1)`, `ease-brand-in-out` | `--dur-*`, `--ease-out`, `--ease-in-out` |

**Radius change (Nov 2026).** The old scale was inverted (`2xl` 32px > `3xl` 24px). Now: `sm` 10→8, `md` 14→12, `lg` 18→16, `xl` 24 (same), `2xl` 32→28 (−4px, the least that restores order), `3xl` 24→32. Prefer `rounded-lg`/`rounded-xl` in new code; `2xl`/`3xl` remain only for existing pages.

**Classes that used to render nothing** (`text-primary`, `text-muted-foreground`, `border-primary`, `bg-card`, `bg-primary`, `text-foreground/…`, `border-border`, `hover:text-gold-soft`, `bg-gold/15` …) now produce CSS. Pages using them will look different (usually as their author intended); check them during page migration.

Components in `src/components/ui/` (import from `@/components/ui`):

- **`Button`**: `variant` `gold` (the one primary action) / `quiet` (secondary, filled) / `ghost` (tertiary) / `danger`; `size` `sm` 44px / `md` 48px / `lg` 56px; `loading` (spinner, width kept), `disabled`, `fullWidth`; pass `href` to render a `next/link`. `buttonClasses()` gives the same look for elements that cannot be a Button.
- **`Surface`**: borderless card. `tone` 1–3, `elevation` 0–4, `padding` none/sm/md/lg, `radius` lg/xl, `interactive` (hover lift, only for clickable cards), `as` div/section/article/aside/li.
- **`Input` / `Select` / `Textarea`** (Field.tsx): filled, borderless, 48px, 16px text (no iOS zoom), `label`, `hint`, `error` (sets `aria-invalid`, links text via `aria-describedby`). `Field` wraps custom controls; `fieldClass` is the raw look.
- **`Sheet`** (bottom sheet on phones, centred from 640px) and **`Modal`** (always centred): `open`, `onClose`, `title`, `description`, `footer`, `size` sm/md/lg. Spring motion (300/30, fade only with reduced motion), ESC and backdrop close, focus trap and restore, scroll lock, `dvh` heights, safe-area padding. `data-autofocus` picks the first focused element.
- **`PageHeader`**: the single h1 style, optional `subtitle`, `back` (`{ href, label? }`, RTL-aware chevron) and `actions`.

Still to migrate (page work, not done in the foundation): `.btn-gold`, `.gold-btn`, `.shimmer` + `bg-gold-gradient` buttons and inline gold buttons → `Button`; the admin `Surface`/`Sheet`/`Field`/`PageHeader` in `src/components/admin/ui.tsx` → these; hardcoded `#D4AE62` → `gold-500` / `primary`; legacy aliases at the end of `tokens.css` (`--bg-primary`, `--glass-*` …) → delete once unused.
