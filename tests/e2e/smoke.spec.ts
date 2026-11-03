import { test, expect } from '@playwright/test';

test.describe('Smoke', () => {
  test('landing page renders', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle(/CarVision/i);
  });

  test('Arabic locale is right-to-left', async ({ page }) => {
    await page.goto('/ar');
    expect(await page.locator('html').getAttribute('dir')).toBe('rtl');
  });

  test('admin area is hidden from guests', async ({ page }) => {
    const res = await page.goto('/en/admin');
    expect(res?.status()).toBe(404);
  });
});
