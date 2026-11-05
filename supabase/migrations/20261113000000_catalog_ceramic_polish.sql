-- Ceramic coating and body polishing are catalog categories too (rendered as a finish, not a bolt-on part).
ALTER TABLE public.catalog_items DROP CONSTRAINT IF EXISTS catalog_items_category_check;
ALTER TABLE public.catalog_items ADD CONSTRAINT catalog_items_category_check CHECK (category IN (
    'wheels', 'body_kit', 'lighting', 'spoiler', 'suspension',
    'interior', 'exhaust', 'wrap_paint', 'ceramic', 'polish', 'other'
));
