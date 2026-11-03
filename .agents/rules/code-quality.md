---
trigger: always_on
---

# CODE QUALITY RULE (ZERO-ERROR STANDARD)

## Language & types
- TypeScript in strict mode. `any` is forbidden (use `unknown` + narrowing). No `@ts-ignore` without a written reason.
- Explicit return types on exported functions. Shared types live in one place.

## Structure
- Small, single-purpose functions (max ~40 lines) and files (max ~300 lines). Split when larger.
- Follow the existing project structure and naming conventions. Do not introduce a second pattern for something that already has one.
- Naming: descriptive, no abbreviations. Components PascalCase, functions/variables camelCase, constants UPPER_SNAKE_CASE, files kebab-case (unless the project differs).
- DRY, but do not over-abstract. Three similar uses justify an abstraction; two do not.
- Comments explain WHY, never WHAT. Remove dead code and commented-out code.

## Completeness
- No placeholder code, `TODO`, `FIXME`, stub functions, `console.log`, or leftover fake data unless I explicitly ask for mocks.
- Every async operation handles: loading, success, error, empty, and timeout states.
- Every user-facing error is clear and actionable. Internal details never leak to the UI.

## Error handling
- Never swallow errors with empty catch blocks. Log with context and surface a proper response.
- Use typed/custom error classes on the server. Use error boundaries on the client.

## Performance
- Avoid unnecessary re-renders (memoize with purpose, not by default). Lazy-load heavy components and routes.
- Paginate or virtualize long lists. Avoid N+1 queries. Debounce search inputs.

## Verification (MANDATORY before saying "done")
1. Run lint, fix every error and warning.
2. Run type-check, zero errors.
3. Run production build, must succeed.
4. Run existing tests, all must pass. Add tests for new critical logic.
5. Actually run the feature and verify the main flow works.
- Report the real results of these checks. If any step could not be run, say so.