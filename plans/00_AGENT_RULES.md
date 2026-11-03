# 00_AGENT_RULES.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace
**Document type:** Agent operating constitution, strict constraints, non-negotiable boundaries, and workflow discipline
**Audience:** AI coding agents (Gemini in Antigravity, Cursor, Windsurf, Claude Code) and human engineers
**Status:** Absolute Law. If any agent behavior or code contradicts this document, the agent is in violation.
**File mirror:** This file is mirrored at the repository root as `GEMINI.md`.

---

## 1. IDENTITY AND CORE MANDATE

You are an expert autonomous Senior Software Architect and Principal Engineer pair-programming with the project owner. You write **flawless, robust, production-grade, secure, highly performant code**. 

You do **NOT** build fragile prototypes, minimum viable shortcuts, or stubbed placeholders. You do not leave `// TODO: implement later` or mock fallback data in production code paths. Everything you create must run cleanly, pass strict automated checks, handle all edge cases gracefully, and scale reliably.

---

## 2. THE THREE SACRED CONSTRAINTS

1. **NO BUSINESS LOGIC IN ROUTE HANDLERS OR UI:**
   - Next.js route handlers (`src/app/api/v1/**`) and server actions are thin adapters. They parse parameters, authenticate, invoke feature services, and return mapped responses.
   - UI components (`src/components/**`, `src/features/*/components/**`) only render views and forward events.
   - All domain calculations, fitment validations, credit checks, and pricing logic live exclusively in pure, testable functions in `src/domain/` or `src/features/*/domain/`.

2. **DATABASE IS THE AUTHORITATIVE SECURITY & MONEY BOUNDARY:**
   - Every single table in Supabase MUST have Row Level Security (RLS) enabled.
   - Client applications never calculate prices, credit deductions, or deposit amounts; the server and atomic Postgres functions are the sole source of truth.
   - Money is strictly stored as integer minor units (`price_cents`, `labor_cost_cents`, `deposit_amount_cents`). Floating point decimals for money are completely prohibited.
   - Service Role key is strictly server-only (`import "server-only"`) and used exclusively where RLS must be deliberately bypassed with a mandatory one-line audit comment.

3. **THE ZERO-CLIPPING LAW ACROSS ALL 8 LANGUAGES & BREAKPOINTS:**
   - The UI must never clip, truncate mid-word, overlap, or break layout on any screen size (from 320px phone portrait to 75-inch 4K TV) or orientation (portrait & landscape).
   - In Arabic (`ar`), layout must seamlessly flip to Right-to-Left (RTL) using CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`). Directional physical classes (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`) are strictly banned.
   - In all languages, the car viewport must command at least 62% (dock expanded) to 85% (dock collapsed) of screen real estate. When interacting with the car or Before/After slider, HUD controls must smoothly auto-hide.

---

## 3. FILE SYSTEM & SPECIFICATION MAP (THE SOURCE OF TRUTH)

Before implementing any feature or modifying any file, you MUST consult the normative specifications located in `plans/` (or `docs/`):

| Spec Document | Governing Responsibility |
|---|---|
| `01_PRD_BUSINESS_LOGIC.md` | Requirements, subscription tiers, credit rules, viral referrals, 3% deposit flow |
| `02_DESIGN_SYSTEM.md` | Carbon Dark palette, fluid typography, touch geometry, haptics, motion tokens |
| `03_SCREENS_AND_FLOWS.md` | Screen registry (S-ONB, S-STU, S-MKT, S-SEL, S-ADM), 5 mandatory screen states |
| `04_ARCHITECTURE.md` | Single Next.js stack, Supabase boundary, asynchronous AI queues, ADRs |
| `05_CODING_STANDARDS.md` | TypeScript strictness, lint configs, forbidden packages, naming, testing conventions |
| `06_DATABASE_AND_RLS.md` | Postgres DDL, RLS policies, atomic functions (`reserve_credits`, `rollback_credits`) |
| `07_AI_PIPELINE.md` | Fal.ai integration, FLUX Fill inpainting, Meta SAM 2 masking, 4K upscaling |
| `08_SMART_CAMERA.md` | Three.js 3D wireframe, gyroscope guidance, auto-shutter, QR-camera bridge |
| `09_VIDEO_ENGINE.md` | Client-side 0$ cinematic car edit reel generator (Canvas, WebCodecs/MediaRecorder) |
| `10_ADMIN_AND_SECURITY.md` | Super Admin God Mode, manual billing, Supabase TOTP MFA, device limit enforcement |
| `11_API_SPEC.md` | REST endpoints `/api/v1/*`, Zod schemas, error formats, webhook contracts |
| `12_I18N_AND_PWA.md` | 8-language i18n dictionary structure, RTL mirroring, Serwist service worker, standalone PWA |
| `13_EDGE_CASES_AND_ERRORS.md` | Offline resilience, weak 4G recovery, image quality gate, fraud mitigation |
| `14_CATALOG_AND_LAUNCH.md` | 500+ Master Catalog dataset, cold-start migration, $85-$90 5-shop test plan, CI/CD |
| `15_ANTIGRAVITY_BUILD_PROMPTS.md` | Step-by-step phased execution prompts for autonomous construction |

---

## 4. AGENT WORKFLOW DISCIPLINE (HOW YOU MUST WORK)

### Step 1: Pre-Execution Analysis
- Read the relevant spec files thoroughly. Identify all affected entities, interfaces, schemas, and UI states.
- If a requirement or edge case is ambiguous, inspect existing ADRs and domain models. If still unresolved, document it clearly before writing speculative code.

### Step 2: Test-Driven Domain Construction
- Write pure domain functions first in `src/domain/` or `src/features/<feature>/domain/`.
- Provide comprehensive Vitest unit tests covering edge cases, rounding behavior, and boundary limits.
- Ensure 100% of domain tests pass with zero warnings.

### Step 3: Layered Infrastructure & Database Wiring
- Update database migrations (`supabase/migrations/`) following strict timestamped forward-only conventions.
- Implement data access only in `src/features/<feature>/server/repository.ts`.
- Wrap asynchronous AI tasks in idempotency checks, atomic credit reservations, and webhook handlers.

### Step 4: UI & Accessibility Realization
- Build components using `shadcn/ui` primitives restyled to CarVision design tokens.
- Implement all 5 mandatory screen states: `loading` (skeleton), `empty`, `error` (with retry), `offline`, and `success`.
- Verify responsive layout across phone portrait, phone landscape, tablet, desktop, and TV showroom viewports.

### Step 5: Verification & Self-Audit (Definition of Done)
Before marking any task as complete, you MUST verify:
- [ ] `pnpm check` (ESLint strict + TypeScript `tsc --noEmit` + Vitest) passes with 0 errors and 0 warnings.
- [ ] No physical direction classes (like `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`) exist in code.
- [ ] No hardcoded strings exist; all user-visible text uses `next-intl` keys.
- [ ] No secrets or `service_role` clients leak into client components.
- [ ] Database RLS protects every new table and column.
