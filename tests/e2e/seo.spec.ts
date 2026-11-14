import { test, expect } from '@playwright/test';

/** Public, crawlable pages: car model pages, plans structured data, sitemap. No AI is involved. */

const jsonLd = async (page: import('@playwright/test').Page) =>
  (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap((t) => {
    const parsed = JSON.parse(t) as unknown;
    return Array.isArray(parsed) ? parsed : [parsed];
  }) as Array<Record<string, unknown>>;

test.describe('SEO pages', () => {
  test('car model pages: index -> model -> section, with "uchun" headings', async ({ page }) => {
    test.setTimeout(90_000);
    const res = await page.goto('/uz/cars');
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    const firstModel = page.locator('nav a[href^="/uz/cars/"]').first();
    test.skip((await firstModel.count()) === 0, 'No part in the database is listed for a car model');

    await firstModel.click();
    await page.waitForURL(/\/uz\/cars\/[a-z0-9-]+$/);
    await expect(page.locator('h1')).toContainText('uchun');
    expect((await jsonLd(page)).some((d) => d['@type'] === 'CollectionPage')).toBe(true);

    const href = await page
      .locator('nav a')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? '').find((h) => /^\/uz\/cars\/[a-z0-9-]+\/[a-z-]+$/.test(h)));
    test.skip(!href, 'The model has no section links');
    await page.goto(href!);
    await expect(page.locator('h1')).toContainText('uchun');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${href!}$`));
  });

  test('an unknown car model is a 404', async ({ page }) => {
    const res = await page.goto('/uz/cars/no-such-model-e2e');
    expect(res?.status()).toBe(404);
  });

  test('plans page carries the prices as structured data', async ({ page }) => {
    await page.goto('/uz/plans');
    const plans = (await jsonLd(page)).find((d) => d['@type'] === 'Product' && String(d['@id']).endsWith('#plans'));
    test.skip(!plans, 'No active plans in the database');
    const offers = plans!['offers'] as Record<string, unknown>;
    expect(offers['@type']).toBe('AggregateOffer');
    expect(Number(offers['offerCount'])).toBeGreaterThan(0);
  });

  test('home page title fits in a search result (60 characters)', async ({ page }) => {
    for (const locale of ['uz', 'ru', 'en']) {
      await page.goto(`/${locale}`);
      expect((await page.title()).length).toBeLessThanOrEqual(60);
    }
  });

  test('sitemap lists the car model pages', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('<urlset');
    if (xml.includes('/shop/')) expect(xml).toMatch(/\/uz\/cars(<|\/)/);
  });
});
