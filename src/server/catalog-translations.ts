import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { ITEM_LOCALES, type ItemLocale, type ItemTranslations } from '@/domain/catalog';
import { translateListing } from '@/server/translate';

type Db = ReturnType<typeof createAdminClient>;

const hashOf = (name: string, description: string) => createHash('sha1').update(`${name}\u0000${description}`).digest('hex');

/**
 * Translates an item's name and description into the other languages and stores the result.
 * Skips work when the text has not changed, and never overwrites a language the seller edited by hand.
 * Safe to call without awaiting (errors are logged, never thrown); does nothing if the migration has not run.
 */
export async function syncItemTranslations(db: Db, itemId: string): Promise<void> {
  try {
    const { data: row, error } = await db
      .from('catalog_items')
      .select('name, description, source_lang, translations, translations_hash')
      .eq('id', itemId)
      .maybeSingle();
    if (error || !row) return;

    const name = String(row.name ?? '');
    const description = String(row.description ?? '');
    const current = ((row.translations as ItemTranslations | null) ?? {}) as ItemTranslations;
    const hash = hashOf(name, description);

    const complete = ITEM_LOCALES.every((l) => l === row.source_lang || current[l]?.manual || current[l]?.name);
    if (row.translations_hash === hash && complete) return;

    const result = await translateListing({ name, description });
    if (!result) return;

    const merged: ItemTranslations = {};
    for (const locale of ITEM_LOCALES) {
      if (locale === result.sourceLang) continue;
      const manual = current[locale];
      if (manual?.manual) {
        merged[locale] = manual;
        continue;
      }
      const t = result.translations[locale];
      if (t) merged[locale] = { name: t.name, description: t.description, manual: false };
    }

    const { error: upErr } = await db
      .from('catalog_items')
      .update({ source_lang: result.sourceLang, translations: merged, translations_hash: hash })
      .eq('id', itemId);
    if (upErr) console.error('save translations failed:', upErr.message);
  } catch (err) {
    console.error('syncItemTranslations error:', err instanceof Error ? err.message : 'unknown');
  }
}

/**
 * Stores translations the seller typed by hand and marks them `manual`.
 * A language sent with both fields empty goes back to automatic translation.
 */
export async function saveManualTranslations(
  db: Db,
  itemId: string,
  edits: Partial<Record<ItemLocale, { name?: string | undefined; description?: string | undefined }>> | undefined
): Promise<void> {
  if (!edits || Object.keys(edits).length === 0) return;
  try {
    const { data: row, error } = await db.from('catalog_items').select('translations').eq('id', itemId).maybeSingle();
    if (error || !row) return;
    const merged = { ...((row.translations as ItemTranslations | null) ?? {}) } as ItemTranslations;
    for (const [locale, edit] of Object.entries(edits) as Array<[ItemLocale, { name?: string | undefined; description?: string | undefined }]>) {
      const prev = merged[locale];
      const name = (edit.name ?? prev?.name ?? '').trim();
      const description = (edit.description ?? prev?.description ?? '').trim();
      if (!name && !description) {
        delete merged[locale]; // back to automatic
        continue;
      }
      if (name === (prev?.name ?? '') && description === (prev?.description ?? '')) continue; // unchanged
      merged[locale] = { name, description, manual: true };
    }
    const { error: upErr } = await db.from('catalog_items').update({ translations: merged }).eq('id', itemId);
    if (upErr) console.error('save manual translations failed:', upErr.message);
  } catch (err) {
    console.error('saveManualTranslations error:', err instanceof Error ? err.message : 'unknown');
  }
}
