import { CATALOG_CATEGORIES, type CatalogCategory, type CatalogItemDTO } from '@/domain/catalog';
import { CATEGORY_NAMES, categoryUrlSlug, seoCategory } from '@/lib/seo/categories';
import { carModels } from '@/lib/seo/cars';
import { SEO_COPY } from '@/lib/seo/copy';
import { SITE_NAME, absoluteUrl } from '@/lib/seo/site';
import { itemFitLabels, listAllPublishedItems } from '@/server/catalog-seo';

export const revalidate = 600;

function oneLine(s: string, max = 220): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * llms.txt (https://llmstxt.org): a plain-text map of the site for AI assistants: what CarVision
 * is, and every part on sale with its link, price and fitment, grouped by category.
 */
export async function GET(): Promise<Response> {
  const items = await listAllPublishedItems();
  const byCategory = new Map<CatalogCategory, CatalogItemDTO[]>();
  for (const i of items) byCategory.set(seoCategory(i), [...(byCategory.get(seoCategory(i)) ?? []), i]);

  const models = carModels(items);
  const lines: string[] = [
    `# ${SITE_NAME}`,
    '',
    `> ${SEO_COPY.en.home.description}`,
    '',
    `${SITE_NAME} (${absoluteUrl('/')}) is an online car tuning marketplace with an AI visualizer, for Uzbekistan and Central Asia. Customers photograph their car, try wheels, bumpers, body kits, spoilers, headlights, paint colours, wraps and window tint on it with AI, then reserve the part (with installation) from a verified tuning workshop. The site is available in Uzbek, Russian, English, Arabic, Turkish, Kazakh, Kyrgyz and Tajik. The catalog currently lists ${items.length} parts; each one has its own page with photos, price and the car models it fits.`,
    '',
    '## Main pages',
    `- [Home](${absoluteUrl('/uz')}): what CarVision is and how the AI try-on works`,
    `- [Shop](${absoluteUrl('/uz/shop')}): interactive parts shop with a "fits my car" filter`,
    `- [Full parts catalog](${absoluteUrl('/en/catalog')}): every part on one page (also /uz/catalog, /ru/catalog and the other languages)`,
    `- [Plans for workshops](${absoluteUrl('/uz/plans')}): pricing for tuning workshops that sell on CarVision`,
    '',
    '## Categories',
    ...CATALOG_CATEGORIES.filter((c) => byCategory.has(c.slug)).map(
      (c) =>
        `- [${CATEGORY_NAMES.en[c.slug]} / ${CATEGORY_NAMES.uz[c.slug]} / ${CATEGORY_NAMES.ru[c.slug]}](${absoluteUrl(`/en/catalog/${categoryUrlSlug(c.slug)}`)}): ${byCategory.get(c.slug)?.length ?? 0} parts`
    ),
    ...(models.length
      ? [
          '',
          '## Parts by car model',
          `- [All car models](${absoluteUrl('/en/cars')})`,
          ...models.map((m) => `- [${m.label}](${absoluteUrl(`/en/cars/${m.slug}`)}): ${m.count} parts listed for this model`),
        ]
      : []),
  ];

  for (const c of CATALOG_CATEGORIES) {
    const list = byCategory.get(c.slug);
    if (!list) continue;
    lines.push('', `## ${CATEGORY_NAMES.en[c.slug]} (${CATEGORY_NAMES.uz[c.slug]})`);
    for (const i of list) {
      const en = i.translations?.en?.name?.trim();
      const fits = i.isUniversal ? 'universal fit' : itemFitLabels(i, 6).join(', ');
      const facts = [i.brand, `$${i.priceUSD.toFixed(2)}`, fits ? `fits: ${fits}` : '', i.stock > 0 ? 'in stock' : 'out of stock']
        .filter(Boolean)
        .join('; ');
      const desc = i.translations?.en?.description?.trim() || i.description;
      lines.push(`- [${oneLine(en || i.name, 120)}](${absoluteUrl(`/en/shop/${i.id}`)}): ${facts}.${desc ? ` ${oneLine(desc)}` : ''}`);
    }
  }

  lines.push('', '## Optional', `- [Sitemap](${absoluteUrl('/sitemap.xml')}): every page in every language, with part photos`, '');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600, s-maxage=600' },
  });
}
