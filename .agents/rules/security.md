---
trigger: always_on
---

# SECURITY RULE

Treat every input as hostile and every client as untrusted.

## Secrets
- Secrets, keys, tokens, and credentials only in environment variables. Never in code, logs, commits, or client bundles.
- Keep `.env` in `.gitignore`. Keep `.env.example` updated with every new variable (no real values).
- Only variables intended for the browser may use the public prefix (e.g. NEXT_PUBLIC_).

## Validation
- Validate ALL input on the server with a schema (Zod or equivalent), even if the client already validates. Check type, length, format, and range.
- Validate and sanitize URL params, query strings, headers, and file metadata.
- Never build SQL by string concatenation. Use an ORM or parameterized queries.

## Authentication & authorization
- Use proven libraries (Auth.js, Clerk, Supabase Auth, etc.). Never write custom crypto.
- Hash passwords with argon2 or bcrypt. Never store plain text. Enforce sensible password rules.
- Check authentication AND authorization (role + ownership) on EVERY API route, server action, and data query. Hiding buttons in the UI is not security.
- Prevent IDOR: always verify that the requested record belongs to the current user/organization.
- Sessions: httpOnly, secure, sameSite cookies; sensible expiry; logout invalidates the session.

## Web protections
- Prevent XSS (never use dangerouslySetInnerHTML with unsanitized content), CSRF, SSRF, and open redirects.
- Configure CORS strictly (explicit origins, never `*` for authenticated APIs).
- Add security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
- Rate-limit login, signup, password reset, OTP, and any expensive or public endpoint.

## Files & uploads
- Validate file type by content (not just extension), enforce size limits, rename files, store outside the web root or in object storage, never execute uploaded files.

## Data & privacy
- Collect the minimum personal data needed. Never log passwords, tokens, card data, or full personal data.
- Never return more fields than needed from an API (no password hashes, internal IDs, or tokens).
- Keep an audit log for sensitive actions (login, role change, payment, delete).

## Dependencies
- Do not add packages without asking. Prefer well-maintained, widely used ones. Flag any known-vulnerable dependency.

## Review
- After finishing any feature touching auth, payments, uploads, or user data, run a short security self-review and report findings.