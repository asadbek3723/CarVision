---
trigger: always_on
---

# DESIGN RULE (CARVISION CONTEXT + ADMIN)

Apply together with design.md and design-components.md. Edit as the product evolves.

---

## 1. CARVISION PRODUCT CONTEXT
- Product: AI car tuning visualizer + parts marketplace, B2C and B2B SaaS, PWA, Uzbekistan first.
- Feel: automotive, precise, confident, high-end showroom. The car image is the hero of every screen where it appears: large, well lit, generous space around it.
- Visualizer screens: the canvas/preview dominates, controls are quiet and docked (side panel on desktop, bottom sheet on mobile). Controls must never cover the car.
- Marketplace: product cards lead with the image, then name, then price (tabular numbers, `so'm` formatting), then compatibility badge. Filters in a drawer on mobile.
- Dark mode is first-class since car imagery looks best on dark surfaces. Light mode must be equally polished.
- PWA: installable look, no browser-default UI, designed offline/empty/error states, high-quality splash and icons.
- Locales: `uz` (Latin, default), `ru`, `en`. All text through the i18n system, nothing hardcoded. Layouts must survive the longest string.
- Phone format `+998 XX XXX XX XX`. Payment logos (Click, Payme, Uzum) in clean uniform containers.

---

## 2. ADMIN / DASHBOARD STANDARD (when building admin screens)
Sidebar-based, Linear / Vercel / Stripe level, same borderless depth system.
- **Sidebar**: collapsible (260 / 72), grouped sections with labels, animated active indicator, counters, user card at bottom, tooltips when collapsed, mobile drawer, persisted state.
- **Top bar**: breadcrumbs, search with Cmd/Ctrl+K palette, notifications, theme toggle, profile menu, language switcher.
- **Home**: KPI cards (animated numbers, trend, sparkline), main chart with range selector, activity feed, top lists, quick actions.
- **Pages**: data tables, detail pages with tabs, create/edit in drawer or full page, settings, audit log.
- **System**: role-based access (hide in UI AND enforce on server), confirm dialogs for destructive actions, undo where possible, unsaved-changes guard, keyboard shortcuts.