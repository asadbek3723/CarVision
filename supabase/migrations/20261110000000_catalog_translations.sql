-- Product text in every supported language.
-- `name` / `description` keep what the seller typed; `translations` holds the other languages:
--   { "ru": { "name": "...", "description": "...", "manual": false }, ... }
-- `manual: true` means the seller edited that language by hand, so automatic translation never overwrites it.
ALTER TABLE public.catalog_items
    ADD COLUMN IF NOT EXISTS source_lang TEXT,
    ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS translations_hash TEXT;
