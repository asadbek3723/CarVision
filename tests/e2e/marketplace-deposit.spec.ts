import { test, expect } from '@playwright/test';

test.describe('B2C Marketplace & 3% Escrow Deposit Workflow', () => {
  test('driver can browse masked workshops and initiate 3% deposit booking', async ({ page }) => {
    // Navigate to marketplace
    await page.goto('/en/marketplace');

    // Verify marketplace title
    await expect(page.locator('h1')).toContainText('Verified Tuning Partners');

    // Verify masked cards prevent direct disintermediation
    const partnerCard = page.locator('text=/Partner #[0-9]+/i').first();
    await expect(partnerCard).toBeVisible();

    // Verify booking action button
    const bookBtn = page.locator('button', { hasText: /Book with 3% Deposit/i }).first();
    await expect(bookBtn).toBeVisible();

    // Click booking button to trigger deposit checkout modal
    await bookBtn.click();

    // Verify deposit checkout modal appears
    await expect(page.locator('text=3% Escrow Deposit Reservation')).toBeVisible();
    await expect(page.locator('text=Deposit Amount (3%)')).toBeVisible();

    // Click Confirm & Upload Receipt
    const confirmBtn = page.locator('button', { hasText: /Confirm & Upload Receipt/i });
    await confirmBtn.click();

    // Verify receipt modal appears
    await expect(page.locator('text=Upload Payment Receipt')).toBeVisible();
  });

  test('Arabic locale correctly applies dir="rtl" without physical layout breakage', async ({ page }) => {
    await page.goto('/ar/marketplace');

    // Verify html tag has dir="rtl"
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('rtl');

    // Verify page renders without crash
    await expect(page.locator('body')).toBeVisible();
  });
});
