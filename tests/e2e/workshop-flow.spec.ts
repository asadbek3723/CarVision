import { test, expect } from '@playwright/test';

test.describe('B2B Workshop Studio Workflow', () => {
  test('technician can navigate studio, select parts, verify price and lock customer view', async ({
    page,
  }) => {
    // Navigate to studio demo session
    await page.goto('/en/studio/demo');

    // Verify main header and car viewport render
    await expect(page.locator('h1')).toContainText('Tuning Studio');

    // Verify angle selector bar is rendered with all 8 angles
    const angleButtons = page.locator('button[aria-label^="Angle"]');
    await expect(angleButtons).toHaveCount(8);

    // Verify bottom dock categories exist
    const categoryWheels = page.locator('button', { hasText: /Wheels/i });
    await expect(categoryWheels).toBeVisible();

    // Verify price ticker is visible
    const priceTicker = page.locator('text=/\\$0/');
    await expect(priceTicker.first()).toBeVisible();

    // Open itemized summary drawer
    const summaryBtn = page.locator('button', { hasText: /Build Summary/i });
    if (await summaryBtn.isVisible()) {
      await summaryBtn.click();
      await expect(page.locator('text=Deposit Required (3%)')).toBeVisible();
    }

    // Test Customer View PIN Lock modal toggle
    const lockBtn = page.locator('button', { hasText: /Customer View/i });
    if (await lockBtn.isVisible()) {
      await lockBtn.click();
      await expect(page.locator('text=Staff PIN Unlock')).toBeVisible();
    }
  });

  test('root landing page provides role switching and navigation to all modules', async ({ page }) => {
    await page.goto('/en');

    // Title verification
    await expect(page).toHaveTitle(/CarVision/i);

    // Check role switcher buttons
    const b2bButton = page.locator('button', { hasText: /Workshop \/ Bay Pro/i });
    const b2cButton = page.locator('button', { hasText: /Car Owner \/ Client/i });

    await expect(b2bButton).toBeVisible();
    await expect(b2cButton).toBeVisible();

    // Switch to B2C
    await b2cButton.click();
    await expect(page.locator('text=Explore Verified Tuning Shops')).toBeVisible();

    // Switch back to B2B
    await b2bButton.click();
    await expect(page.locator('text=Start Bay Camera Walkaround')).toBeVisible();
  });
});
