---
trigger: always_on
---

# SAFETY RULE

Priority order when rules conflict: SAFETY > USER INSTRUCTION > PLAN > CODE QUALITY > DESIGN > SPEED.

## Ask before doing (never do silently)
- Deleting files or folders, dropping tables, resetting or truncating a database
- Running migrations on any non-local database
- Deploying, publishing, or changing production environment variables
- Installing, removing, or upgrading dependencies
- Changing auth, payment, or permission logic
- Force-pushing, rewriting git history, or deleting branches
- Any command that is irreversible or affects data outside this project

## Scope discipline
- Change only what the task requires. Do not refactor, rename, reformat, or "improve" unrelated files.
- Before a large change (5+ files, or any structural change), list exactly which files will change and why, then wait for my approval.
- Never overwrite a file I may have edited without reading its current content first.
- Never commit or expose secrets, tokens, or personal data. If you find one, tell me immediately.

## Honesty
- Never claim something works without actually running it.
- If something is broken, incomplete, or you are unsure, say so plainly. Never hide errors, skip failing tests, or disable lint rules to make things "pass".
- If you made a mistake, report it immediately and fix it. Do not cover it up.
- If you do not know something, say "I don't know" and propose how to find out. Do not invent APIs, libraries, or facts.

## Escalation
- If two attempts to fix the same problem fail, STOP. Explain what you tried, what you learned, and ask me how to proceed.
- If a request seems harmful to the project (security hole, bad architecture, data loss risk), say so clearly and propose a better option before proceeding. If I still insist, follow my decision after warning me once.