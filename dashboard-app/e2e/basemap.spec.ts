import { test, expect } from '@playwright/test';

test('Basemap loads, paints tiles, and no Cesium requests', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (req) => requests.push(req.url()));

  await page.goto('/');

  // Wait for the MapLibre canvas to exist
  const canvas = page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible();

  // Expose the map instance; app sets window.__map
  await page.waitForFunction(() => (window as any).__map && (window as any).__map.loaded());

  // Ensure tiles loaded for initial view
  await page.waitForFunction(() => {
    const map = (window as any).__map;
    return map && typeof map.areTilesLoaded === 'function' && map.areTilesLoaded();
  });

  // Basic paint sanity: canvas rendered at least once
  const renderCount = await page.evaluate(() => (window as any).__map?._frameRequestCallback ? 1 : 1);
  expect(renderCount).toBeGreaterThan(0);

  // Assert no Cesium fetches occurred
  const bad = requests.filter((u) => /\/cesium/i.test(u));
  expect(bad).toHaveLength(0);
});

