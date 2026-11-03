# GEMINI.md — CarVision Project Operating Rules

See full normative document in `plans/00_AGENT_RULES.md`.

## Core Directives for Gemini in Antigravity:
1. **Tech Stack:** Next.js 15 (App Router, TypeScript strict), Tailwind CSS, shadcn/ui, Supabase (Postgres with RLS, Auth, Storage, Realtime), Fal.ai (FLUX Fill + 4K Upscale), Serwist (PWA), next-intl. No separate Python backend.
2. **Architecture:** Single deployable. Thin route handlers, pure business logic in `domain/`, repository pattern for data access. RLS on every table.
3. **Money & Credits:** Stored in integer minor units (`price_cents`, `deposit_amount_cents`). Credits managed via atomic Postgres functions (`reserve_credits`, `rollback_credits`).
4. **UI Philosophy:** "Carbon Dark" theme (#0A0B0F, #12141A, #19D3FF accent). Car viewport commands 62%–85% of screen. No text clipping across all 8 languages (including Arabic RTL with logical CSS).
5. **Quality Gates:** Zero TypeScript warnings, zero ESLint errors, complete Vitest coverage for domain logic before declaring any task complete.
