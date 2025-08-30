# AGENTS.md — Execution Spec for “Vortexa / AtmosInsight”

**Purpose**  
This file instructs autonomous coding agents (Codex or equivalent) exactly what to build, fix, and verify next in the **Vortexa** repo. It is exhaustive and prescriptive. Follow the acceptance criteria precisely. When an item is completed and merged, **strike it through** using `~~like this~~` **and** check the box `[x]`. Do not guess; when an external spec is referenced, follow it verbatim.

---

## 0) Ground Rules (must-read before any work)

- **License & cost posture:** Favor public-domain/OSS sources. No paid/commercial dependencies unless explicitly approved.
- **Stack (current baseline):** React + Vite SPA; 2D (Mapbox GL JS) + 3D (CesiumJS). Delivery: S3 behind CloudFront (OAC), ACM in us-east-1, custom domain, Node/Express TypeScript proxy, optional S3 tile cache, CORS allow-list. Alerts pipeline: AWS Lambda (Node 20) + EventBridge + DynamoDB (TTL). Infra via Terraform.
- **Performance:** Radar playback must be smooth; target **60 FPS render budget** with **clamped animation FPS 2–8 (default 4)**, prefetch next frame, and hyper-minimal layout thrash.
- **Security/secrets:** Never commit credentials. Use `.env` or AWS Parameter Store.
- **A11y:** Keyboard nav, contrast, reduced-motion fallback.
- **Definition of done (DoD):** Code + tests + docs + reproducible local runs + CI green + demo GIF where indicated.

- **Implementation log discipline:** Maintain `Implementation_Checklist_and_Status.md` at the repo root. For every change going forward, add a dated entry describing what was implemented, why, linked files/paths, and mark it “production ready” only when verified. This document must be kept current and is part of the DoD.

Additional directive (2025-08-28): Prioritize highest quality. When trade-offs arise, choose correctness, reliability, and maintainability (e.g., dedicated Python service for GLM NetCDF4 ingestion and precise ABI 2×2 km grid mapping) even if that increases complexity.

---

## 1) Proxy & Tile Services — Fix 400s, Normalize WMTS/XYZ

**Goal:** All upstream map layers (NASA GIBS/GOES, OWM, RainViewer, NWS alerts overlays) fetch without 4xx; URLs are formed exactly to provider specs; caching headers are correct.

### 1.1 Implement canonical GIBS WMTS & XYZ adapters

- Add a proxy route family at **`/api/gibs/tile/...`** that maps to GIBS WMTS REST and KVP styles.
- **WMTS REST template** (official):  
  `https://gibs.earthdata.nasa.gov/wmts/epsg{EPSG}/best/{LayerIdentifier}/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.{FormatExt}`.
  - If `Time` is omitted, GIBS returns the layer’s **<Default>** date; `default` keyword is also supported. **Do not** use `current` (not supported). citeturn1view0
- Include **DescribeDomains** support to enumerate time ranges beyond the latest 100 periods:  
  REST pattern: `/wmts/epsg4326/best/{LayerIdentifier}/default/{TileMatrixSet}/all/{Start--End}.xml`. citeturn1view0
- Expose a **pretty XYZ alias** that leaves `{z}/{x}/{y}` client-filled while pre-populating projection/layer/time/set, per GIBS guidance (e.g., Web Mercator):  
  `.../wmts/epsg3857/best/{Layer}/default/{YYYY-MM-DD}/GoogleMapsCompatible_Level{N}/{z}/{y}/{x}.png`. citeturn1view0
- **Acceptance tests:**
  - Unit: URL builder yields exact strings for EPSG:3857/4326, time omitted vs `default`, and DescribeDomains requests.
  - Integration: Known public layer returns **200** PNG/JPEG for **z=3, x=2, y=1** and today’s **default** date.

- [x] ~~Implement `/api/gibs/tile/:epsg/:layer/:time/:tms/:z/:y/:x.:ext` (time optional; default if omitted).~~
- [x] ~~Implement `/api/gibs/domains/:epsg/:layer/:tms/:range.xml` pass-through (e.g., `all`, `YYYY-MM-DD--YYYY-MM-DD`).~~
- [x] ~~Unit tests coverage ≥95% for URL formation edge cases.~~
- [x] ~~Integration tests hit 2–3 representative layers (geo color, aerosol/infrared) with **200** responses.~~

### 1.2 Add WMTS Redirect Helper

- [x] ~~Provide `/api/gibs/redirect?...` that 302-redirects from a short query to the canonical REST URL, minimizing client complexity.~~
- [x] ~~302 from `?layer=...&epsg=3857&time=default&tms=GoogleMapsCompatible_Level6&z=..&x=..&y=..` to canonical REST.~~
- [x] ~~CSP/safe redirect checks (only to `gibs.earthdata.nasa.gov`).~~

### 1.3 OpenWeatherMap (OWM) tiles

- Implement proxy pass-through for OWM map layers (e.g., `clouds_new`, `precipitation_new`) using the **official** format:  
  `https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={API key}`. citeturn2view0
- Add `OWM_API_KEY` env; blocklist unknown `layer` names; cache **60s**.
- [x] ~~`/api/owm/:layer/:z/:x/:y.png` → upstream; returns **200** for baseline layers with valid key.~~

### 1.4 RainViewer radar frames

- Use **Weather Maps API** index JSON: `https://api.rainviewer.com/public/weather-maps.json` to obtain `host` and per-frame `path` entries. citeturn3view0
- Construct tiles with:  
  `{host}{path}/{size}/{z}/{x}/{y}/{color}/{options}.png` (e.g., size 256 or 512; options `smooth_snow` like `1_0`). Note RainViewer’s 2025–2026 transition and zoom limits; handle gracefully. citeturn3view0
- [x] ~~`/api/rainviewer/:ts/:size/:z/:x/:y/:color/:options.png` → rewrites to `{host}{path}...` for `ts` found in `past`/`nowcast`.~~
- [x] ~~Fallback logic when frames deprecate (per transition notes).~~

### 1.5 Cache middleware & headers (normalize)

- Use existing `immutable1h` and `shortLived60` middlewares.
- GIBS tiles → **short-lived (60s)**; OWM → **60s**; RainViewer → **60s**; static assets/icons → **immutable**.
- [x] ~~Verify `Cache-Control` values via integration tests.~~

---

## 2) Alerts API (NWS) — Fix failures & headers

**Goal:** Eliminate 4xx/403 from **api.weather.gov** and render CAP/GeoJSON alerts on the map.

- **User-Agent is required** by NWS API. Include a distinctive string; include contact email. Example header:  
  `User-Agent: (Vortexa, chroniicallydiistracted@gmail.com)`. citeturn0search0turn0search3
- Base URL: `https://api.weather.gov/alerts` (e.g., `/active`, or queries by area, status, zone). citeturn0search17
- Add automatic `Accept: application/geo+json` and robust retry on 429 with backoff.
- [x] ~~Proxy route `/api/nws/alerts/*` adds required headers and passes query through.~~
- [x] ~~Integration test: `/alerts/active?area=AZ` returns **200** with features array.~~
- [x] ~~Map layer renders polygons/lines with severity styling and click popovers.~~

---

## 3) Radar Playback Smoothness — Confirm & Lock

**Goal:** Keep buttery playback with strict controls.

- Ensure implemented features are present and tested:
  - **Prefetch next frame**
  - **Play gating** (disable play if <2 timestamps or last fetch errored)
  - **FPS clamp** between 2–8 (default **4**)
  - Optional tile cache sizing via `VITE_ENABLE_TILE_CACHE` flag
- [x] ~~Unit tests confirm FPS clamp bounds, gating logic, and prefetch scheduling.~~
- [ ] Demo GIF in PR showing stable FPS and no jank on 2G throttling.

---

## 4) Basemap & 3D — Verify in Dev & Prod

**Goal:** Basemap always shows in both `pnpm dev` and production build.

- [x] ~~E2E test boots app and asserts Mapbox style load event fired and base tiles painted.~~
- [x] ~~Confirm no stray `/cesium` network fetches (CESIUM_BASE_URL removed).~~
- [x] ~~Document any required tokens/env for base maps; ensure no hard-coded keys.~~

---

## 5) GOES-R GLM TOE Layer (backend pipeline, MVP)

**Goal:** Provide a live heatmap tile layer of **Total Optical Energy (TOE)** on a **2×2 km grid** over a rolling window from **GOES GLM Level-2** lightning detections.

**Authoritative facts to implement:**

- **TOE** = sum of optical energy observed by GLM within each grid cell over a specified period; units are **femtojoules (fJ)**; GLM gridded products use the **2×2 km ABI grid**. citeturn0search5turn0search19
- L2 GLM provides **events, groups, flashes** at ~20-second cadence; files are NetCDF. citeturn0search20

**Pipeline MVP (server-side):**

- Ingest recent L2 files for GOES-E/W (configurable time window, e.g., last 20–30 min), parse NetCDF, transform to 2×2 km grid, aggregate TOE per cell.
- Output a **server-rendered tile service** (XYZ or WMTS) producing PNG tiles with continuous or stepped color ramp.
- [ ] Implement `services/glm-toe/ingest.ts` (NetCDF reader + rolling window).
- [x] ~~Implement `services/glm-toe/tiles.ts` (XYZ endpoint).~~
- [x] ~~Unit tests: TOE aggregation for synthetic events; tile color mapping snapshot test.~~
- [ ] Integration: Tile `z=5,x=9,y=12` returns **200** with non-empty PNG when sample GLM files are present.
- [x] ~~README: exact data source URLs and operational notes.~~
- [x] ~~Feature flag to disable if data source unavailable.~~

Ongoing quality improvements:

- [x] Optional ABI fixed-grid accumulation (`GLM_USE_ABI_GRID`) + tests
- [x] QC filtering via `qc=true` using per-event `qc_ok` when available
- [x] Tile LRU cache + deterministic caching when `t` provided
- [x] Mid-latitude ABI validation test (cell size ≈2 km at ~35°N)

Implementation note: A high-quality Python FastAPI microservice (`tiling-services/glm_toe`) is being added for GLM L2 NetCDF ingestion and precise ABI grid mapping. The Node proxy (`proxy-server`) proxies `/api/glm-toe` to this service via `GLM_TOE_PY_URL` when configured; otherwise, it falls back to the Node MVP renderer.

---

## 6) Sun/Moon Positions, Phases, Distance

**Goal:** Deterministic, offline-capable astronomy panel.

- Use a vetted algorithm (e.g., NOAA SPA or equivalent OSS library) to compute Sun/Moon azimuth, elevation, phases, and Earth-Moon distance for the current/selected time.
- [x] ~~Pure function returning values in SI units, tested against known ephemerides.~~
- [x] ~~UI widget with tooltips and “Learn” link.~~

---

## 7) Educational “Learn” Popovers

**Goal:** Every data layer has a concise explainer with **definitions**, **update cadence**, **limitations**, and **original source**.

- [ ] Create `learn/*.md` entries for: radar, satellite (by channel), GLM lightning, model layers, alerts.
- [ ] Link from layer legend to its learn file.

---

## 8) AZ 511 Public Traffic Webcams (optional layer)

**Goal:** Display legal, rate-limited, public traffic camera thumbnails for situational awareness.

- **AZ511 provides a REST API** (cameras, signs, events, alerts) that **requires a developer key**; throttle: **10 calls / 60s**. citeturn4view0
- Build a minimal proxy that:
  - Caches camera **metadata** (id, name, coords, image URL) server-side (e.g., 5–10 minutes).
  - Re-hosts image fetches via server to avoid client CORS issues.
- [ ] `/api/az511/cameras` returns cached metadata subset.
- [ ] `/api/az511/camera/:id.jpg` streams the latest image.
- [ ] Map overlay: click to open 320–640px preview with timestamp.
- [ ] Respect terms; include attribution.

---

## 9) Data Catalog Validation (already started) — Extend

**Goal:** Prevent bad layer metadata at source.

- Keep Zod validators; add checks for **duplicate slugs**, **invalid TMS**, **missing attribution**, **bad time formats**.
- [ ] Unit tests with fixtures for each failure mode.
- [ ] Build continues with graceful fallback and visible UI error badge.

---

## 10) PWA, Accessibility, and Offline

- [ ] PWA manifest + service worker cache strategy (tiles: network-first with short TTL; app shell: stale-while-revalidate).
- [ ] A11y pass: tab order, ARIA labels, reduced-motion.
- [ ] Offline splash explaining limited functionality.

---

## 11) Telemetry & Budget Guardrails

- [ ] Add lightweight performance logging: tile response times, dropped frames during playback, error counts per upstream.
- [ ] No PII. Opt-in only.

---

## 12) CI/CD & Documentation

- [ ] CI runs unit/integration/E2E (headless browser) on PR.
- [ ] PR template enforces: Scope, URLs touched, screenshots/GIFs, and **checklist mapping** to this AGENTS.md.
- [ ] Update `README.md` with env vars:
  - `OWM_API_KEY`, `RAINVIEWER_ENABLED=true|false`, `NWS_USER_AGENT="(Vortexa, contact@example.com)"`, `GIBS_ENABLED=true|false`, any Mapbox/Cesium tokens.
- [ ] Add **references** section at end of README pointing to external docs used below.

---

## 13) Known External Specs (for strict conformance)

- **GIBS access basics (WMTS, time dimension, DescribeDomains, XYZ aliasing)** — Follow patterns exactly. citeturn1view0
- **OpenWeatherMap tiles URL format** — Use the documented `tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid=...`. citeturn2view0
- **RainViewer Weather Maps API** — Obtain `{host}`/`{path}` from JSON; construct tile URLs as documented; respect 2025–26 limitations. citeturn3view0
- **NWS API** — Always send `User-Agent`; base `https://api.weather.gov` and `/alerts` endpoints. citeturn0search0turn0search3turn0search17
- **GLM TOE concept & 2×2 km ABI grid** — Aggregate per grid cell; units in fJ; rely on Level-2 inputs. citeturn0search5turn0search19
- **AZ511 Developer API** — Requires key; cameras endpoint available; throttling constraints. citeturn4view0

---

## 14) Work Plan & Conventions (how to proceed)

- **Order of operations:**
  1. **NWS header fix** (fast win, eliminates alerts failures).
  2. **GIBS URL normalization** + redirect helper.
  3. **OWM & RainViewer** proxy routes.
  4. **Playback verification** (prefetch/gating/FPS clamp).
  5. **Basemap E2E** dev/prod parity.
  6. **GLM TOE MVP** pipeline.
  7. **AZ511 webcams** (optional).
  8. **Sun/Moon**, **Learn popovers**, PWA/A11y, telemetry.

- **Commit messages:** `feat(proxy): gibs wmts rest+kvp + redirect`, `fix(alerts): add NWS User-Agent`, `feat(radar): rainviewer frames via index`, etc.
- **PRs:** Small, scoped, each mapping to a section above with checked boxes. Provide **before/after** screenshots or GIFs.
- **Strike-through protocol:** When merged to `main`, **strike through the completed line(s)** and check the box, e.g., `- [x] ~~Implement /api/nws/alerts~~`.

---

## 15) Acceptance Checklist (global)

- [ ] No 4xx from GIBS, OWM, RainViewer, NWS in normal operation.
- [ ] Basemap loads in dev and production; no hidden env-only behavior.
- [ ] Radar playback smooth at default clamp (4 FPS), with prefetch and gating working.
- [ ] Alerts polygons visible with severity styling and functional popovers.
- [ ] GLM TOE tiles render and update over time window; documented units and legend.
- [ ] Docs: updated README, this AGENTS.md kept current (with strikes).
- [ ] CI: unit + integration + E2E all green.

---

## 16) Env Vars (placeholders only; do not commit secrets)

- `OWM_API_KEY` — OpenWeatherMap tile access.
- `NWS_USER_AGENT` — e.g., `(Vortexa, email@domain)` per NWS requirement. citeturn0search0turn0search3
- `RAINVIEWER_ENABLED` — Gate RainViewer integration.
- `GIBS_ENABLED` — Gate GIBS integration.
- `WEATHERKIT_TEAM_ID` — Apple Developer team identifier for signing.
- `WEATHERKIT_SERVICE_ID` — WeatherKit service identifier.
- `WEATHERKIT_KEY_ID` — Key ID for the WeatherKit private key.
- `WEATHERKIT_PRIVATE_KEY` — PEM-formatted key used for JWT signing.
- Mapbox/Cesium tokens as required by your chosen basemap providers.

---

## 17) Notes on Error Classes (to de-flake CI)

- Treat upstream **429/5xx** as **retryable** with capped exponential backoff (jitter).
- Gracefully degrade tiles (draw placeholder + toast) rather than crash playback.
- Log upstream URL **and** effective headers (minus secrets) on failures for triage.

---

## 18) References

- National Weather Service API — headers & usage. citeturn0search0turn0search3
- OpenWeatherMap Weather Maps — official tile URL format. citeturn2view0
- NASA GIBS — Access basics, WMTS time dimension, DescribeDomains, and XYZ aliasing. citeturn1view0
- RainViewer Weather Maps API (frames index + tile construction; 2025–26 transition). citeturn3view0
- GLM/GOES-R documentation — TOE definition; gridded products at 2×2 km. citeturn0search5turn0search19
- AZ511 developer API — cameras endpoint and key requirement. citeturn4view0

---

**Status discipline:** Keep this file authoritative. As tasks land, **check the box and strike through the exact line(s)**. Add new bullets only with clear DoD and tests.

## Backlog Churn (Revisit Later)

- NOAA fixed-grid line/element mapping using scanning angles (xi/eta) for ABI: current GEOS-based 2 km grid implementation is validated and performing as expected; revisit only if strict line/element parity is required for downstream interoperability.
- Palette themes for GLM ramp (bright/muted), with server-rendered ramp selection.
- Keyboard shortcut help overlay and more advanced A11y pass.
