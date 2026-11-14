import { test, expect, type Page, type Route } from '@playwright/test';
import sharp from 'sharp';

/**
 * The whole "try parts on my car" flow without a single real AI call: sign-in, catalog and the AI
 * render answers are mocked in the browser; every other request goes to the dev server.
 *
 * Checked: one request per photographed side, the best 3/4 view first, the next side sends that
 * finished render as its same-build reference, nothing calls the car check (Gemini) again, the
 * result page shows before/after, and "Not right" sends the reason for that picture.
 */

// Allowed by the app's Content-Security-Policy (img-src), and never really fetched: the test serves it.
const RENDER_HOST = 'https://storage.googleapis.com/falserverless/e2e';
const renderUrl = (angle: string) => `${RENDER_HOST}/${angle}.jpg`;

const USER = {
  id: '00000000-0000-4000-8000-0000000000e2',
  email: 'e2e@example.test',
  phone: '',
  full_name: 'E2E Customer',
  role: 'b2c_user',
  credits_balance: 40,
};

const WHEEL = {
  id: 'e2e-wheel',
  name: 'E2E Forged Wheel 19"',
  brand: 'E2E',
  category: 'Wheels',
  price: 900,
  spec: '19" forged',
  rating: 5,
  stock: 4,
  image: `${RENDER_HOST}/wheel.jpg`,
  isUniversal: true,
};

let jpeg: Buffer;
let photoDataUrl: string;

test.beforeAll(async () => {
  jpeg = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#2f3b4c' } }).jpeg().toBuffer();
  photoDataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
});

interface Captured {
  renders: Array<Record<string, unknown>>;
  feedback: Array<Record<string, unknown>>;
  carChecks: number;
}

async function setUp(page: Page): Promise<Captured> {
  const captured: Captured = { renders: [], feedback: [], carChecks: 0 };
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route('**/api/v1/auth/me', (route) => json(route, { success: true, user: USER }));
  await page.route('**/api/v1/products?**', (route) => json(route, { success: true, products: [WHEEL] }));
  await page.route('**/api/v1/vehicles/detect**', (route) => {
    captured.carChecks += 1;
    return json(route, { success: false }, 500);
  });
  await page.route('**/api/v1/generations/feedback', async (route) => {
    captured.feedback.push(route.request().postDataJSON() as Record<string, unknown>);
    return json(route, { success: true });
  });
  await page.route('**/api/v1/generations', async (route) => {
    if (route.request().method() !== 'POST') return json(route, { success: true, generations: [] });
    const body = route.request().postDataJSON() as Record<string, unknown>;
    captured.renders.push(body);
    const angle = String(body['angleId']);
    return json(route, {
      success: true,
      generation: {
        id: `gen-${angle}`,
        afterImageUrl: renderUrl(angle),
        liveApiActive: true,
        providerUsed: 'e2e-mock',
        creditsCharged: 1,
        creditsRemaining: USER.credits_balance - captured.renders.length,
        status: 'COMPLETED',
        resolution: 'AI render',
        durationSeconds: 0,
      },
    });
  });
  await page.route(`${RENDER_HOST}/**`, (route) => route.fulfill({ status: 200, contentType: 'image/jpeg', body: jpeg }));

  // A signed-in customer whose car (two photographed sides) was already confirmed, with a wheel picked.
  await page.addInitScript(
    ({ photo, user, wheelId }) => {
      if (sessionStorage.getItem('e2e_seeded')) return;
      sessionStorage.setItem('e2e_seeded', '1');
      const stamp = 'e2e-capture';
      sessionStorage.setItem('carvision_captured_at', stamp);
      sessionStorage.setItem('carvision_car_confirmed_for', stamp);
      sessionStorage.setItem('veloce_photo', photo);
      sessionStorage.setItem('carvision_multi_angles', JSON.stringify({ front: photo, 'front-left': photo }));
      sessionStorage.setItem('carvision_tablet_selected_parts', JSON.stringify([wheelId]));
      localStorage.setItem('carvision_my_car', JSON.stringify({ modelId: 'e2e-model', label: 'Chevrolet Gentra', year: 2020 }));
      localStorage.setItem('carvision_active_profile_v2', JSON.stringify(user));
    },
    { photo: photoDataUrl, user: USER, wheelId: WHEEL.id }
  );
  return captured;
}

test.describe('Render flow (mocked AI)', () => {
  test('renders every side, hero first, with the same-build reference, and takes feedback', async ({ page }) => {
    test.setTimeout(90_000);
    const captured = await setUp(page);

    await page.goto('/uz/customize');
    // The wheel is in the build (picked before the page opened).
    await expect(page.getByText(WHEEL.name).first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /natijani ko/i }).first().click();

    // Both sides rendered: the 3/4 view first, the front second with the first result as its reference.
    await expect.poll(() => captured.renders.length, { timeout: 30_000 }).toBe(2);
    const [hero, second] = captured.renders;
    expect(hero?.['angleId']).toBe('front-left');
    expect(hero?.['referenceAfterUrl']).toBeUndefined();
    expect(second?.['angleId']).toBe('front');
    expect(second?.['referenceAfterUrl']).toBe(renderUrl('front-left'));
    for (const body of captured.renders) {
      const parts = body['parts'] as Array<Record<string, unknown>>;
      expect(parts.map((p) => p['id'])).toEqual([WHEEL.id]);
      expect(String(body['photo'])).toMatch(/^data:image\/jpeg;base64,/);
    }
    expect(captured.carChecks).toBe(0);

    // Result page: before / after of a rendered side.
    await page.getByRole('dialog').getByRole('button', { name: /natijani ko/i }).click();
    await page.waitForURL(/\/uz\/customize\/result/, { timeout: 30_000 });
    await expect(page.locator(`img[src="${renderUrl('front-left')}"]`).first()).toBeVisible();

    // "Not right": pick a reason, send, and the server gets that picture and reason.
    await page.getByRole('button', { name: 'Yoqmadi' }).click();
    await page.getByRole('radio', { name: "Rang noto'g'ri" }).click();
    await page.getByRole('button', { name: 'Yuborish' }).click();
    await expect.poll(() => captured.feedback.length).toBe(1);
    expect(captured.feedback[0]).toMatchObject({ url: renderUrl('front-left'), reason: 'wrong_color' });
  });
});
