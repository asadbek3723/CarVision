# 04_ARCHITECTURE.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace
**Document type:** System architecture, stack decisions, boundaries, data flows
**Audience:** AI coding agents (Gemini in Antigravity) and human engineers
**Status:** Normative. If code disagrees with this document, the code is wrong, or this document must be changed first through an explicit ADR (section 20).
**Read together with:** `05_CODING_STANDARDS.md` (how to write code), `06_DATABASE_AND_RLS.md` (schema), `07_AI_PIPELINE.md` (AI details)

---

## 1. Purpose

This document answers four questions for anyone writing code:

1. What are the parts of the system and what is each one responsible for?
2. Which technology is used for what, and what is forbidden?
3. How does data move through the system in the critical flows?
4. Where are the boundaries that code must never cross?

Rules use the words **MUST**, **MUST NOT**, **SHOULD**. MUST and MUST NOT are not negotiable.

---

## 2. Product constraints that drive the architecture

| Constraint | Architectural consequence |
|---|---|
| Used on a tablet handed to a customer in a workshop; also on phones and desktop | One responsive PWA, no native app in v1 |
| Workshops often have weak internet | Client-side image compression, queue-based AI jobs, progressive image loading, no long blocking requests |
| Uzbekistan first; clients also in Dubai, Kyrgyzstan, Turkey | Full i18n from day one, RTL support (Arabic), multi-currency display |
| Billing is manual (admin assigns plans after receiving payment) | No payment-gateway code in v1. Plans and credits are data, changed only by admin actions with an audit trail |
| AI cost is roughly 1 cent per image; margins are thin | Credit accounting must be exact, atomic, idempotent and refundable |
| Shop contacts are hidden from B2C users until a deposit is verified | Masking MUST be enforced in the database/API layer, never only in the UI |
| Code is written mostly by an AI agent | Small modules, strict types, strong conventions, automated checks that fail loudly |

---

## 3. Technology stack

Versions: use the latest **stable** release at project start, pin exact versions in `package.json`, commit the lockfile. Do not upgrade major versions without an ADR. Before installing any package, verify it is maintained and actually needed (see `05_CODING_STANDARDS.md`, section 17).

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript, `strict` | No JavaScript source files |
| Runtime | Node.js LTS | |
| Package manager | pnpm | |
| Framework | Next.js (App Router) | Frontend, route handlers, server actions, admin: one deployable |
| Styling | Tailwind CSS + design tokens | Tokens defined in `02_DESIGN_SYSTEM.md` |
| UI primitives | shadcn/ui (Radix based) | Copied into `src/components/ui`, restyled to tokens |
| Variants | class-variance-authority (cva) | |
| Animation | Framer Motion | Respect `prefers-reduced-motion` |
| Validation | Zod | Every boundary: forms, route handlers, webhooks, env |
| Server state | React Server Components for reads; TanStack Query for interactive client data | |
| Client state | Zustand (studio session only) | |
| Database | Supabase Postgres | RLS enabled on every table |
| Auth | Supabase Auth (+ TOTP MFA for admin) | |
| Storage | Supabase Storage (private buckets, signed URLs) | |
| Realtime | Supabase Realtime | Generation status, QR camera bridge |
| AI provider | Fal.ai via JS SDK, queue + webhook | Behind a provider interface (section 11). Exact models decided by the spike, see `07_AI_PIPELINE.md` |
| Vision (car recognition, receipt check) | A cheap vision LLM API call | No self-hosted GPU models |
| 3D overlay | three.js via react-three-fiber | Loaded only on the camera route |
| i18n | next-intl | |
| PWA | Serwist | |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) | |
| Monitoring | Sentry + structured logs (pino) | |
| Unit/integration tests | Vitest | |
| E2E tests | Playwright | |
| Lint/format | ESLint (typescript-eslint strict), Prettier | |
| Hosting | Vercel (app) + Supabase (data) | |
| CI | GitHub Actions | |

**Explicitly NOT used in v1:** a separate Python/FastAPI backend, self-hosted GPU servers, YOLO/SAM models on our own infrastructure, a payment gateway, GraphQL, Redux, a native mobile app, microservices, Kubernetes.

Reason: one language and one deployable means fewer failure modes and cleaner AI-written code. Anything not on the list needs an ADR.

---

## 4. System context

```
                       ┌────────────────────────────────────────────┐
                       │                 CLIENT (PWA)               │
                       │  Phone / Tablet / Desktop / TV browser     │
                       │  - UI (React)  - Camera  - Image compress  │
                       │  - Client-side video render (later phase)  │
                       └───────┬─────────────────────┬──────────────┘
                               │ HTTPS               │ WebSocket (Realtime)
                               ▼                     ▼
┌─────────────────────────────────────────┐   ┌───────────────────────────┐
│          NEXT.JS APP (Vercel)           │   │        SUPABASE           │
│  - Server Components (reads)            │──▶│  Postgres + RLS           │
│  - Route Handlers (/api/v1/*)           │   │  Auth (+ MFA)             │
│  - Server Actions (mutations from UI)   │   │  Storage (private)        │
│  - Webhook receivers                    │◀──│  Realtime                 │
│  - Admin area (/[locale]/admin/*)       │   └───────────────────────────┘
└───────┬──────────────────┬──────────────┘
        │                  │
        ▼                  ▼
┌───────────────┐   ┌──────────────────┐   ┌────────────────────┐
│    Fal.ai     │   │  Vision LLM API  │   │  Telegram Bot API  │
│ queue+webhook │   │ (car id, receipt)│   │ (admin alerts only)│
└───────────────┘   └──────────────────┘   └────────────────────┘
```

Rules:
- The browser talks to **Next.js** (HTTPS) and to **Supabase Realtime** (subscribe only). It never talks to Fal.ai, the vision LLM or Telegram directly.
- Secrets (service role key, Fal key, vision key, Telegram token) exist only on the server.
- Supabase **service role** is used only in server code, only inside `src/server/**`, only where RLS must be bypassed on purpose (webhooks, admin jobs, credit RPCs), and every such call site carries a one-line comment explaining why.

---

## 5. Repository structure

Single Next.js application (not a monorepo in v1).

```
carvision/
├─ docs/                         # 00–15 spec files live here
├─ supabase/
│  ├─ migrations/                # SQL migrations, forward-only, timestamped
│  ├─ seed.sql                   # dev seed (plans, catalog sample)
│  └─ tests/                     # pgTAP / SQL tests for RLS and functions
├─ public/                       # static assets, icons, manifest icons
├─ messages/                     # i18n dictionaries: uz.json, ru.json, en.json, tr.json, ar.json, ky.json, kk.json, tg.json
├─ src/
│  ├─ app/                       # Next.js routes ONLY (thin): layouts, pages, route handlers
│  │  ├─ [locale]/
│  │  │  ├─ (public)/            # landing, language select, login, register
│  │  │  ├─ (app)/               # authenticated app: studio, catalog, bookings, settings
│  │  │  └─ (admin)/admin/       # super admin area
│  │  └─ api/v1/                 # route handlers (thin adapters)
│  ├─ features/                  # vertical slices (the bulk of the code)
│  │  ├─ auth/
│  │  ├─ catalog/
│  │  ├─ inventory/
│  │  ├─ studio/                 # car session, part selection, price ticker, before/after
│  │  ├─ camera/
│  │  ├─ generation/
│  │  ├─ billing/                # plans, credits, manual grants
│  │  ├─ referrals/
│  │  ├─ bookings/               # deposits, receipts, unlock
│  │  ├─ video/
│  │  └─ admin/
│  │     (each feature: components/ hooks/ server/ domain/ schemas.ts types.ts index.ts)
│  ├─ domain/                    # shared pure business logic (no I/O): pricing, credits math, angle rules
│  ├─ server/                    # server-only infrastructure
│  │  ├─ supabase/               # clients (server, admin), generated types
│  │  ├─ providers/              # ai/, vision/, telegram/ behind interfaces
│  │  ├─ http/                   # route helpers: auth guard, error mapper, rate limit
│  │  └─ env.ts                  # validated environment (Zod)
│  ├─ components/                # shared presentational components
│  │  └─ ui/                     # shadcn primitives
│  ├─ lib/                       # small pure utilities (format, id, assert)
│  ├─ i18n/                      # next-intl config, routing, formatters
│  ├─ styles/                    # tokens.css, globals.css
│  └─ types/                     # global ambient types only
├─ tests/e2e/                    # Playwright
├─ GEMINI.md                     # agent rules (copy of 00_AGENT_RULES.md)
└─ package.json, tsconfig.json, eslint.config.mjs, ...
```

Rules:
- `src/app/**` contains routing glue only: parse params, call a feature, render. **No business logic in `app/`.**
- Each feature exposes a public API through its `index.ts`. Other features MUST import only from that `index.ts`, never from its internals.
- `src/server/**` and every `*/server/*` folder start with `import "server-only"`.
- `src/domain/**` and `features/*/domain/**` are **pure TypeScript**: no React, no Supabase, no `fetch`, no `Date.now()` hidden inside (time is passed in). This is where business rules live and where most tests are written.

---

## 6. Layering and dependency rules

```
UI components ─▶ hooks ─▶ (client) api client
                                  │ HTTP / server action
Route handler / Server action ─▶ feature service ─▶ repository ─▶ Supabase
                                        │
                                        └─▶ domain (pure rules)
                                        └─▶ providers (AI, vision, telegram)
```

| Layer | May import | MUST NOT import |
|---|---|---|
| `components`, `features/*/components` | hooks, `lib`, `domain` types, i18n | `server/**`, Supabase clients |
| `features/*/hooks` | api client, `lib`, `domain` | `server/**` |
| `features/*/server/service` | repository, `domain`, providers | React, `next/navigation` UI helpers |
| `features/*/server/repository` | Supabase server client, generated types | services, providers |
| `domain` | `lib` only | everything else |
| `app/**` | feature public APIs, `server/http` | repositories, providers directly |

Enforcement: `eslint-plugin-boundaries` or `dependency-cruiser` in CI. A violation fails the build. Do not disable the rule to make something compile; move the code.

---

## 7. Authentication and authorization

### 7.1 Roles
`profiles.role` is one of `b2c_user`, `b2b_seller`, `super_admin`.
- Sign-up lets the user choose only `b2c_user` or `b2b_seller`.
- `super_admin` is assigned only by a manual SQL statement or the service role. No API, form or server action may set it.

### 7.2 Single login
There is one `/login` and one `/register`. After login the server resolves the role and redirects:
- `b2c_user` → studio in marketplace mode
- `b2b_seller` → studio in showroom mode (own inventory only)
- `super_admin` → admin area

### 7.3 Defense in depth (all three layers are REQUIRED)
1. **Database (authoritative):** RLS policies on every table and every storage bucket. A user can never read or write a row they should not, even if all application code is wrong.
2. **Server:** every route handler and server action starts with an auth guard (`requireUser`, `requireRole`, `requireShopOwner`). Inputs validated with Zod. Authorization is checked against the database, not against client-supplied data.
3. **Middleware/UI:** redirects and hidden menus are UX only. They are never the security boundary.

### 7.4 Admin hardening
- Admin sessions require **TOTP MFA** (Supabase MFA, assurance level `aal2`). Enforced in server guards and in RLS helper `is_admin()` (which checks the `aal2` claim).
- Telegram is used for **alerts** to the admin (new receipt, device abuse, low platform balance), never as the authentication factor.
- Every admin mutation writes a row to `admin_audit_log` (actor, action, target, before/after, timestamp, IP).
- Admin area is server-rendered, loads no admin code for non-admins (route group + guard in layout).

### 7.5 Device limits (anti account-sharing)
- Table `device_sessions` stores `(user_id, device_fingerprint_hash, last_seen_at, revoked_at)`.
- On login the server counts active sessions against the plan limit. If exceeded, the **oldest** session is revoked and the client is signed out on next request. More than 3 evictions in 24 hours creates an admin alert.
- A fingerprint is a soft signal, not an identity. Do not collect more than needed and do not present it as a security guarantee.

---

## 8. Core data flow: AI generation

This is the most important flow. Follow it exactly.

```
Client                       Next.js server                     Fal.ai          Supabase
  │ 1 compress to WebP        │                                     │               │
  │ 2 request upload URL ────▶│ auth, validate                      │               │
  │◀──── signed upload URL ───│                                     │               │
  │ 3 upload original ─────────────────────────────────────────────────────────────▶│ Storage
  │ 4 POST /api/v1/generations│                                     │               │
  │   {sessionId, angleId,    │ a. validate (Zod)                   │               │
  │    partIds[], mode,       │ b. check part/angle/fitment rules   │               │
  │    idempotencyKey}        │ c. RPC reserve_credits(...) ────────────────────────▶│ atomic
  │                           │ d. insert generation(status=queued) ────────────────▶│
  │                           │ e. submit job (queue + webhook) ───▶│               │
  │◀── 202 {generationId} ────│                                     │               │
  │ 5 subscribe Realtime      │                                     │ run           │
  │   generations:{id}        │◀──── webhook (result) ──────────────│               │
  │                           │ f. verify webhook authenticity      │               │
  │                           │ g. download result, store ──────────────────────────▶│ Storage
  │                           │ h. status=succeeded, finalize credit▶│              │
  │◀──── Realtime: succeeded ─────────────────────────────────────────────────────── │
  │ 6 show preview (fast tier), then upgrade to 4K when ready       │               │
```

Rules:
1. **Asynchronous.** The HTTP request returns `202` quickly. No request waits for the AI result.
2. **Idempotency.** `idempotencyKey` is generated by the client per user action. The same key MUST return the same generation and MUST NOT charge twice. Enforced by a unique constraint.
3. **Credits are reserved before the job is submitted** (step c) and **finalized on success** or **refunded on failure/timeout** (step h and the sweeper). All credit changes go through Postgres functions (`reserve_credits`, `commit_credits`, `refund_credits`) that lock the account row and write `credit_ledger`. Application code MUST NOT do `UPDATE accounts SET credits = credits - n`.
4. **Stuck jobs.** A scheduled job (Supabase cron) marks generations `queued/running` for more than the timeout (default 90 s) as `failed` and refunds them. Refunds are idempotent.
5. **Webhook safety.** Verify authenticity as documented by Fal.ai. Additionally match the request id to a known generation, and ignore webhooks for generations already in a terminal state.
6. **Progressive delivery.** Deliver a fast-tier result first (about 1080p) and upgrade to the 4K asset when ready. The UI never shows a spinner without progress feedback (see `02_DESIGN_SYSTEM.md`).
7. **No secrets or provider details reach the client.** The client sees only `generationId`, `status`, and signed asset URLs.

---

## 9. Core data flow: B2C marketplace masking and deposits

- A B2C user never receives `shop.name`, exact address, phone or coordinates before a booking is `verified`. They receive `masked_title`, `district`, `distance_km`, `rating`.
- Implementation: B2C queries go through a **database view or RPC** (`marketplace_shop_public`) that physically does not contain private columns. The private table is not readable by `b2c_user` under RLS. Masking in React or in a route handler is NOT acceptable as the only protection.
- Deposit = 3% of the build total (calculated server-side from DB prices, never trusted from the client), stored in integer minor units.
- Receipt upload goes to a private bucket. A vision check extracts amount/date/validity and stores the result.
- **Unlock policy is an open decision** (ADR-006, section 20). Default in v1 until decided: OCR result puts the booking in `pending_review`; the admin confirms with one tap; Telegram alert is sent immediately. A configurable setting `auto_unlock_on_ocr` (default `false`) allows instant unlock for trusted users later.
- Duplicate receipts are rejected via a SHA-256 hash unique constraint.

---

## 10. QR camera bridge (desktop/TV + phone as camera)

Purpose: staff works on a large screen, and uses their phone as the camera.

1. Desktop creates a `camera_bridge_sessions` row (expires in 10 minutes, single use) and shows a QR code containing a short-lived token URL.
2. Phone opens the URL, token is exchanged server-side for permission to upload to that session only.
3. Phone captures angles; each image is uploaded to Storage (signed URL), then a small message `{angleId, storagePath}` is sent over a Realtime channel `bridge:{sessionId}`.
4. Desktop receives the message, fetches the image by signed URL.

Rules: the channel carries **metadata only**, never image bytes. The token is hashed in the database, expires, and is revoked after use.

---

## 11. AI provider abstraction

All AI vendors are used through interfaces in `src/server/providers/`. Application code depends on the interface, never on a vendor SDK.

```ts
// src/server/providers/ai/image-edit-provider.ts
export interface ImageEditProvider {
  submit(job: ImageEditJob): Promise<ProviderJobRef>;
  parseWebhook(request: Request): Promise<ProviderResult>; // verifies authenticity
  estimateCostMicroUsd(job: ImageEditJob): number;
}
```

Swapping a model or vendor MUST require changes in one provider folder and configuration only. Provider selection and model identifiers come from configuration (`system_settings`/env), not hard-coded in services. The cost per job is recorded on every generation (`provider_cost_micro_usd`) so the admin profit view is exact.

Vision tasks (`identifyVehicle`, `readReceipt`) follow the same pattern behind `VisionProvider`.

---

## 12. Storage

Private buckets only. Access through signed URLs with short expiry, generated server-side after an authorization check.

| Bucket | Content | Who can read |
|---|---|---|
| `originals` | Customer car photos (WebP) | Owner, own shop, admin |
| `outputs` | Generated images (preview + 4K) | Owner, own shop, admin; shared via QR passport token |
| `catalog` | Part images (background removed) | Public via CDN-signed or public-read only for approved catalog items |
| `receipts` | Deposit receipts | Uploader, admin |

Image rules:
- Client compresses to WebP, longest side at most 2048 px, target at most 400 KB, before upload.
- Server validates real file type by magic bytes, size limit, and dimensions. Never trust the file extension or the client MIME type.
- Strip EXIF/GPS metadata from all customer photos.

---

## 13. Internationalization

- Library: `next-intl`. Locales: `uz` (default), `ru`, `en`, `tr`, `ar`, `ky`, then `kk`, `tg`. Adding a language MUST be: one new `messages/<locale>.json` file plus an entry in `src/i18n/routing.ts`.
- URL prefix `/[locale]/...`. First visit shows the full-screen language picker; choice is stored in a cookie and on the profile.
- **No user-visible string in code.** Everything comes from message files (ICU format for plurals). Missing key falls back to `en` and is reported in logs.
- `ar` sets `dir="rtl"`. All layout uses CSS **logical properties** (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`). The car canvas and before/after slider keep physical left/right orientation.
- Catalog content (part names, descriptions) is stored as `jsonb` keyed by locale with fallback order `locale → en → uz`.
- Money: stored as **integer minor units of USD**. Display currency (UZS, AED, KGS, TRY) is a presentation conversion using rates stored in `system_settings` and updated by the admin; billing and limits are never computed in display currency. Format with `Intl.NumberFormat`.
- Fonts must cover Latin, Cyrillic (including Kazakh/Kyrgyz/Tajik letters) and Arabic.

---

## 14. PWA

- Serwist service worker; `display: standalone`, `orientation: any`, theme and background color from tokens.
- Cache: app shell, fonts, icons, locale messages. **Never cache** authenticated API responses, Supabase calls, signed URLs, or receipts.
- Offline: show a clear offline screen with retry; queue nothing silently. Photos already captured stay in memory/IndexedDB until uploaded, and the UI shows upload state.
- Install prompt: Android/Chrome via `beforeinstallprompt`; iOS Safari via an instructional sheet. Never block usage on install.
- Disable pull-to-refresh and overscroll bounce only inside the studio/camera views, not globally.

---

## 15. Performance budgets

| Metric | Budget |
|---|---|
| First load JS on public pages | ≤ 150 KB gzip |
| Studio route JS (excluding three.js) | ≤ 300 KB gzip |
| LCP on 4G mid-range phone | ≤ 2.5 s |
| Interaction latency (select part, price update) | ≤ 100 ms |
| Upload of one compressed photo on weak 4G | ≤ 2 s |
| Time to first generation preview after click | ≤ 4 s typical |

Rules: `three.js` and any camera code are dynamically imported on the camera route only. Images use responsive sizes and modern formats. No layout shift: reserve space for images and the price ticker.

---

## 16. Observability

- **Errors:** Sentry on client and server. Do not send PII (no phone numbers, receipt contents).
- **Logs:** structured JSON (pino) on the server with `requestId`, `userId` (hashed or id only), `generationId`. No `console.log` in committed code.
- **Metrics the admin sees:** generations per shop, success/failure rate, provider cost (exact), revenue assigned manually, net profit, queue latency.
- **Audit:** `admin_audit_log` and `credit_ledger` are append-only (no UPDATE/DELETE policies).

---

## 17. Security baseline

1. RLS on all tables and buckets, with automated SQL tests proving a user cannot read another user's or shop's data.
2. Zod validation on every input boundary; reject unknown keys.
3. Rate limits: auth endpoints, generation creation, upload URL creation, receipt upload, per user and per IP.
4. Security headers and CSP configured in `next.config`. No inline scripts without nonces.
5. File upload validation (section 12). Receipts and photos are never publicly listable.
6. All secrets in environment variables validated at boot by `src/server/env.ts`; the app refuses to start with missing or malformed values. Nothing secret uses the `NEXT_PUBLIC_` prefix.
7. Webhooks authenticated and idempotent.
8. Referral anti-fraud: device hash, per-IP limits, minimum meaningful action (details in `01_PRD_BUSINESS_LOGIC.md`).
9. Dependencies: lockfile committed, automated vulnerability audit in CI, no unmaintained packages.
10. Principle of least privilege for every database function; `SECURITY DEFINER` functions set a fixed `search_path` and validate caller identity inside.

---

## 18. Environments, configuration, deployment

| Environment | Purpose | Data |
|---|---|---|
| local | Development with Supabase CLI | Seed data |
| preview | Per pull request on Vercel | Separate Supabase project (staging) |
| production | Live | Production Supabase project |

- Schema changes ONLY via files in `supabase/migrations/`. Never edit a migration that has been applied; add a new one.
- Environment variables are declared and validated in `src/server/env.ts` (server) and `src/lib/public-env.ts` (client-safe). A `.env.example` is kept in sync.
- Tunable business constants (plan definitions, credit costs, FX rates, `auto_unlock_on_ocr`, device limits) live in the database (`plans`, `system_settings`) so the admin can change them without a deploy. Their defaults are seeded by migration.
- CI pipeline (all must pass to merge): install → lint → typecheck → unit tests → RLS/SQL tests → build → e2e smoke on preview.

---

## 19. Testing strategy

| Level | Tool | What |
|---|---|---|
| Unit (most tests) | Vitest | `domain/` pure logic: pricing, anchor savings, credit math, angle/category validation, fitment filtering, referral rules |
| Integration | Vitest + local Supabase | Services and repositories, credit functions under concurrency |
| Security | SQL tests | RLS: every table, every role, positive and negative cases |
| E2E | Playwright | Register → select language → add item → capture/upload → generate (mock provider) → booking flow; admin grants plan |
| Visual/responsive | Playwright viewports | Portrait/landscape phone, tablet, desktop, RTL: no clipped or overlapping elements |

The AI provider is replaced by a deterministic fake in tests. No test calls a paid external API.

---

## 20. Architecture Decision Records (ADR)

| ID | Decision | Status |
|---|---|---|
| ADR-001 | Single Next.js app, no separate Python backend | Accepted |
| ADR-002 | Supabase for DB/Auth/Storage/Realtime, RLS as authoritative security | Accepted |
| ADR-003 | Queue + webhook for AI jobs, no synchronous waiting | Accepted |
| ADR-004 | Money stored as integer minor units; display currency is presentation only | Accepted |
| ADR-005 | Admin MFA via Supabase TOTP; Telegram for alerts only | Accepted |
| ADR-006 | Deposit receipt unlock policy (OCR-only vs OCR + admin confirm) | **Open** — default is admin confirm |
| ADR-007 | Specific AI models and pipeline (single reference-based edit vs mask + inpaint + upscale) | **Open** — decided by the spike in `07_AI_PIPELINE.md` |
| ADR-008 | Client video render: Canvas + MediaRecorder/WebCodecs instead of FFmpeg.wasm | Accepted, feature ships after core flow |

New decisions are appended here with: context, decision, consequences. Code that depends on an **Open** ADR MUST sit behind an interface so the decision can change cheaply.

---

## 21. Out of scope for v1

Native mobile apps, automatic payment processing, 3D model scanning of parts, shop staff sub-accounts and roles, in-app chat, order fulfillment/shipping, AI video generation, public API for third parties.

---

## 22. Architecture checklist for every pull request

- [ ] No business logic added under `src/app/`
- [ ] No import crosses a layer boundary in section 6
- [ ] New table has RLS and an SQL test
- [ ] New input is validated with Zod
- [ ] Credits/money touched only through the defined functions and integer minor units
- [ ] No hard-coded user-visible string, color, or currency
- [ ] No secret in client code; `server-only` present where required
- [ ] Layout verified in portrait, landscape and RTL
