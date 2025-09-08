# AtmosInsight – Production Preparation Guide

This document orients an AI Coding Agent (and you) for taking the repo to a first production test on AWS using S3 + CloudFront for the static web app and API Gateway + Lambda for `/api/*`, fronted by your domain via Cloudflare DNS.

The focus is: what exists, what’s missing, how the system wires together, and exactly what to configure.

## 1) Architecture Overview

- Web App: Next.js static export served from S3 and fronted by CloudFront.
  - Build/export: `apps/web` (Next.js App Router) with `output: 'export'` (apps/web/next.config.js).
  - Frontend calls relative `/api/*` so CloudFront can route API requests.
- API: Single Lambda “proxy” behind API Gateway HTTP API, fronted by CloudFront on `/api/*`.
  - Proxy code: `tiling-services/proxy-api/index.ts` (TypeScript). Lambda runtime: nodejs20.x.
  - Terraform (Option A) in `infra/proxy-only/` and the integrated stack in `infra/`.
- Optional catalog: Separate Lambda/API for catalog endpoints (times/layers) in `tiling-services/catalog-api/` with Terraform in `infra/catalog_api.tf`.
- DNS + TLS: Cloudflare remains authoritative. Recommended: add a DNS‑only CNAME from `weather.westfam.media` → CloudFront distribution; use ACM (us‑east‑1) certificate with CloudFront aliases for your domain. Alternative (advanced): delegate the subdomain to Route53 via NS records in Cloudflare, then manage `weather.westfam.media` in Route53.

## 2) Current Capabilities

- Frontend (apps/web):
  - Basemaps: CyclOSM and Tracestrack raster sources (apps/web/src/app/page.tsx).
  - Overlays: NWS Alerts, RainViewer radar animation, optional GLM TOE overlay.
  - Timeline UI component fetches `/api/catalog/layers/:id/times` and prefetches frame tiles (apps/web/src/components/Timeline.tsx).
- Proxy Lambda (tiling-services/proxy-api/index.ts):
  - Implemented: `/api/healthz`, `/api/nws/alerts/*`, `/api/rainviewer/*`, `/api/owm/:layer/...`, `/api/gibs/*`, `/api/glm-toe/:z/:x/:y.png` (503 if not configured).
  - Not yet implemented but used by frontend: `/api/osm/cyclosm/:z/:x/:y.png`, `/api/tracestrack/:style/:z/:x/:y.webp`.
- Catalog API (tiling-services/catalog-api):
  - Implements `/catalog/layers` and `/catalog/layers/:id/times` with simple JSON sources; Terraform deploys as separate Lambda + API.
  - Frontend Timeline uses `/api/catalog/...`; the proxy Lambda should forward these to the catalog API for a single `/api/*` origin.

### Initial Test Scope (agreed)

- Basemap: CyclOSM + Tracestrack, optimized and fully functional.
- Radar reflectivity: RainViewer (index + tiles).
- Alerts: NWS alerts overlay (GeoJSON).
- Satellite: NASA GIBS tiles.
- Lightning: GLM tiles via Python microservice (preferred) or temporarily disabled in UI until service is up.
- Forecast: dynamic location endpoint `/api/forecast?lat=..&lon=..` (Open‑Meteo by default; OWM optional with key) with a simple UI card.

## 3) Gaps To Close (MVP for first prod test)

1) Bundle and package Lambdas correctly
   - Terraform currently zips `.ts` source directly. Lambdas must be bundled to JS (ESM) and referenced by Terraform (e.g., `index.mjs`).
   - `tiling-services/proxy-api/index.mjs` exists but is empty; add an esbuild step to generate a single JS file and update Terraform to zip that output.

2) Add missing routes to the proxy Lambda
   - `/api/osm/cyclosm/:z/:x/:y.png` (CyclOSM via OSM tile servers; retry a/b/c with 5s timeout). Reference: `proxy-server/src/app.ts:250`.
   - `/api/tracestrack/:style/:z/:x/:y.webp` (requires `TRACESTRACK_API_KEY`). Reference: `proxy-server/src/app.ts:769`.
   - `/api/forecast` (dynamic location forecast). Default upstream: Open‑Meteo (no key). Optional: OWM One Call when `OPENWEATHER_API_KEY` present. Normalize to `{ current, hourly, daily }`.

3) Wire the catalog into `/api/*`
   - Simple path: forward `/api/catalog/*` from the proxy Lambda to the catalog API via `CATALOG_API_BASE`.
   - Alternative: add a second API origin in CloudFront for `/api/catalog/*` (requires module changes). The forwarder is faster for MVP.

4) CloudFront cert + alias
   - `infra/modules/cloudfront/main.tf` uses the default certificate. Update to use ACM cert (us‑east‑1) and set `aliases = ["weather.westfam.media"]`.
   - Point Cloudflare CNAME at the CloudFront distribution domain; start with DNS‑only (no CF proxy) to avoid double TLS/caching for smoke tests.

5) Frontend toggles
   - GLM layer: UI always adds it; if `GLM_TOE_PY_URL` is not set, `/api/glm-toe` returns 503. Add a simple feature toggle to only add the GLM source when enabled/healthy (or disable for MVP).
   - Timeline: Hide until `/api/catalog/*` is reachable to avoid 404s.
   - Forecast: Add a small `ForecastPopover` that uses browser geolocation or map center and calls `/api/forecast`.

## 4) Environment & Secrets (minimum viable)

Set these on the proxy Lambda (Terraform `environment.variables`):

- `NWS_USER_AGENT` – required by NWS (include contact email). Note: ensure it has balanced parentheses.
- `OPENWEATHER_API_KEY` – for `/api/owm/...` tiles.
- `TRACESTRACK_API_KEY` – for Tracestrack tiles.
- `RAINVIEWER_ENABLED=true`, `GIBS_ENABLED=true` – keep enabled for MVP.
- `GLM_TOE_PY_URL` – optional; set if Python GLM tiles service is running; otherwise keep the GLM layer disabled in UI.
- `CATALOG_API_BASE` – URL of the catalog HTTP API (e.g., `https://...execute-api.../catalog`).

Frontend build (apps/web):

- `NEXT_PUBLIC_API_BASE_URL` – leave empty for relative calls (recommended), or set to your domain origin.
- Optional playback/cache tuning: see `apps/web/env.example`.

Secrets handling:

- Do not commit `.env`. Use AWS SSM Parameter Store or Secrets Manager for production secrets.
- In Cloudflare, disable caching for `/api/*` (bypass) to avoid double caching. Keep API cache TTLs on CloudFront/Lambda responses (60s short‑lived).

### Caching strategy (TTL recommendations)

- Alerts (NWS): 60s. “Don’t cache” in practice means “don’t cache long”; 60s balances freshness and load.
- RainViewer index: 60s. Frames update frequently.
- RainViewer tiles: 60–120s. A given timestamp’s tiles are stable briefly.
- OWM tiles: 300–900s. Weather layers change but support modest caching.
- CyclOSM tiles: 300s. Respect upstream cache headers if present; otherwise 5 minutes.
- Tracestrack tiles: 300s.
- GIBS tiles (time‑stamped): 86400s (1 day) or longer; immutable content per timestamp.
- GIBS tiles (no time): 3600s (1 hour).
- GLM tiles: 60s default; if a time parameter is included, 300s.

CloudFront should respect origin Cache‑Control headers. Keep Cloudflare DNS‑only initially so CloudFront + browser caching is the sole cache layer.

## 5) Build & Deploy – End‑to‑End

1) Build frontend
   - `pnpm install`
   - `pnpm --filter web build` → emits `apps/web/out/`

2) Upload static site to S3 app bucket
   - Sync `apps/web/out/` to your app bucket (e.g., `aws s3 sync apps/web/out/ s3://$APP_BUCKET/ --delete`).

3) Bundle proxy Lambda
   - Use esbuild (example):
     - `npx esbuild tiling-services/proxy-api/index.ts --bundle --platform=node --format=esm --outfile=tiling-services/proxy-api/index.mjs`
   - Ensure `index.mjs` is the file Terraform zips and that the Lambda handler is `index.handler`.

4) Bundle catalog Lambda (if using)
   - `npx esbuild tiling-services/catalog-api/index.ts --bundle --platform=node --format=esm --outfile=tiling-services/catalog-api/index.mjs`
   - Include `layers.json` and `times.json` in the zip (use Terraform `source` as a folder or archive multiple files).

5) Terraform apply (proxy API and CloudFront)
   - In `infra/` (or `infra/proxy-only/` for the minimal API): `terraform init && terraform plan -out tfplan && terraform apply tfplan`.
   - Set module variables for ACM cert ARN and aliases; set Lambda env vars for API keys and toggles.

6) DNS
   - Option A (recommended): In Cloudflare, create a DNS‑only CNAME `weather.westfam.media` → CloudFront domain. Ensure ACM validation CNAMEs exist in Cloudflare.
   - Option B (advanced): Delegate `weather.westfam.media` to Route53 by adding NS records for the subdomain in Cloudflare, then manage that subdomain entirely in Route53.

7) Smoke tests (after propagation)
   - `curl -I https://<domain>/api/healthz` → 200
   - `curl -I "https://<domain>/api/nws/alerts/active?area=AZ"` → 200, `application/geo+json`
   - `curl -I https://<domain>/api/rainviewer/index.json` → 200
   - `curl -I https://<domain>/api/osm/cyclosm/0/0/0.png` → 200 (after adding route)
   - `curl -I https://<domain>/api/tracestrack/topo_en/1/1/1.webp` → 200 (with key)

## 6) Implementation Notes (for the agent)

- Add OSM/Tracestrack routes to `tiling-services/proxy-api/index.ts` mirroring `proxy-server/src/app.ts` logic (timeouts, headers, cache TTLs).
- Add `/api/catalog/*` forwarder in the proxy Lambda:
  - Recognize paths beginning with `/api/catalog/`, build target URL using `CATALOG_API_BASE`, forward with `fetchWithRetry`, preserve relevant headers, return body.
- Add `/api/forecast` endpoint in the proxy Lambda:
  - Accept `lat`, `lon` (and optional `units`, `source`). If `source=owm` and `OPENWEATHER_API_KEY` present, call OWM One Call; otherwise call Open‑Meteo.
  - Normalize response to `{ current, hourly, daily }` with essential fields for UI.
- Update Terraform packaging:
  - Change `archive_file` inputs to point to the built `.mjs` or package a folder containing the `.mjs` and any sidecar files.
  - Ensure `runtime = "nodejs20.x"`, `handler = "index.handler"` for ESM default export (export named `handler`).
- CloudFront module update (aliases + ACM):
  - Add variables for `aliases` and `acm_certificate_arn`, use `viewer_certificate { acm_certificate_arn = ..., ssl_support_method = "sni-only" }`, and set `aliases = [...]`.
  - Keep `/api/*` behavior with TTL ~60s and query string forwarding enabled.

## 7) What’s Missing Right Now

- Proxy bundling: generate `tiling-services/proxy-api/index.mjs` via esbuild and package that artifact in Terraform (the `.mjs` file is currently empty).
- Proxy routes: implement `/api/osm/cyclosm` and `/api/tracestrack` in the Lambda.
- Catalog path: forward `/api/catalog/*` to the catalog API (or add a second CloudFront origin/behavior).
- CloudFront TLS + alias: switch from default certificate to your ACM cert and add alias for the production domain.
- Frontend toggles: skip GLM layer by default unless configured; optionally hide Timeline until catalog is available.

## 8) Manual Inputs Needed From You

Provide these to accelerate implementation (no secrets pasted into chat; store in AWS and share names/paths):

- Domain/cert
  - Confirm production domain(s) for CloudFront aliases (e.g., `weather.westfam.media`).
  - Confirm ACM certificate ARN in us‑east‑1 (already exists) and domain validation status.
- CloudFront & DNS
  - Confirm Cloudflare remains authoritative with a DNS‑only CNAME to CloudFront for `weather.westfam.media` (recommended), or request subdomain delegation to Route53.
  - Any Cloudflare caching rules to add (recommend: bypass `/api/*`).
- API endpoints
  - Final API Gateway base URL(s) to forward `/api/catalog/*` (or confirm preference to add a second CloudFront origin instead).
- Feature scope for MVP
  - Confirm we will enable: Basemap (CyclOSM + Tracestrack), NWS alerts, RainViewer, OWM tiles, GIBS, and GLM.
  - Confirm TTL policy matches the recommendations above (or provide overrides).
- Observability
  - Where to ship logs/metrics (CloudWatch is default). Any alarms you want for 4xx/5xx or latency.
- Secrets inventory (by name only)
  - Names/paths in SSM/Secrets Manager for: `OPENWEATHER_API_KEY`, `TRACESTRACK_API_KEY`, `NWS_USER_AGENT`, and any optional providers.
- Access
  - AWS account/role the CI or operator will assume to run Terraform and deploy artifacts.

Security note: Store long‑lived credentials in AWS (SSM Parameter Store or Secrets Manager) and inject via Lambda environment variables. Rotate any credentials that may have been exposed outside AWS.

Once you confirm these details, the agent can:

1) Implement/ship the missing proxy routes and catalog forwarder.
2) Add an esbuild bundling step and adjust Terraform to package built `.mjs` files.
3) Update the CloudFront module for aliases + ACM.
4) Provide a one‑command deploy script to build, bundle, upload, and apply.

## 9) Quick File Pointers

- Frontend map + layers: `apps/web/src/app/page.tsx`
- RainViewer UI: `apps/web/src/components/RainviewerLayer.tsx`
- Timeline UI (uses `/api/catalog`): `apps/web/src/components/Timeline.tsx`
- Proxy Lambda (TypeScript): `tiling-services/proxy-api/index.ts`
- Catalog Lambda (TypeScript): `tiling-services/catalog-api/index.ts`
- CloudFront module: `infra/modules/cloudfront/main.tf`
- Proxy API Terraform (minimal): `infra/proxy-only/main.tf`
- Integrated stack Terraform: `infra/*.tf`

---

Note on `.env`: The repository’s `.env` is intentionally git‑ignored and is for local reference only. In production, source secrets from AWS (SSM/Secrets Manager) and inject into Lambda env vars/CI. NWS recommends a descriptive User‑Agent including contact (e.g., `AtmosInsight/v0.1.0 (contact: you@example.com)`).
