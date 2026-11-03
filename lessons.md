# Lessons Learned

## Rule: Logical CSS is Mandatory
- **Mistake**: Using physical direction classes (`left-`, `right-`, `pl-`, `pr-`, `ml-`, `mr-`, `text-left`).
- **Rule**: Always use logical classes (`start-`, `end-`, `ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`). Run `npm run check-direction` on every change.

## Rule: Verify Real Browser Rendering
- **Mistake**: Assuming copied CSS matches without testing typography and animations in the browser.
- **Rule**: Include proper Google Fonts and check actual rendered DOM.

## Rule: Avoid Broken Opacity Overlays with Undefined Variables in Tailwind
- **Mistake**: Using `bg-gradient-to-b from-background via-background/60 to-background` when `background` is a CSS variable without alpha injection in Tailwind v3, creating a 100% solid black layer that completely hid the background image.
- **Rule**: Explicitly define alpha overlays with `rgba(...)` or radial gradients, define base CSS variables in `:root`, and verify image visibility under dark overlays.

## Rule: Never Place Imperative DOM-Animation Classes on React Re-rendering State Wrappers
- **Mistake**: Placing `.reveal` directly on stateful interactive cards (like FAQ accordion items or Pricing cards). When clicked, React re-rendered the JSX and stripped away `.in` added by IntersectionObserver, instantly resetting the card to `opacity: 0` and making it vanish!
- **Rule**: Put reveal animations on outer parent list containers, and use `data-revealed="true"` with CSS `.reveal[data-revealed="true"] { opacity: 1 !important; }` so React re-rendering never removes the visibility state.

## Rule: Negative Margins Under Positioned Hero Artworks Cause Text Clipping
- **Mistake**: Using negative top margin (`-mt-3`) on typography without `position: relative` and `z-index` under a positioned (`relative`) image container. The image container and its bottom overlays painted on top of the text, slicing the letters in half.
- **Rule**: Give content areas below hero images positive top spacing (`mt-2`), explicit stacking (`relative z-20`), and blend the image ground floor smoothly into the background tone (`#07080B`) to eliminate any harsh cut boundaries.

## Rule: Next.js App Router with i18n Root Layout Requires not-found.tsx Inside [locale]
- **Mistake**: Creating `src/app/not-found.tsx` when the root layout lives at `src/app/[locale]/layout.tsx`. Next.js throws "not-found.tsx doesn't have a root layout. To fix this error, make sure every page has a root layout."
- **Rule**: When using localized App Router layouts (`src/app/[locale]/layout.tsx`), keep custom 404 pages at `src/app/[locale]/not-found.tsx` so they inherit the root layout. Also ensure static PWA assets (like `/icons/icon-192.png`) exist in `public/` so missing asset requests do not trigger unintended 404 layout lookups.

## Rule: Never Run 'next build' While 'next dev' is Actively Running
- **Mistake**: Running `npm run build` while a dev server process was actively serving pages. Next.js production build overwrote `.next/server/webpack-runtime.js` and wiped dev vendor chunks, causing `Cannot find module './vendor-chunks/...'` on route navigation.
- **Rule**: Never run `next build` concurrently with `next dev`. If a production build is executed, terminate conflicting dev processes and clear `.next` cache before restarting `npm run dev`.

## Rule: Always Verify Type and Hook Imports After Refactoring
- **Mistake**: Modifying component imports and accidentally omitting imported context hooks (`useVeloceStore`) or types (`type VeloceProduct`).
- **Rule**: Run `npx tsc --noEmit` immediately after modifying any component imports to guarantee zero type errors before declaring completion.

## Rule: Eliminate Mock Fallbacks at the State Initialization Level
- **Mistake**: Fetching data from Supabase inside `useEffect` while still leaving the component's `useState` initialized with a static mock array (`useState(STATIC_DATA)`), which flashed fake data on first mount or kept fake items when offline.
- **Rule**: Initialize state with an empty array `useState<T[]>([])` and an explicit `loading` state (`useState(true)`), rendering skeleton loaders while live data loads from the API.

