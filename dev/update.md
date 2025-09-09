# AtmosInsight – Updates and Versions

## v0.1.0 (Initial proxy + playback + E2E)

What’s included:

- Proxy services: GIBS WMTS/DescribeDomains + redirect, OWM tiles (allowlist, 60s cache), NWS alerts proxy with required headers.
- Web app: Playback utilities with FPS clamp (2–8, default 4), play gating, prefetch next frame, and optional tile cache; Timeline wired with accessible controls.
- Alerts layer: Severity styling (fill/line/point) and click popovers rendered on the map.
- Basemap E2E: Playwright test ensures style loads, tiles paint, and no stray `/cesium` fetches.
- GLM TOE MVP: Feature-flagged aggregator + PNG tiles with unit, API, and snapshot tests; doc at `docs/glm-toe.md`.
- Env handling: `.env.example` in both `proxy-server/` and `apps/web/`, dotenv loaded by the proxy, Next.js dev proxy for `/api/*`.
- CI: GitHub Actions for proxy tests, app unit tests, and app E2E.

Pending (next iterations):

- GLM NetCDF L2 ingestion and exact ABI 2×2 km grid mapping; integration test using sample GLM files.
- Educational "Learn" popovers for all layers; PWA/A11y; telemetry.

How to run:

- Proxy tests: `cd proxy-server && cp .env.example .env && edit .env && npm ci && npm test`
- App tests: `cd apps/web && cp .env.example .env && npm ci && npm test`
- App E2E: `cd apps/web && npx playwright install --with-deps && npm run e2e`
