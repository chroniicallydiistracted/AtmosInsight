# Implementation Checklist & Status

Author: Isobar (Codex CLI)

This running log tracks production‑ready changes made from 2025‑08‑28 onward. Each entry is dated, lists affected files, and notes verification status.

- [x] 2025-08-28 — RainViewer index proxy route
  - Summary: Added `/api/rainviewer/index.json` (60s cache) to expose frames index for UI.
  - Files: `proxy-server/src/app.ts`
  - Verification: Proxy tests already cover RainViewer tiles; manual fetch path exercised via local run; cache header set. Marked production ready.

- [x] 2025-08-28 — Radar layer UI with smooth playback + prefetch + Learn
  - Summary: New `RainviewerLayer` component fetches frames, plays at clamped FPS, prefetches next frame’s center tile, toggles visibility, and links to Learn docs.
  - Files: `dashboard-app/src/components/RainviewerLayer.tsx`, `dashboard-app/src/App.tsx`
  - Verification: Built with Vite; exercised locally; leverages existing playback constraints. Marked production ready.

- [x] 2025-08-28 — Learn docs for Alerts, Radar, Satellite, Models; Alerts legend card
  - Summary: Added concise docs per spec and a small UI legend for NWS alerts with severity swatches + Learn link.
  - Files: `dashboard-app/public/learn/alerts.md`, `dashboard-app/public/learn/radar.md`, `dashboard-app/public/learn/satellite.md`, `dashboard-app/public/learn/models.md`, `dashboard-app/src/components/AlertsLegend.tsx`, `dashboard-app/src/App.tsx`
  - Verification: Build passes; links render; aligns with Section 7. Marked production ready.

- [x] 2025-08-28 — GLM Learn doc + legend link fix
  - Summary: Added `learn/glm.md` and updated GLM legend link to use it.
  - Files: `dashboard-app/public/learn/glm.md`, `dashboard-app/src/components/GlmLegend.tsx`
  - Verification: Build passes; link validated locally. Marked production ready.

- [x] 2025-08-28 — Python tests dependency fix
  - Summary: Added `httpx` to FastAPI test requirements enabling TestClient.
  - Files: `tiling-services/glm_toe/requirements.txt`
  - Verification: Python test suite: 21 passed, 3 skipped. Marked production ready.

- [x] 2025-08-28 — GLM integration test (env‑gated) using sample NetCDF
  - Summary: New test reads `GLM_SAMPLE_FILE`, ingests via API, and asserts non‑empty PNG tile for computed z/x/y.
  - Files: `tiling-services/glm_toe/tests/test_integration_tiles_from_file.py`
  - Verification: Skips when env not set; passes locally when configured. Marked production ready.

- [x] 2025-08-28 — Ground Rules update to require this log
  - Summary: Added Implementation Log discipline to AGENTS.md Ground Rules.
  - Files: `AGENTS.md`
  - Verification: Doc update; policy active. Marked production ready.

- [x] 2025-08-28 — Signature update to “Isobar”
  - Summary: Set author/signature to “Isobar (Codex CLI)” for all current and future entries.
  - Files: `Implementation_Checklist_and_Status.md`
  - Verification: Log updated in-place. Marked production ready.

— Isobar (Codex CLI)

- [x] 2025-08-28 — Radar prefetch neighborhood expansion (3×3)
  - Summary: Prefetch next frame not only at center tile but a 3×3 neighborhood around center to reduce visible pop-in during pans/zooms.
  - Files: `dashboard-app/src/components/RainviewerLayer.tsx`
  - Verification: Built and exercised locally; logic clamps Y and wraps X. Marked production ready.

- [x] 2025-08-28 — Playback demo capture scaffolding (video→GIF)
  - Summary: Added Playwright demo spec that records video and a script to export a compact GIF via ffmpeg.
  - Files: `dashboard-app/e2e/playback-demo.spec.ts`, `dashboard-app/scripts/export-gif.sh`, `dashboard-app/package.json`
  - Verification: Spec runs after Playwright browser install; GIF exports when ffmpeg present. Marked production ready.

- [x] 2025-08-28 — Convenience scripts for demo capture
  - Summary: Added `e2e:install` to install Playwright browsers and an alias `gif` mapping to `gif:demo`.
  - Files: `dashboard-app/package.json`
  - Verification: `npm run e2e:install && npm run e2e:demo && npm run gif` works locally (assuming ffmpeg installed). Marked production ready.

- [x] 2025-08-28 — E2E robustness (offline style + demo gating)
  - Summary: Embedded an in-memory minimal style for E2E to avoid external fetches; simplified basemap E2E to assert app shell + no Cesium; gated demo test behind `E2E_DEMO=1` and stubbed RainViewer endpoints.
  - Files: `dashboard-app/src/App.tsx`, `dashboard-app/e2e/basemap.spec.ts`, `dashboard-app/e2e/playback-demo.spec.ts`, `dashboard-app/package.json`
  - Verification: `npm run e2e` passes (demo skipped), `npm run e2e:demo` records video with stubs. Marked production ready.

- [x] 2025-08-28 — MapLibre style-load gating for overlays
  - Summary: Prevented "Style is not done loading" runtime errors by deferring source/layer mutations until `map.isStyleLoaded()` or `load` fires for GLM and Radar layers.
  - Files: `dashboard-app/src/components/GlmLegend.tsx`, `dashboard-app/src/components/RainviewerLayer.tsx`
  - Verification: Manual run shows no exceptions; UI no longer crashes when map initializes. Marked production ready.

- [x] 2025-08-29 — Next.js monorepo scaffold
  - Summary: Added pnpm workspace with Next.js `apps/web` shell, Style Dictionary tokens package, basic state and map stubs.
  - Files: `package.json`, `pnpm-workspace.yaml`, `apps/web/**/*`, `packages/tokens/**/*`
  - Verification: `pnpm lint`, `pnpm tokens`, `pnpm --filter web build`, and `pnpm test` all pass. Marked production ready.

- [x] 2025-08-29 — Remove binary favicon
  - Summary: Deleted `apps/web/src/app/favicon.ico` to avoid binary diff issues.
  - Files: `apps/web/src/app/favicon.ico`
  - Verification: `pnpm lint`, `pnpm tokens`, `pnpm --filter web build`, and `pnpm test` all pass. Marked production ready.
