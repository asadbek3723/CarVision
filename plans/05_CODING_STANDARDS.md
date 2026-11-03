# 05_CODING_STANDARDS.md

**Project:** CarVision
**Document type:** Coding standards, conventions, and anti-patterns
**Audience:** AI coding agents (Gemini in Antigravity) and human engineers
**Status:** Normative. Every pull request is judged against this document.
**Read together with:** `04_ARCHITECTURE.md` (structure and boundaries)

Keywords: **MUST** / **MUST NOT** are enforced (by lint, types, tests or review). **SHOULD** is the default unless there is a written reason.

---

## 1. Philosophy

1. **Boring, explicit, small.** Prefer the obvious solution. Cleverness is a defect.
2. **Types are documentation and the first test.** If a bug can be made impossible by a type, make it impossible.
3. **One reason to change.** Each file, function and component does one thing.
4. **Pure core, thin shell.** Business rules are pure functions in `domain/`. I/O lives at the edges.
5. **Fail loudly, early, and in one place.** Validate at the boundary, then trust the types inside.
6. **Delete code.** The best code is the code not written. No dead code, no speculative abstractions, no "might need later".
7. **Readable beats short.** Names explain intent. A reader should understand a function without opening another file.

"Trash code" means: duplicated logic, giant files, `any`, hidden side effects, unclear names, copy-pasted components, unvalidated input, swallowed errors, magic numbers, commented-out code, and TODOs without owners. None of it is allowed to merge.

---

## 2. Enforced tooling (non-negotiable configuration)

### 2.1 `tsconfig.json` (must be enabled)
`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `forceConsistentCasingInFileNames`, `isolatedModules`.

### 2.2 ESLint (errors, not warnings)
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-non-null-assertion`
- `@typescript-eslint/no-floating-promises`, `no-misused-promises`
- `@typescript-eslint/consistent-type-imports`
- `@typescript-eslint/no-unnecessary-condition`
- `no-restricted-syntax` for `enum`, `namespace`
- `no-console` (use the logger)
- `eqeqeq`, `no-var`, `prefer-const`
- `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`
- `jsx-a11y/*` (recommended + strict)
- `boundaries` or `dependency-cruiser`: layer and feature boundaries from `04_ARCHITECTURE.md`, section 6
- `max-lines`: 250 per file (excluding generated types)
- `max-lines-per-function`: 50
- `complexity`: 10
- `max-params`: 3 (use an object parameter beyond that)
- `no-restricted-imports`: block deep imports into another feature's internals; block `@/server/**` in client code

### 2.3 Other
- Prettier for formatting (no style debates).
- Husky + lint-staged: lint and format on commit.
- Custom CI script `scripts/check-physical-direction.mjs` fails the build if source contains Tailwind/CSS physical direction utilities (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, `border-l`, `border-r`, `rounded-l`, `rounded-r`). Use logical equivalents (see section 11).
- One command runs everything: `pnpm check` = lint + typecheck + unit tests. It MUST pass before any task is considered finished.

---

## 3. Files, modules and structure

### 3.1 Rules
- Feature code lives in `src/features/<feature>/`. Shared pure logic in `src/domain/`. See `04_ARCHITECTURE.md`, section 5.
- **One exported concept per file** where practical. File name = main export, in `kebab-case.ts`. React components in `PascalCase.tsx` files named after the component.
- A feature exposes a public API through `index.ts`. Other features import only from it.
- No circular imports. No "utils" dumping grounds: `lib/` contains only small, pure, generic helpers with tests.
- No barrel files (`index.ts` re-exporting everything) except a feature's public API.
- Default exports are forbidden, except where Next.js requires them (`page.tsx`, `layout.tsx`, `route.ts` handlers, `error.tsx`, config files).
- File size limit 250 lines, function 50 lines, component 150 lines. If you exceed it, split by responsibility, not arbitrarily.

### 3.2 Feature layout
```
features/generation/
├─ components/      # React UI for this feature
├─ hooks/           # client hooks (useGeneration, ...)
├─ server/
│  ├─ service.ts    # use-cases: orchestrates domain + repository + providers
│  └─ repository.ts # the ONLY place that talks to Supabase for this feature
├─ domain/          # pure rules and calculations
├─ schemas.ts       # Zod schemas (single source of truth for input shapes)
├─ types.ts         # types derived from schemas / domain
└─ index.ts         # public API
```

---

## 4. Naming

| Thing | Convention | Example |
|---|---|---|
| Files (non-component) | `kebab-case.ts` | `credit-ledger.ts` |
| Components | `PascalCase` | `PriceTicker.tsx` |
| Functions | `camelCase`, verb first | `calculateDeposit`, `reserveCredits` |
| Booleans | `is/has/can/should` prefix | `isEligible`, `hasWatermark` |
| Types / interfaces | `PascalCase`, no `I` prefix | `GenerationRequest` |
| Constants | `SCREAMING_SNAKE_CASE` only for true module-level constants | `MAX_UPLOAD_BYTES` |
| Zod schemas | `<name>Schema` | `createGenerationSchema` |
| DB tables / columns | `snake_case`, plural tables | `credit_ledger`, `created_at` |
| Env variables | `SCREAMING_SNAKE_CASE`; client-safe ones `NEXT_PUBLIC_` | |
| Event handlers | `handle<Event>` in components, `on<Event>` in props | `handleSubmit`, `onSubmit` |
| i18n keys | `feature.section.element` lowercase dotted | `studio.price.total` |

Names MUST be descriptive. Forbidden names: `data`, `info`, `temp`, `obj`, `item2`, `handleStuff`, `doIt`, single letters (except `i` in a tiny loop or `e` in a short event callback).

---

## 5. TypeScript rules

### 5.1 No `any`, no assertions to silence the compiler
```ts
// DON'T
const body = (await req.json()) as CreateGenerationInput;
const first = items[0]!;
// @ts-ignore

// DO
const body = createGenerationSchema.parse(await req.json()); // validate unknown input
const first = items[0];
if (first === undefined) return fail("NOT_FOUND");
```
Use `unknown` for untrusted data and narrow it with Zod or type guards. `as` is allowed only for `as const` and in rare, commented, test-only cases. `@ts-ignore` is forbidden; `@ts-expect-error` requires a comment with the reason and is allowed only in tests.

### 5.2 Model states with discriminated unions, not flags
```ts
// DON'T
type Generation = { isLoading: boolean; isError: boolean; url?: string; error?: string };

// DO
type Generation =
  | { status: "queued" }
  | { status: "running"; progress: number }
  | { status: "succeeded"; assetUrl: string }
  | { status: "failed"; reason: GenerationFailureReason };
```
Switch over unions MUST be exhaustive (use a `assertNever` helper in the default branch).

### 5.3 No enums
```ts
// DON'T
enum Plan { Pro, Max }

// DO
export const PLAN_CODES = ["FREE_TRIAL", "PRO_800", "MAX_4000", "ULTRA_10000"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];
```

### 5.4 Derive types from one source
Zod schema → `z.infer`. Database types → generated `database.types.ts`. Never hand-write a type that duplicates a schema or table.

### 5.5 Expected failures are values, not exceptions
Use a `Result` type for failures the caller must handle. Throw only for programmer errors and truly unexpected conditions.
```ts
export type Result<T, E extends AppError = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

### 5.6 Other rules
- Prefer `readonly` and immutable updates. Do not mutate function arguments.
- Prefer `type` for unions/aliases and `interface` for object contracts that are implemented (e.g. providers).
- Explicit return types on exported functions. Inferred types inside.
- No optional-everything types. If a field is required in practice, it is required in the type.
- Avoid boolean parameters. Use a named options object or two functions.

---

## 6. React and Next.js rules

### 6.1 Server first
- Components are **Server Components by default**. Add `"use client"` only for interactivity (state, effects, browser APIs) and push it to the smallest leaf possible.
- Fetch data in Server Components or route handlers. Do not fetch in `useEffect`.
- Mutations from the UI use Server Actions or `/api/v1` handlers through a typed client. Validate input in both cases.

### 6.2 Components
- A component renders; it does not contain business rules. Rules come from `domain/`.
- Props are explicit, typed and minimal. No spreading unknown props onto DOM elements. Do not pass the whole entity when two fields are needed.
- Prefer composition over configuration flags. If a component has more than 5 props or 2 boolean variants, split it or use `cva` variants.
- No inline anonymous components inside render. No components defined inside components.
- Lists need stable keys (ids), never array indexes for dynamic lists.
- Every interactive element is a real `button`/`a`/`input`, with an accessible name.

### 6.3 Effects and state
```tsx
// DON'T: derived state in an effect
const [total, setTotal] = useState(0);
useEffect(() => { setTotal(items.reduce((s, i) => s + i.priceMinor, 0)); }, [items]);

// DO: compute during render (or memoize only if measured as slow)
const total = sumPriceMinor(items);
```
- `useEffect` is for synchronizing with external systems (subscriptions, DOM APIs), nothing else. Always clean up.
- State lives at the lowest common ancestor. Global state (Zustand) only for the studio session. Never put server data into Zustand; use server components or TanStack Query.
- Do not use `useMemo`/`useCallback` by default. Add them only where profiling shows a problem or a stable identity is required, with a comment.

### 6.4 Next.js specifics
- `app/**` files are thin. A `page.tsx` parses params, calls a feature, renders. No business logic.
- Route handlers use the shared `withApi` wrapper (auth, Zod validation, rate limit, error mapping, `requestId`). No handler is written without it.
- Heavy client libraries (three.js, video encoding) are imported dynamically and only on the routes that need them.
- Use `next/image` with explicit dimensions for catalog and output images. Reserve space to prevent layout shift.
- Metadata and locale are set per route; never hard-code language in `<html>`.

---

## 7. Data access and Supabase

- Only `repository.ts` files and `src/server/supabase/**` import Supabase clients. Components, services and route handlers MUST NOT.
- Use generated types (`supabase gen types`). Never write `any` rows.
- **No `select("*")`.** Select the columns you need. This also prevents leaking private columns.
- RLS is on for every table and bucket. Application code is not a substitute. The service-role client is used only when RLS must be bypassed on purpose and each use has a one-line `// service role: <reason>` comment.
- Multi-step writes that must be atomic (credits, referrals, booking unlock) are **Postgres functions** called via RPC. Never emulate transactions with several client calls.
- Schema changes only via new migration files. Never edit an applied migration. Every table change ships with its RLS policy and an SQL test.
- Queries are paginated. No unbounded list queries. Add indexes for every foreign key and every filter used in a policy.

```ts
// DON'T
const { data } = await supabase.from("shops").select("*");

// DO
const { data, error } = await supabase
  .from("marketplace_shop_public")
  .select("id, masked_title, district, rating")
  .range(from, to);
if (error) return fail(toAppError(error));
```

---

## 8. Validation and error handling

### 8.1 Validate at every boundary
Route handlers, server actions, webhooks, environment variables, and form inputs all use Zod. Reject unknown keys (`.strict()`). Inside the boundary, trust the types.

### 8.2 One error type
```ts
export type AppErrorCode =
  | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION"
  | "INSUFFICIENT_CREDITS" | "RATE_LIMITED" | "PROVIDER_FAILED" | "CONFLICT" | "INTERNAL";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    public readonly messageKey: string,       // i18n key shown to the user
    public readonly details?: Record<string, unknown>,
  ) { super(code); }
}
```
- The error mapper in `server/http` converts `AppError` to an HTTP status and a safe JSON body `{ error: { code, messageKey } }`. Unknown errors become `INTERNAL` and are logged with Sentry; no stack traces or database messages reach the client.
- User-facing error text always comes from i18n keys. Never show raw exception messages.

### 8.3 Rules
- Never swallow errors: no empty `catch`, no `catch (e) { console.log(e) }`.
- Catch only where you can handle or translate the error. Otherwise let it propagate to the boundary.
- Every error path in the UI has a designed state (message, retry, recovery action). No blank screens, no infinite spinners.
- Log with the structured logger at the boundary, once. Do not log and rethrow the same error at every layer.

---

## 9. Money, time, identifiers

- **Money is an integer in minor units (cents) of USD.** Never `number` with decimals, never floats. Name fields with a unit suffix: `priceMinor`, `depositMinor`. Provider costs use micro-dollars (`costMicroUsd`) because they are fractions of a cent.
- Use one `Money` helper in `domain/money.ts` for add, multiply by percentage (with explicit rounding mode), and formatting.
- Display currency conversion is presentation only (see `04_ARCHITECTURE.md`, section 13).
- Time is stored as `timestamptz` in UTC. Pure functions receive `now: Date` as a parameter; no hidden `new Date()` inside domain logic.
- Identifiers are UUIDs generated by the database or `crypto.randomUUID()`. No auto-increment ids exposed to clients.
- Percentages and plan constants come from `plans` / `system_settings`, not from literals in code.

```ts
// DON'T
const deposit = total * 0.03;

// DO
const deposit = percentageOf(total, DEPOSIT_BASIS_POINTS, "half-up"); // basis points from settings
```

---

## 10. Async and concurrency

- Every promise is awaited or explicitly handled. No floating promises.
- Independent awaits run in parallel with `Promise.all`; dependent ones run sequentially. Do not `await` in a loop without reason.
- Long operations are cancellable (`AbortController`) and have timeouts.
- **Every operation that charges credits or creates a record from a user click is idempotent** (idempotency key, unique constraint). Retrying must never double charge.
- Webhooks are idempotent: processing the same event twice yields the same result.
- No module-level mutable state on the server (serverless instances are not shared or persistent).

---

## 11. Styling, design tokens and responsive rules

Design is defined in `02_DESIGN_SYSTEM.md`. Code rules:

- Use **tokens only** (CSS variables / Tailwind theme). No hard-coded hex colors, font sizes, shadows or spacing outside `styles/tokens.css` and the Tailwind config.
- Variants via `cva`. No long conditional class strings. Merge classes with a single `cn()` helper.
- **Logical properties only** for RTL: `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`, `border-s`/`border-e`, `rounded-s`/`rounded-e`. The CI check enforces this.
- **Zero clipping law:** no fixed widths or heights on text containers; use `min-w-0`, `flex-wrap` or horizontal scrolling with snap, `clamp()` for type, and `max-w-full`. Test every screen with the longest translation (Russian/Uzbek) and Arabic.
- Use `dvh`/`svh` units for full-screen layouts, never `vh`. Respect safe-area insets (`env(safe-area-inset-*)`).
- Minimum touch target 44×44 px. No hover-only interactions (tablets and phones have no hover).
- Numbers that change (price ticker, percentages) use tabular numerals so layout does not shift.
- Animations: transform/opacity only, 150–400 ms, and disabled under `prefers-reduced-motion`.
- Layout adapts through the breakpoints and orientation rules in `02_DESIGN_SYSTEM.md`. Landscape phone is a first-class layout, not an afterthought.

---

## 12. Internationalization in code

- No literal user-facing strings in components, errors, toasts, `aria-label`s, or metadata. Use `useTranslations` / `getTranslations`.
- Keys are stable and semantic, not the English sentence. Plurals and variables use ICU syntax.
- Never concatenate translated fragments to make a sentence. Use one message with placeholders.
- Dates, numbers, and currency use `Intl` via helpers in `src/i18n/format.ts`.
- Every new key is added to **all** locale files in the same pull request (a CI script fails if a locale is missing a key that exists in `en`).
- Arabic: verify mirrored layout, numerals, and that icons with direction (arrows, chevrons) flip where meaning requires it.

---

## 13. Accessibility

- Every interactive element is keyboard reachable with a visible focus ring.
- Images have meaningful `alt` text (decorative ones `alt=""`). Icon-only buttons have `aria-label` (translated).
- Color is never the only signal. Contrast meets WCAG AA on the dark theme.
- Modals trap focus and close on Escape. Respect `prefers-reduced-motion`.
- The camera guide gives non-visual feedback too (haptics, short text), not color alone.

---

## 14. Security rules in code

- Never trust client data: prices, totals, deposit amounts, plan, role, shop id and credit costs are computed or read server-side from the database.
- Authorization on every handler: authenticate, then check that the resource belongs to the caller (`shop_id`, `user_id`) even though RLS also protects it.
- No secrets in code, logs, error messages, or client bundles. Env values are read only through the validated `env` modules.
- Sanitize and validate files by content (magic bytes), size, and dimensions. Strip EXIF.
- Parameterized queries only; never build SQL strings from input.
- Webhooks verify authenticity, then idempotency.
- Rate-limit authentication, upload, generation and receipt endpoints.
- Do not log personal data (phones, receipts, addresses).

---

## 15. Testing rules

- Test behavior, not implementation. Name tests as sentences: `it("refunds credits when the provider times out")`.
- **Domain logic has near-complete unit coverage**: pricing, anchor savings, deposit calculation, credit math, angle/category validation, fitment, referral thresholds.
- Every Postgres function and every RLS policy has SQL tests for allowed and denied cases (all three roles).
- Concurrency test for credits: N parallel reservations against a balance of M never go negative and never double charge.
- The AI provider and vision provider are replaced by deterministic fakes. Tests never call paid APIs.
- Use Arrange–Act–Assert. One reason to fail per test. No snapshot tests for logic; snapshots only for stable serialized output.
- A bug fix starts with a failing test that reproduces it.
- E2E covers critical paths only (see `04_ARCHITECTURE.md`, section 19). Keep them few and stable.

---

## 16. Comments and documentation

- Comments explain **why**, never what. If a comment explains what the code does, rename or restructure the code instead.
- No commented-out code. Git has history.
- Public domain functions have a short TSDoc: purpose, parameters with units, edge cases.
- `TODO` is allowed only as `TODO(<issue-id>): <what and why>`. A TODO without an issue id fails review.
- Non-obvious decisions go into `04_ARCHITECTURE.md` ADRs, not into scattered comments.

---

## 17. Dependencies

Before adding any package, all of these MUST be true:
1. The task cannot be solved cleanly with the standard library, the existing stack, or ~20 lines of code.
2. The package is actively maintained, widely used, typed, and has a compatible license.
3. Bundle impact is acceptable for client code (check size; prefer tree-shakeable).
4. It is recorded in the pull request description with the reason.

Rules: pin exact versions; commit the lockfile; do not install packages "just in case"; remove unused packages immediately; do not add a second library for something an existing one already does (one date approach, one validation library, one state approach). The agent MUST NOT invent a package name or API: if unsure, read the installed package's types or documentation first.

---

## 18. Git and pull requests

- Small, focused commits following Conventional Commits: `feat(generation): reserve credits atomically`, `fix(i18n): mirror arrows in RTL`, `chore: ...`, `test: ...`, `docs: ...`.
- One concern per pull request. No drive-by refactors mixed with features.
- Branch names: `feat/<scope>-<short>`, `fix/<scope>-<short>`.
- PR description: what and why, how it was verified, screenshots for UI (portrait, landscape, RTL), migration notes.
- No force-push to `main`. `main` is always deployable.

---

## 19. Rules specifically for the AI coding agent

These apply to Gemini in Antigravity (and any other agent).

### 19.1 Before writing code
1. Read `GEMINI.md`, then the spec files relevant to the task (`01`–`15`). If the task touches a flow, read the flow's section completely.
2. Write a short plan: files to create/change, data model changes, tests to add. Keep it in the task output.
3. If a business rule, security rule, or requirement is ambiguous or missing, **do not guess**. Write the question in `docs/OPEN_QUESTIONS.md`, implement only the unambiguous part, and say so in the summary.

### 19.2 While writing code
- Implement the **smallest vertical slice** that satisfies the task. No extra features.
- Follow the structure in section 3 and the boundaries in `04_ARCHITECTURE.md`. Match existing patterns before inventing new ones.
- Do not install packages unless section 17 is satisfied. Do not upgrade versions.
- Do not modify unrelated files. Do not reformat files you are not changing.
- Do not use placeholder data, mock values, or hard-coded demo content in production code paths. Seed data goes in `supabase/seed.sql`.
- Never silence a failing check (`eslint-disable`, `@ts-ignore`, weakening a test or a rule) to make it pass. Fix the cause. If a rule seems wrong, say so in the summary.
- Never edit an applied migration. Never disable RLS. Never use the service role in client code. Never put a secret in the repo.
- Never write "simplified for now", "TODO later", or stub implementations and call the task done.

### 19.3 Before finishing
Run, and fix everything: `pnpm check` (lint, typecheck, unit tests), SQL tests if the database changed, and a production build if routes changed. For UI work, verify portrait phone, landscape phone, tablet, desktop, and Arabic RTL.

### 19.4 Final report format
```
Summary: <what was built, 2–4 sentences>
Files changed: <list>
Verification: <commands run and results; screenshots for UI>
Deviations from spec: <none | list with reason>
Open questions: <none | list, also added to docs/OPEN_QUESTIONS.md>
```

---

## 20. Definition of Done

A task is done only when **all** are true:
- [ ] Behavior matches the spec section it implements
- [ ] `pnpm check` passes with zero warnings
- [ ] New logic in `domain/` has unit tests; new DB objects have SQL tests
- [ ] All inputs validated with Zod; all errors mapped to `AppError` with i18n keys
- [ ] No hard-coded strings, colors, currency, plan constants
- [ ] RTL and all four screen layouts checked, no clipped or overlapping text
- [ ] Loading, empty, error and offline states are designed and implemented
- [ ] No new dependency without justification
- [ ] No `any`, no `@ts-ignore`, no `console.log`, no commented-out code, no orphan TODO
- [ ] Documentation updated if behavior or architecture changed

---

## 21. Anti-pattern catalogue (do not write this)

| Anti-pattern | Why it is rejected | Do this instead |
|---|---|---|
| Business logic inside `page.tsx` or a component | Untestable, duplicated | Move to `domain/` or `service.ts` |
| Supabase call inside a component | Breaks layers, leaks columns | Repository + service |
| `useEffect` to fetch or to derive state | Waterfalls, bugs | Server Component / TanStack Query / compute in render |
| Giant component with 10 booleans | Unreadable, untestable | Split + `cva` variants |
| Copy-pasted component with small changes | Drift | One component with a variant |
| `catch {}` or log-and-continue | Hidden failures | Handle, translate, or propagate |
| Float money (`19.99 * qty`) | Rounding bugs | Integer minor units |
| `UPDATE ... SET credits = credits - 1` from app code | Race conditions | RPC with row lock + ledger |
| Trusting a price/total sent by the client | Fraud | Recompute server-side |
| Masking shop data only in the UI | Data leak via network tab | DB view/RPC without private columns |
| Magic numbers (`0.03`, `800`, `12000`) | Unmaintainable | Named setting from DB/config |
| Hard-coded colors and pixel values | Breaks the design system | Tokens |
| `left`/`right`/`ml-` in styles | Breaks Arabic | Logical properties |
| English strings in JSX | Breaks i18n | Message keys |
| Fixed width on text containers | Clipping in other languages | Fluid layout, scroll-snap rows |
| Deep import into another feature | Hidden coupling | Public `index.ts` |
| `utils.ts` with 40 unrelated functions | Dumping ground | Named modules in `domain/` or `lib/` |
| Mocked or fake data in production code | Ships fake behavior | Seed data and fakes in tests only |
| Installing a library for one function | Bloat, risk | Write the 10 lines |
| Boolean flag parameters (`render(true, false)`) | Unreadable calls | Options object or two functions |
| Synchronous waiting for AI inside a request | Timeouts, dead UX | Queue + webhook + Realtime |

---

## 22. Reference slice (the pattern to copy)

Create a generation: route handler → service → domain → repository. This shows the expected shape and size of real code.

```ts
// src/features/generation/schemas.ts
import { z } from "zod";

export const createGenerationSchema = z
  .object({
    sessionId: z.string().uuid(),
    angleId: z.number().int().min(1).max(8),
    partIds: z.array(z.string().uuid()).min(1).max(8),
    nightMode: z.boolean().default(false),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;
```

```ts
// src/features/generation/domain/validate-selection.ts  (pure, no I/O)
import type { PartCategory } from "@/domain/parts";
import { VALID_ANGLES_BY_CATEGORY } from "@/domain/angles";
import { ok, fail, type Result } from "@/lib/result";

export function validateSelection(
  angleId: number,
  categories: readonly PartCategory[],
): Result<true> {
  const incompatible = categories.find(
    (category) => !VALID_ANGLES_BY_CATEGORY[category].includes(angleId),
  );
  return incompatible === undefined
    ? ok(true)
    : fail("VALIDATION", "studio.errors.partNotVisibleFromAngle", { incompatible });
}
```

```ts
// src/features/generation/server/service.ts
import "server-only";
import { validateSelection } from "../domain/validate-selection";
import * as generations from "./repository";
import { creditsRepository } from "@/features/billing";
import { imageEditProvider } from "@/server/providers/ai";

export async function createGeneration(
  user: AuthUser,
  input: CreateGenerationInput,
): Promise<Result<GenerationRef>> {
  const parts = await generations.findPartsForUser(user, input.partIds);
  if (!parts.ok) return parts;

  const selection = validateSelection(input.angleId, parts.value.map((part) => part.category));
  if (!selection.ok) return selection;

  const reserved = await creditsRepository.reserve({
    accountId: user.accountId,
    amount: 1,
    idempotencyKey: input.idempotencyKey,
  });
  if (!reserved.ok) return reserved; // INSUFFICIENT_CREDITS is returned as a value

  const job = await imageEditProvider.submit(toImageEditJob(input, parts.value));
  return generations.createQueued({ user, input, providerRef: job });
}
```

```ts
// src/app/api/v1/generations/route.ts  (thin adapter)
import { withApi } from "@/server/http/with-api";
import { createGeneration, createGenerationSchema } from "@/features/generation";

export const POST = withApi(
  { auth: "user", schema: createGenerationSchema, rateLimit: "generation" },
  async ({ input, user }) => createGeneration(user, input), // wrapper maps Result -> HTTP
);
```

```tsx
// src/features/studio/components/PriceTicker.tsx  (client leaf, tokens, i18n, logical props)
"use client";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/i18n/format";

type PriceTickerProps = { readonly totalMinor: number; readonly currency: DisplayCurrency };

export function PriceTicker({ totalMinor, currency }: PriceTickerProps) {
  const t = useTranslations("studio.price");
  return (
    <div className="ms-auto flex min-w-0 items-baseline gap-2 rounded-xl bg-glass px-4 py-2">
      <span className="text-secondary text-sm">{t("total")}</span>
      <span className="font-tabular text-lg text-primary">{formatMoney(totalMinor, currency)}</span>
    </div>
  );
}
```

Notice what is **absent**: no `any`, no assertions, no Supabase in the component, no literal strings, no hex colors, no `ml-`, no floating money, no business rule in the route, no mutable global state.

---

## 23. Review checklist (human or agent reviewer)

Reject the change if any answer is "no":
1. Does each function and file do one thing and fit the size limits?
2. Are all boundaries validated and all errors typed and translated?
3. Is every database write that must be atomic done in a Postgres function?
4. Is money integer-based and every constant sourced from settings?
5. Are layers and feature boundaries respected?
6. Would a new engineer understand the code without asking questions?
7. Are there tests for the rules that matter, and do they fail when the rule is broken?
8. Does the UI hold up in portrait, landscape, RTL, and with the longest translation?
