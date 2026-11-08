-- CarVision: admin-managed advertising banner (shown in the shop between the product cards)
-- Migration: 20261115000000_app_banners.sql   (idempotent)
--
-- One row per slot. Only the server (service role) reads and writes it: the public
-- GET /api/v1/banners returns the active row, the admin console edits it.
-- The picture itself lives in the public `catalog` storage bucket under banners/.

CREATE TABLE IF NOT EXISTS public.app_banners (
    slot        TEXT PRIMARY KEY CHECK (slot IN ('shop')),
    image_url   TEXT NOT NULL,
    link_url    TEXT,
    alt         TEXT NOT NULL DEFAULT '',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_banners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_banners FROM anon, authenticated;
