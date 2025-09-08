# Partial Repository Review

**Date**: September 8, 2025

This document summarizes a repository-wide review of the AtmosInsight codebase. Every directory was sampled to capture key behavior and outstanding issues. While minor omissions may remain, the notes below reflect an end-to-end pass through the project.

## Monorepo Overview
- Root `package.json` configures pnpm workspace scripts for building, linting, testing, and various port-scanning utilities.

## Web Application (`apps/web`)
- Next.js 14 web app with MapLibre map rendering and deck.gl integrations.
- `page.tsx` sets up raster basemap layers, switches to a fallback source on errors, and loads National Weather Service alerts dynamically.
- `apps/web/package.json` indicates the test script is a placeholder (`echo 'no tests'`).
- `layout.tsx` imports generated design token CSS and hardcodes the `theme-dark` class, requiring manual edits to switch themes.
- `ForecastPopover.tsx` uses the browser's geolocation API to fetch a forecast from `/api/forecast`, with TODOs for configurable units and source selection.
- `AlertsLegend.tsx` renders a color-coded severity key for NWS alerts.
- Utility modules provide radar playback helpers (`playback.ts`) and an LRU tile cache with image preloading (`tileCache.ts`).

### Additional Components and State
- `AstroPanel.tsx` polls the browser clock and geolocation to compute Sun and Moon azimuth/elevation via a `computeAstro` helper.
- `RainviewerLayer.tsx` animates radar frames with FPS clamping, tile prefetching, and an optional in-memory image cache.
- `Timeline.tsx` queries the catalog API for layer timestamps, hiding itself when the service returns 503 errors.
- `GlmLegend.tsx` toggles a GOES lightning layer and lets users adjust window, QC filtering, and timestamp parameters while wrapping map updates in silent `try/catch` blocks.
- `viewStore.ts` (Zustand) tracks active layers, time, and comparison state with helpers for toggling layer opacity and workspace.
- Several UI pieces are stubs: `cmdk/CommandMenu.tsx` keeps the menu permanently closed, `panel/LayersPanel.tsx` displays "No layers", `panel/StylePopover.tsx` renders a placeholder editor, and `toast/ToastHost.tsx` maintains an unused toast array.
- `cards/AssistantCard.tsx` renders a simple title/body card and `cards/ForecastPopover.tsx` is an empty placeholder.
- `compare/Divider.tsx` implements a draggable split bar for compare mode, reporting percent position through a callback.
- `timebar/Timebar.tsx` displays the current ISO timestamp from the view store.

### Web Libraries
- `lib/overlays/deckOverlay.ts` mounts a `MapboxOverlay` with `any` casting and exports empty `WindParticlesLayer` and `PointDensityLayer` stubs.
- `lib/state/url.ts` serializes and hydrates view state via `query-string` helpers.
- `lib/rag/client.ts` exposes a stubbed `explain` generator that yields a single placeholder chunk.
- `lib/astro/astro.ts` wraps the `suncalc` library to compute sun and moon azimuth, elevation, distance, and phase for a given time and location.

## Providers (`packages/providers`)
- Multiple provider modules interface with external weather and environmental APIs. Example: `nws.ts` constructs requests to `api.weather.gov` and fetches JSON responses using a customizable `User-Agent`.

### Additional Providers
- `nws-alerts.ts` builds query strings for the NWS alerts endpoint and forces `Accept: application/geo+json` and custom `User-Agent` headers when fetching.
- `gibs.ts` crafts NASA GIBS WMTS requests in REST, KVP, and XYZ forms, appending an `EARTHDATA_TOKEN` when defined.
- `earth-search.ts` crafts POST requests to Element84's STAC API and fetches JSON via `fetchWithRetry`.
- `openweather.ts` queries OpenWeatherMap's One Call 3.0 endpoint, throwing if `OPENWEATHER_API_KEY` is unset and returning raw JSON weather data.
- `planetary-computer.ts` posts bounding box searches to Microsoft's Planetary Computer STAC API without authentication support.
- `nexrad.ts` constructs NOAA NEXRAD S3 keys from station/time parameters and fetches Level‑2 binary data as an `ArrayBuffer`.

## Shared Utilities (`packages/shared-utils`)
- Loads port configuration from `config/ports.json` with fallback defaults and exposes a `PORTS` constant.
- Supplies helper functions for error/success responses and common HTTP status codes.
- Includes utilities for detecting and terminating processes on specific ports.
- Port checks first read `/AtmosInsight/config/ports.json` and rely on Unix commands (`lsof`, `ss`, `fuser`, `pkill`), limiting portability on non‑Unix hosts.
- Implements `fetchWithRetry` with timeout and exponential backoff logic.
- Offers a `latLonToTile` converter with tests verifying expected XYZ coordinates.

## Fetch Client (`packages/fetch-client`)
- Thin wrapper re-exporting `fetchWithRetry` for external packages.
- Vitest suite verifies retrying on rate limits, aborting on timeouts, and handling transient network errors.

## Proxy Constants (`packages/proxy-constants`)
- Defines base URLs for NWS, NASA GIBS, and OpenWeatherMap layers.
- Provides `buildGibsTileUrl` and `buildGibsDomainsUrl` helpers for WMTS requests; tests cover tile and domain URL generation.

## Design Tokens (`packages/tokens`)
 - `src/` JSON files declare primitive, semantic, light, and dark theme tokens.
 - `build.mjs` deep-merges primitives and semantic tokens with light/dark theme overrides, registers a custom `javascript/namedTokens` format, and emits CSS variables plus typed JS and declaration modules. A `--watch` flag uses `fs.watch` to rebuild on changes.

## Provider Tests (`packages/providers/test`)
- Vitest suites cover most provider modules, checking URL construction and header or API key injection. Example: `nws-alerts.test.ts` mocks `fetch` to verify custom `User-Agent` and `Accept` headers.

## Infrastructure (`infra`)
- Terraform configuration provisions S3 buckets, CloudFront distribution, DynamoDB table, and a PostGIS RDS instance.
- Reusable modules parameterize bucket names, versioning, and server-side encryption.
- `infra/modules/s3-bucket/main.tf` enables `force_destroy`, allowing buckets with data to be deleted without confirmation.
- `infra/modules/rds-postgis/main.tf` sets `skip_final_snapshot = true`, risking irreversible data loss on database removal.
- `infra/modules/cloudfront/main.tf` forwards all headers for `/api/*` requests, reducing cache effectiveness.
- `monitoring.tf` defines optional CloudWatch alarms for Lambda errors, API Gateway 4xx/5xx counts, latency, and CloudFront error rates.
- A standalone `proxy-only` stack bundles the proxy Lambda, wires it to API Gateway, and inlines API-key environment variables.

## Data Pipelines (`data-pipelines`)
- Placeholder README exists with no implementation details.

## Tiling Services (`tiling-services`)
- `catalog-api` exposes `/catalog/layers` and `/catalog/layers/{id}/times` by reading local `layers.json` and `times.json` files via a minimal HTTP handler.
- `proxy-api` is a Node.js Lambda-style handler forwarding `/api/*` requests to providers like NWS, OpenWeatherMap, RainViewer, Carto basemaps, NASA GIBS, and several air-quality services. The handler also proxies CyclOSM and standard OSM tiles, Carto basemaps, Tracestrack, FIRMS fire layers, and multiple air-quality APIs (AirNow, OpenAQ, PurpleAir, Meteomatics, Google Cloud). It adds CORS headers, short/medium cache control, and TODOs for Secrets Manager-backed API keys.
- `glm_toe` is a Python FastAPI service that ingests GLM Level-2 lightning data, caches rendered TOE tiles, and optionally polls NOAA S3 buckets for new granules.
- `tiling-services/README.md` is a placeholder with no setup or usage instructions.

### GLM TOE Service Details
- `app/main.py` wires a FastAPI app with wildcard CORS, initializes a `GLMDataProcessor`, `TOETileRenderer`, and `GLMS3Fetcher`, and keeps an LRU tile cache in memory.
- Provides endpoints for health, service status, tile rendering (`/tiles/{z}/{x}/{y}.png`), event ingestion, and file ingestion, with optional S3 polling controlled by environment variables.
- Python tests verify tile rendering, NetCDF ingestion, quality-control filters, and grid calculations, using fixtures in `tests/`.

## Scripts (`scripts`)
- Collection of shell, JS, and Python utilities for starting/stopping services, deploying Lambdas, extracting NASA GIBS layer metadata, and scanning or killing ports.
- `port_scanner.py` offers an interactive CLI with range scans, common-port scans, network interface discovery, and JSON report output.
  - `port_killer.py` detects processes via `netstat`, `ss`, `fuser`, `lsof`, and `ps`, offers an interactive menu for individual or bulk port kills, and can save results to a JSON log.
- `build-lambdas.js` esbuilds the proxy and catalog Lambda bundles with aliasing for workspace packages.
- `migrate-fetch.js` rewrites provider modules to use `fetchWithRetry`, leaving `.backup` files for review.
- `deploy-production.sh` installs dependencies, builds Lambda bundles and the web app, runs tests and token generation, and prints deployment follow-up steps.
- `gibs_layer_extractor.js` fetches WMTS GetCapabilities XML and prints parsed layer metadata.
- `update-goes-catalog.js` rewrites GOES layer entries in a catalog file but assumes a legacy `web/public/catalog.json` path.
- Several `*.Zone.Identifier` artifacts remain from Windows downloads and can be removed.

## Root Configuration Files
- `providers.json` is malformed JSON with duplicated and truncated provider entries.
- `config/ports.json` locks dev ports for the proxy (3000), catalog API (3001), web app (3002), and database (3306); port utilities read this file at runtime.
- `pnpm-workspace.yaml` defines workspace packages (`apps/*`, `packages/*`, `proxy-server`, `tiling-services/*`) and lists bundled dependencies; the `proxy-server` entry points to a directory that no longer exists, risking pnpm warnings.
- `tsconfig.json` enables strict TypeScript settings with path aliases (`@atmos/*`) and excludes build outputs.
- `.prettierrc` sets repository-wide formatting rules and `.prettierignore` excludes build artifacts, logs, and lockfiles.
- `requirements.txt` lists no external Python dependencies.
- `Manual_Configuration_Requirements.md` enumerates required environment variables and setup steps for deployment.
- `StagedFixes.patch` is a leftover provider diff that should be cleaned up.

## CI Configuration
- `.github/workflows/ci.yml` still targets legacy `proxy-server` and `dashboard-app` packages that no longer exist.
- `.github/pull_request_template.md` asks contributors to map changes to `AGENTS.md` sections and checklist items.

## Documentation and Development Notes
- `README_MAIN.md` outlines repository layout, port assignments, and common environment variables.
- The README repeats several tile-cache environment variables and shows an outdated `config/ports.json` example with a nested database object.
- `docs/` hosts ADRs and guides covering monorepo structure, GLM lightning tooling, port scanner usage, measurement utilities, and other design references.
- `dev/update.md` documents the v0.1.0 feature set and enumerates pending work such as GLM NetCDF ingestion, educational popovers, PWA/A11y, and telemetry.
- `Findings.md` captures open issues and prioritizes fixes like failing tests and ESLint violations.
- `Followups.md` records resolved production tasks and standardized dependency versions.
- `docs/AGENTS.md` lays out repository ground rules, task priorities, and acceptance criteria for autonomous agents.
- `install-vscode-extensions.sh` installs a curated list of VS Code extensions via the `code` CLI and gracefully skips failures.
- `TOOLS-IDE-EXTENSIONS.md` and `TOOLS-IDE-EXTENSIONS-UNMAPPED.md` are empty placeholders for future IDE documentation.
 - `.vscode/` includes a Chrome launch profile and settings that auto-approve certain terminal commands for chat tools.
- `CLAUDE.md` summarizes project goals and monorepo architecture but still references the deprecated `proxy-server` directory.
- `open-weather-services.md` catalogs additional public radar, satellite, and air-quality feeds for future proxy coverage.
- Feature deep-dive docs (`measurement-tools.md`, `time-lapse-animations.md`, `multi-model-comparison.md`) outline planned UI capabilities that remain unimplemented.
- `GLM Lightning_HeatMap_guide.md` walks through fetching public GLM Level-2 data and rendering heatmap tiles.
- `README_port_scanner.md` and `README_port_killer.md` document interactive scripts for scanning and terminating processes on specific ports.

## Progress
Approximately **100%** of repository files have been reviewed. Only minor ancillary files may remain unverified.

## Limitations
- Every directory was inspected, though individual lines may still contain unnoticed issues.
- The accuracy of external integrations and runtime behavior has not been fully validated.
