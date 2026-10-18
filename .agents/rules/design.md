---
trigger: always_on
---

# DESIGN RULE (CORE): PREMIUM, BORDERLESS, DEPTH-BASED UI

Applies to every UI task. Must feel like a $100M SaaS product by a senior product designer: calm, expensive, precise. NEVER AI-generated, templated, or default component-library look.
Priority: accessibility > usability > consistency with existing tokens > visual taste.
Related rules: design-components.md (components, motion, layout), design-carvision.md (product context, admin).

---

## 0. WORKFLOW (in order, do not skip)
1. **Read first, ask second.** Read the token file (`globals.css` / Tailwind theme), `src/components`, and `docs/design-references/` if present. Ask me ONLY what is missing and cannot be inferred. Never ask what is already defined.
2. **Plan.** For a new screen write a short plan: layout, components to reuse, new components, states. Wait for approval if the screen is large.
3. **Tokens before components.** Missing token? Add it to the token file first. Never hardcode colors, shadows, radii, spacing, durations in components.
4. **Reuse.** Never create a second button, card, input, modal, badge. Add a variant instead.
5. **Build.**
6. **Verify in the browser (mandatory).** Open `localhost:3000/<locale>`, screenshot at 375 and 1440 (plus 768 for layout-heavy pages), light AND dark. Compare with these rules, fix every flaw, re-screenshot. Never say "done" without this loop.
7. **Checks.** `tsc --noEmit`, lint, build pass. Problems panel empty.
8. **Report** with final screenshots, the section 6 checklist, and 3 concrete improvement ideas.

---

## 1. DESIGN TOKENS (single source of truth)
CSS variables exposed via the Tailwind theme. Use only these values.

### Spacing (4px base)
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128. Section padding: desktop 80-128, mobile 48-64. Inside a group 8-16, between groups 32+. Gap between groups must be clearly larger than gap inside groups.

### Radius
sm 8 (chips, small inputs), md 12 (buttons, inputs), lg 16 (cards), xl 24 (panels, modals), full (avatars, pills). Nested radius = outer minus padding. One radius family per screen.

### Elevation (layered, tinted, never pure black)
Each shadow = tight contact layer + wide soft layer, tinted with the neutral hue.
- e1: `0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)`
- e2: `0 2px 4px rgba(16,24,40,.04), 0 4px 12px rgba(16,24,40,.06)`
- e3: `0 4px 8px rgba(16,24,40,.04), 0 12px 32px rgba(16,24,40,.08)`
- e4: `0 8px 16px rgba(16,24,40,.06), 0 24px 56px rgba(16,24,40,.12)`
- Accent glow (primary CTA only): `0 8px 24px -6px <accent @ 40%>`
- Top highlight: light `inset 0 1px 0 rgba(255,255,255,.6)`, dark `inset 0 1px 0 rgba(255,255,255,.05)`
- Dark mode: lower shadow opacity, build depth mostly with surface lightness steps (+4-6% per level).
- Levels: page lowest, cards e1/e2, dropdowns/popovers e3, modals e4. Hover raises exactly one level.

### Color
- Neutral scale 11 steps (50-950) tinted toward brand hue. No pure gray, no pure #000/#FFF on large surfaces.
- ONE accent with full scale. Semantic colors (success, warning, danger, info) each with soft bg + strong text.
- Proportion per screen: ~60% neutral surfaces, ~30% secondary surfaces/text, ~10% accent. Accent marks the main action and active states only.
- Light: app bg off-white, card white, muted neutral-50/100. Dark: bg neutral-950, card neutral-900, raised neutral-800. Never pure black.
- Separation = surface tone + shadow + space, not lines.
- Gradients: very low contrast, same hue only, only on hero, primary buttons, stat cards. No rainbow, neon, purple-to-pink.
- Ship light AND dark with a toggle (system default, persisted, no flash on load).
- Contrast WCAG AA (4.5:1 body, 3:1 large text/UI). Check text on images and tinted badges.

### Typography
- One premium sans (Inter, Geist, Manrope, Plus Jakarta Sans), optional display font for headings. Self-host, `font-display: swap`. Must support Cyrillic and Latin Extended.
- Scale (fluid `clamp`): 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72.
- Body 16 (14 in dense dashboards), line-height 1.5-1.65. Headings line-height 1.1-1.3, letter-spacing -0.01 to -0.03em.
- Weights: 400 body, 500 labels, 600 headings, 700 only big display. Max 3 weights and max 3 text sizes per card.
- `font-variant-numeric: tabular-nums` for stats, tables, prices.
- Paragraph width 60-75 characters. Never center long paragraphs.

### Motion tokens
Durations: micro 120-200ms, UI 200-300ms, section 400-600ms. Easing `cubic-bezier(.22,1,.36,1)` for entrances, ease-in-out for movement. Springs for drawers/modals (stiffness ~300, damping ~30).

---

## 2. BORDERLESS PHILOSOPHY
- Default: NO borders on cards, panels, inputs, buttons, tables, nav.
- Use surface tone, elevation, spacing instead.
- Only exception: barely visible ring `inset 0 0 0 1px rgba(0,0,0,.04)` where contrast would otherwise fail (white card on white bg).
- Dividers: avoid. Use space or background bands. If unavoidable: 1px at 4-6% opacity.
- Focus-visible: soft 3-4px accent ring at ~25% opacity. Accessibility is mandatory, this is not a "border".
- Inputs: filled (neutral-100), no border, ring on focus, subtle raise.
- Tables: no grid lines, row hover tone, row height 52-60.

---

## 3. VISUAL HIERARCHY & COMPOSITION (what makes it look expensive)
- ONE focal point and ONE primary action per screen. Everything else is quieter.
- Consistent grid. Left edges align. Equal gaps between equal things.
- Generous whitespace. When unsure, add space, not decoration.
- Rank info with size, weight, color together: title > key value > supporting text > metadata.
- Group by proximity and tone, not boxes. Cards are for distinct objects only, not for wrapping everything.
- Vary rhythm: bento grids, asymmetric splits, large media blocks, oversized type moments. No long stacks of identical cards.
- Imagery carries the product: large, high-quality visuals with clean overlays beat decoration.
- Remove before adding. If an element has no job, delete it.

---

## 4. NO-GO LIST (the AI-template look)
Centered hero with gradient blob, three identical icon cards as the only layout, stock gradients, heavy glassmorphism, random decorative shapes, gradient text everywhere, glow on everything, emojis, mixed icon sets, "Lorem ipsum", "John Doe", "Feature 1/2/3", default browser select/date/scroll look.

---

## 5. KNOWN MISTAKES (append when the agent repeats an error)
Format: `- Mistake: <what>. Instead: <what to do>.`
- (empty)

---

## 6. DEFINITION OF DONE
- [ ] Tokens only, zero hardcoded values
- [ ] No visible borders, no emojis
- [ ] One focal point and one primary action
- [ ] Depth consistent (layered shadows, surface tones)
- [ ] Light and dark both polished (screenshots taken)
- [ ] All states exist: hover, focus, disabled, loading, error, empty
- [ ] Screenshots verified at 375 and 1440 (768 if layout-heavy)
- [ ] Longest locale string tested, no overflow
- [ ] Real images and realistic content
- [ ] `tsc --noEmit`, lint, build pass; Problems panel empty
- [ ] Looks custom-designed, not templated. If not, iterate again.
- [ ] Reported 3-5 concrete improvements for the next iteration