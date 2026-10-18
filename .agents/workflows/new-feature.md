---
description: Build a new feature end to end: read context, plan and wait for approval, build, verify UI in the browser (375/1440, light/dark), run tsc/lint/build, update docs, report.
---

Build a new feature end to end. Follow every step in order. Do not skip.

1. READ CONTEXT
   - Read GEMINI.md and plans/00_AGENT_RULES.md.
   - Read the existing code related to this feature (components, API routes, store, types).
   - If the feature has UI, also read design.md and the token file (globals.css).
   - Do not guess. If a file, API, or requirement is unclear, ask me before coding.

2. PLAN
   - Write a short plan: what will be built, which files change, which components are reused,
     data flow, edge cases, i18n keys (uz/ru/en), security considerations.
   - Show the plan and WAIT for my approval before writing code.

3. BUILD
   - Implement in small steps, following code-quality, security, stack, and i18n rules.
   - Reuse existing components and tokens. Do not add new libraries without asking.
   - All user-facing text goes through i18n (uz, ru, en). No hardcoded strings.
   - Validate all inputs on the server (Zod). Never trust the client.

4. UI VERIFICATION (if the feature has UI)
   - Open localhost:3000/uz in the browser.
   - Take screenshots at 375px and 1440px, in light and dark mode.
   - Check against design.md: tokens only, no borders, states (hover, focus, loading, error, empty),
     longest locale text (ru) does not overflow.
   - Fix every flaw you find, then take new screenshots. Repeat until clean.

5. QUALITY CHECKS
   - Run: tsc --noEmit, lint, build. All must pass.
   - Problems panel must be empty.
   - Remove unused code, console.logs, and TODOs you added.

6. DOCUMENT
   - Update the memory/docs files required by the memory-docs rule
     (what was built, decisions made, files touched).

7. REPORT
   - Summarize what was built, files changed, how to test it, and known limitations.
   - Show final screenshots.
   - Suggest 3 concrete improvements for the next iteration.