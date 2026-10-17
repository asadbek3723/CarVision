---
trigger: always_on
---

# /new-feature

Build a new feature end to end. Follow every step in order. Do not skip.

1. **Read context**: `plan.md`, `DECISIONS.md`, `lessons.md`, and the code related to this feature.
2. **Clarify**: ask me a numbered list of questions (users, flows, edge cases, data, permissions, design, priority). For each, give options and your recommended default. Wait for answers.
3. **Plan**: write a short plan (data model, API, UI components, states, files to create/change, risks). Add it to `plan.md`. Wait for my approval if the change touches 5+ files, auth, payments, or the database.
4. **Branch**: create `feat/<name>`.
5. **Build in this order**: data model and migration, validation schemas (Zod), server logic and API (with auth + authorization checks), UI (design rule, all states, animations, responsive, i18n), then wiring.
6. **Test**: unit tests for critical logic, manual run of the main flow and edge cases.
7. **Verify**: lint, type-check, build, tests, responsive check (360 / 768 / 1024 / 1440), light and dark mode, keyboard and focus.
8. **Security self-review**: input validation, authorization, data exposure, rate limiting.
9. **Docs**: update `plan.md`, `CHANGELOG.md`, `DECISIONS.md`, `README.md` if needed.
10. **Commit** with conventional commits (do not push).
11. **Report** using the communication-style format, ending with 3-5 CTO suggestions to improve this feature.