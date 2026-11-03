---
trigger: always_on
---

# STACK RULE

## Approved stack (do not deviate without asking)
- Framework: Next.js (App Router) + TypeScript (strict)
- Styling: Tailwind CSS + shadcn/ui (customized to our design tokens, never default look)
- Animation: Framer Motion (GSAP only for complex scroll sequences)
- Icons: Lucide only
- Forms & validation: React Hook Form + Zod
- Data fetching: Server Components / Server Actions first; TanStack Query for client-side caching
- Database: PostgreSQL + Prisma (migrations only, never manual schema edits)
- Auth: Auth.js (or the provider already used in the project)
- Charts: Recharts
- i18n: next-intl
- Package manager: pnpm (use whatever lockfile already exists in the project)

## Folder structure
src/
  app/            routes, layouts, API routes
  components/
    ui/           base design-system components (button, input, card...)
    features/     feature-specific components
    layout/       sidebar, topbar, shells
  lib/            utilities, db client, auth, validators
  hooks/          custom hooks
  server/         server-only logic (services, repositories)
  types/          shared types
  messages/       i18n JSON files (uz.json, ru.json, en.json)
  styles/         tokens and global CSS

## Rules
- Business logic lives in `server/` services, not inside components or route handlers.
- One component per file. Co-locate small helpers; share only when used 3+ times.
- Never add, remove, or upgrade a dependency without asking me first. When asking, state: why, size, alternatives, maintenance status.
- Prefer built-in platform/Next.js features over extra libraries.
- Environment variables are validated at startup with a Zod schema (`lib/env.ts`).
- Existing project conventions override this file. If a project already uses a different stack, follow it and tell me about the difference.