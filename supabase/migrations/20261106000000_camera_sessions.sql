-- CarVision: persistent phone-camera hand-off sessions (QR bridge)
-- Migration: 20261106000000_camera_sessions.sql   (idempotent)
-- The old in-memory store does not work on Vercel (each request can hit another instance).
CREATE TABLE IF NOT EXISTS public.camera_sessions (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL DEFAULT 'car' CHECK (kind IN ('car', 'product')),
    user_id UUID,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'connected', 'captured')),
    image_url TEXT,
    angles JSONB NOT NULL DEFAULT '{}'::jsonb,
    uploads INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_camera_sessions_created ON public.camera_sessions(created_at);
ALTER TABLE public.camera_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.camera_sessions FROM anon, authenticated;
GRANT ALL ON public.camera_sessions TO service_role;
