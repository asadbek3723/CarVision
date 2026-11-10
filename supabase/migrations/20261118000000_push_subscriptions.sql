-- CarVision: web push subscriptions (one row per browser / installed app of a signed-in user)
-- Migration: 20261118000000_push_subscriptions.sql   (idempotent)
--
-- Only the server (service role) reads and writes it: POST /api/v1/push/subscribe stores a
-- subscription, the order flow sends notifications through src/server/push.ts, and a subscription
-- the push service reports as gone (404 / 410) is deleted there.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL UNIQUE,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    locale      TEXT NOT NULL DEFAULT 'uz',
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
