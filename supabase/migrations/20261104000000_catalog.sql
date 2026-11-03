-- CarVision: real catalog (seller products), fitment and image storage
-- Migration: 20261104000000_catalog.sql   (idempotent)
-- Replaces the legacy `products / sellers / categories` tables the old code expected.

DO $$
BEGIN
    IF to_regclass('public.shops') IS NULL OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'exact_address') THEN
        RAISE EXCEPTION 'Avval 20261103000000_secure_credits_auth.sql migratsiyasini ishga tushiring';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SET search_path = public, pg_temp
AS $$ SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), 'anonymous'); $$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public, pg_temp
AS $$ SELECT public.current_user_role() = 'super_admin'; $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.current_user_shop_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.shops WHERE owner_id = auth.uid() LIMIT 1;
$$;

CREATE TABLE IF NOT EXISTS public.catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN (
        'wheels', 'body_kit', 'lighting', 'spoiler', 'suspension',
        'interior', 'exhaust', 'wrap_paint', 'other'
    )),
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(100),
    description TEXT,
    price_cents INT NOT NULL CHECK (price_cents >= 0),
    input_currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    input_price NUMERIC(14,2),
    stock INT NOT NULL DEFAULT 1 CHECK (stock >= 0),
    install_available BOOLEAN NOT NULL DEFAULT TRUE,
    install_price_cents INT NOT NULL DEFAULT 0 CHECK (install_price_cents >= 0),
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    cover_image_url TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_items_shop ON public.catalog_items(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_catalog_items_public ON public.catalog_items(status, category, created_at DESC);

CREATE TABLE IF NOT EXISTS public.catalog_item_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'ORIGINAL' CHECK (kind IN ('ORIGINAL', 'STUDIO', 'ANGLE')),
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_catalog_item_images_item ON public.catalog_item_images(item_id, position);

CREATE TABLE IF NOT EXISTS public.catalog_item_fitment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    model_id UUID,
    custom_model VARCHAR(120),
    year_from INT CHECK (year_from IS NULL OR year_from BETWEEN 1950 AND 2100),
    year_to INT CHECK (year_to IS NULL OR year_to BETWEEN 1950 AND 2100),
    CHECK (model_id IS NOT NULL OR custom_model IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_catalog_item_fitment_item ON public.catalog_item_fitment(item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_item_fitment_model ON public.catalog_item_fitment(model_id);

DROP TRIGGER IF EXISTS trg_catalog_items_updated ON public.catalog_items;
CREATE TRIGGER trg_catalog_items_updated BEFORE UPDATE ON public.catalog_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: public reads only published items; owners read their own; ALL writes go through the server.
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_item_fitment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read published or own items" ON public.catalog_items;
CREATE POLICY "Read published or own items" ON public.catalog_items
    FOR SELECT USING (status = 'PUBLISHED' OR shop_id = public.current_user_shop_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "Read images of visible items" ON public.catalog_item_images;
CREATE POLICY "Read images of visible items" ON public.catalog_item_images
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.catalog_items i WHERE i.id = item_id
        AND (i.status = 'PUBLISHED' OR i.shop_id = public.current_user_shop_id() OR public.is_super_admin())));

DROP POLICY IF EXISTS "Read fitment of visible items" ON public.catalog_item_fitment;
CREATE POLICY "Read fitment of visible items" ON public.catalog_item_fitment
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.catalog_items i WHERE i.id = item_id
        AND (i.status = 'PUBLISHED' OR i.shop_id = public.current_user_shop_id() OR public.is_super_admin())));

REVOKE INSERT, UPDATE, DELETE ON public.catalog_items FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.catalog_item_images FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.catalog_item_fitment FROM anon, authenticated;
GRANT SELECT ON public.catalog_items, public.catalog_item_images, public.catalog_item_fitment TO anon, authenticated;

-- Storage for product photos (public read, server-only write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('catalog', 'catalog', TRUE, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
   SET public = TRUE, file_size_limit = 8388608,
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Vehicle reference tables: make sure they exist and are publicly readable
CREATE INDEX IF NOT EXISTS idx_vehicle_models_make ON public.vehicle_models(make_id);
