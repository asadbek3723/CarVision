-- CarVision: dedicated attempt log for rate limiting (login, OTP, admin PIN, text improve)
-- Migration: 20261104000003_auth_attempts.sql   (idempotent)
-- The pre-existing `login_attempts` table has an extra NOT NULL column (`scope`), so inserts from
-- the app were silently failing and brute-force protection did nothing. This table is ours.
CREATE TABLE IF NOT EXISTS public.auth_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind VARCHAR(30) NOT NULL,
    login_key TEXT NOT NULL,
    ip VARCHAR(64),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_key ON public.auth_attempts(kind, login_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip ON public.auth_attempts(kind, ip, created_at DESC);
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_attempts FROM anon, authenticated;
GRANT ALL ON public.auth_attempts TO service_role;
