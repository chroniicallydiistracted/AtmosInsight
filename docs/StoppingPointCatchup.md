# Stopping Point Catch‑Up — AtmosInsight

Date: 2025‑08‑28 (UTC)
Author: Codex CLI Assistant

## Executive Summary

Today’s work delivers a production‑ready proxy layer (GIBS/OWM/RainViewer/NWS), playback smoothness controls, a Sun/Moon module, a Playwright E2E for the basemap, and a high‑quality GLM TOE backend with a Python FastAPI service, real GLM L2 ingestion from NOAA S3, and windowed tile rendering. CI is wired for unit/integration/E2E across projects. A v0.1.0 release PR is open.

## Completed Today

- Proxy Server (Node/Express, TypeScript)
  - GIBS WMTS REST + DescribeDomains + redirect helper + 60s cache
    - Endpoints: `/api/gibs/tile/...`, `/api/gibs/domains/...`, `/api/gibs/redirect`
    - File(s): `proxy-server/src/app.ts`, `proxy-server/src/gibs.ts`
    - Tests: `proxy-server/test/gibs.test.ts` (reliable layers only)
  - OpenWeatherMap tiles proxy + allowlist + 60s cache
    - Endpoint: `/api/owm/:layer/:z/:x/:y.png`
    - Files: `proxy-server/src/owm.ts`
    - Tests: `proxy-server/test/owm.test.ts` (skips if `OPENWEATHER_API_KEY` unset)
  - RainViewer frames proxy + fallback + 60s cache
    - Endpoint: `/api/rainviewer/:ts/:size/:z/:x/:y/:color/:options.png`
    - Files: `proxy-server/src/rainviewer.ts`
    - Tests: `proxy-server/test/rainviewer.test.ts`
  - NWS alerts proxy (required User‑Agent + Accept) — map styling wired in app
    - Endpoint: `/api/nws/alerts/*`
    - Files: `proxy-server/src/app.ts`
    - Tests: `proxy-server/test/nws.test.ts`
  - Cache headers normalized (short‑lived 60s across tiles)

- Web App (Next.js)
  - Playback smoothness utilities
    - FPS clamp (2–8, default 4), gating if insufficient frames, prefetch next frame
    - Files: `apps/web/src/utils/playback.ts` (+ tests)
    - Timeline integration: `apps/web/src/components/Timeline.tsx`
  - Sun/Moon module (deterministic, offline‑capable)
    - Compute azimuth/elevation/phase/distance; `suncalc`
    - Files: `apps/web/src/astro/astro.ts` (+ tests)
    - UI widget: `apps/web/src/components/AstroPanel.tsx`
  - Basemap E2E (Playwright): verifies style load and that tiles paint; asserts no `/cesium` requests
    - Files: `apps/web/e2e/basemap.spec.ts`, `apps/web/playwright.config.ts`
  - Vite dev proxy for `/api/*` to `localhost:3000` for smooth DX

- GLM TOE — High‑Quality Backend
  - Node MVP retained (feature‑flagged) and proxied to Python FastAPI when available (`GLM_TOE_PY_URL`)
    - Files: `proxy-server/src/app.ts`
    - Tests: `proxy-server/test/glm-toe.*.ts`
  - Python FastAPI service (Phase 1 & 2 groundwork)
    - App: `tiling-services/glm_toe/app/main.py`
    - Ingestion module: `tiling-services/glm_toe/app/ingest_glm.py`
    - Tests: `tiling-services/glm_toe/tests/test_app.py`, `tiling-services/glm_toe/tests/test_ingest_glm.py` (skips if `GLM_SAMPLE_FILE` unset)
    - Real GLM ingestion: supports `s3://noaa-goes16/GLM-L2-LCFA/...` via anonymous fsspec download to temp + `netCDF4`
    - Time handling: parses `event_time` or `event_time_offset` + `time_coverage_start`, falls back to filename; converts J→fJ
    - Windowed tiles: default 5 minutes; `?window=1m|5m|300s|180000ms&t=ISO8601Z`
    - Background poller (env‑gated): discovers latest granules and ingests on an interval
    - Docs: `tiling-services/glm_toe/README.md` (headless runs, endpoints, windowing)
  - Verified end‑to‑end on real GLM L2: ≈140k events ingested, tiles render via Node proxy

- CI/CD & Docs
  - GitHub Actions: proxy tests, app unit tests, app E2E, Python service pytest
    - File: `.github/workflows/ci.yml`
  - Env hygiene & templates
    - `.gitignore` ignores `.env` and `.venv/` (Python venvs)
    - `proxy-server/.env.example`, `apps/web/.env.example`
  - Release notes & version bump
    - `dev/update.md` (v0.1.0), `README.md` notes, PR opened (`release/v0.1.0`)

## Partially Implemented / Deferred

- GLM precise ABI 2×2 km fixed‑grid accumulation (pyproj geostationary)
  - Current renderer bins directly in Web Mercator tile space at ~2 km step — acceptable MVP but not canonical.
  - Next: accumulate in ABI grid, then resample for Web Mercator tiles.
- GLM QC filtering
  - Optional strict mode to apply L2 quality flags; plumbing in place (qc param reserved) — implement flag logic.
- GLM tile cache (LRU)
  - Cache recent tiles by `(z,x,y,window,t)` to reduce render costs under load.
- GLM S3 poller enablement and tuning in prod
  - Env‑gated; defaults off; needs monitoring and logging.
- Learn popovers (global)
  - Placeholder docs exist; need `learn/*.md` per layer + link from legends.
- PWA/A11y/Telemetry/Data‑catalog validation
  - Sections 9–11 in AGENTS.md not built out yet; unit tests for data catalog validators pending.

## Immediate Next Steps

1. GLM — Exact ABI Fixed Grid
   - Add geostationary projection (pyproj) and map event lon/lat to ABI grid indices.
   - Accumulate TOE on the ABI grid over `window` and optional `t`.
   - Resample ABI grid subset to Web Mercator tile at render time; keep color ramp consistent.
   - Add snapshot tests to validate grid mapping stability.

2. GLM — QC Flags and Tile Cache
   - Implement configurable QC masks per L2 docs.
   - Add a small LRU cache keyed by `(z,x,y,window,t)`; invalidate on new ingests.

3. GLM — Poller & Deterministic Caching
   - Gate S3 poller via env; add minimal structured logs.
   - When `t` is present, set Cache‑Control for deterministic tiles (immutable short TTL or ETag‑based).

4. UI — GLM Layer + Learn
   - Add a MapLibre raster source for GLM TOE tiles, with a togglable legend and “Learn” link.
   - Document units (fJ), window, and limitations (cloud‑top, parallax).

5. Validation & CI
   - Add integration test using `GLM_SAMPLE_FILE` (small local fixture) for deterministic CI.
   - Ensure CI marks GLM live/S3 tests as optional/skipped without sample.

## How to Run / Verify (headless)

- Python GLM service
  ```bash
  cd tiling-services/glm_toe
  python3 -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  nohup uvicorn app.main:app --host 127.0.0.1 --port 8080 > glm_toe.log 2>&1 & disown
  curl -s http://127.0.0.1:8080/health
  ```
- Ingest a real GLM granule (example; replace with actual key or use `/ingest_files` from docs)
  ```bash
  curl -X POST http://127.0.0.1:8080/ingest_files \
    -H 'Content-Type: application/json' \
    -d '{"paths":["s3://noaa-goes16/GLM-L2-LCFA/YYYY/DDD/HH/OR_GLM-L2-LCFA_G16_....nc"]}'
  ```
- Node proxy (GLM → Python)
  ```bash
  cd proxy-server
  # .env includes GLM_TOE_ENABLED=true and GLM_TOE_PY_URL=http://127.0.0.1:8080
  npm run build
  nohup npm start > proxy.log 2>&1 & disown
  curl -I "http://127.0.0.1:3000/api/glm-toe/6/11/27.png?window=5m"
  ```
- App E2E (optional)
  ```bash
  cd apps/web
  npx playwright install --with-deps
  npm run e2e
  ```

## Risks / Notes

- Public S3 listing formats may evolve; the poller and discovery scripts use best‑effort, simple methods.
- Real‑time GLM volumes surge during severe weather; ensure memory usage is bounded (rolling window + pruning).
- CI stability: live S3 access should be optional; rely on sample files for deterministic runs.

## References

- GLM L2 (LCFA) — NOAA S3 Open Data (G16/G18) — public/anonymous
- Guides in repo root: `GLM_Lightning_HeatMap_guide.md`, `GLM_HeatMap_QuickGuide.md`
- Service docs: `tiling-services/glm_toe/README.md`
- AGENTS spec: `AGENTS.md`

---

End of day snapshot complete. Next milestone: GLM ABI fixed‑grid accumulation + QC + cache.
