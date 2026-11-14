-- CarVision: the shopping cart is saved per account, so it follows the user to every device
-- Migration: 20261121000000_user_carts.sql   (idempotent)
--
-- One row per user. `items` maps a catalog item id to its quantity, `unselected` lists the ids the
-- user unticked in the cart. Only the server (service role) reads and writes it, through
-- GET / PUT /api/v1/cart; the browser keeps a local copy for guests and offline use.

CREATE TABLE IF NOT EXISTS public.user_carts (
    user_id     UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    items       JSONB NOT NULL DEFAULT '{}'::jsonb,
    unselected  JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_carts_items_object CHECK (jsonb_typeof(items) = 'object'),
    CONSTRAINT user_carts_unselected_array CHECK (jsonb_typeof(unselected) = 'array')
);

ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_carts FROM anon, authenticated;
