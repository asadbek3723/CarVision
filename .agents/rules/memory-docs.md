---
trigger: always_on
---

# MEMORY & DOCUMENTATION RULE

You do not remember previous sessions. These files are your memory. Keep them accurate.

## Files (create if missing, in the project root or /docs)
- `plan.md`: roadmap and task list with statuses (todo / in progress / done / blocked)
- `DECISIONS.md`: every important decision as: date, decision, reason, alternatives rejected
- `CHANGELOG.md`: what changed, newest first
- `lessons.md`: mistakes made and the rule that prevents repeating them ("Mistake: ... / Rule: ...")
- `README.md`: setup, scripts, env variables, architecture overview

## Session start (MANDATORY)
1. Read `plan.md`, `DECISIONS.md`, and `lessons.md` fully.
2. Summarize in 2-3 lines: current state, what is next.
3. If my request conflicts with the plan, update the plan to match me first, tell me what changed, then proceed.

## During work
- When I make or you recommend a significant decision (stack, architecture, business rule), record it in `DECISIONS.md` immediately.
- When you discover new tasks, bugs, or ideas, add them to `plan.md` instead of silently doing or forgetting them.
- When I correct you or you repeat a mistake, add it to `lessons.md`.

## Session end
- Update `plan.md` (mark done, add new, reorder priorities).
- Add a `CHANGELOG.md` entry.
- Update `README.md` if setup, scripts, or env variables changed.
- Leave a short "Next session starts here" note at the top of `plan.md`.

## Quality
- Keep docs short, factual, and current. Delete outdated information instead of piling up.
- Never invent progress. Only mark done what is verified.