import { test, expect } from '@playwright/test';

test('Basemap loads (no Cesium requests)', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (req) => requests.push(req.url()));
  page.on('console', (msg) => console.log('[console]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  await page.goto('/');

  // App shell visible
  await expect(page.locator('#root')).toBeVisible();
  await expect(page.locator('.map-container')).toBeVisible();

  // Assert no Cesium fetches occurred
  const bad = requests.filter((u) => /\/cesium/i.test(u));
  expect(bad).toHaveLength(0);
});
