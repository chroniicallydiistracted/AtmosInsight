# AtmosInsight
Version: v0.1.0
Atmospheric Weather and Planetary Science Education App
## Repository Layout
- `apps/web/` – Next.js client with Tracestrack basemap tiles
- `infra/` – Terraform configuration for AWS resources
- `data-pipelines/` – ETL jobs (placeholder)
- `tiling-services/` – Tile rendering services (placeholder)
- `docs/` – Documentation and ADRs
## Port Configuration
All local service ports are defined in `config/ports.json`:
```json
{
  "proxy": 3000,
  "catalog": 3001,
  "web": 3002,
  "database": { "min": 3306, "max": 5432 }
}
```
Scripts and utilities load from this file as the single source of truth for port assignments.
## Milestones
This commit establishes Milestone M1: foundational infrastructure configuration and a minimal app shell with Tracestrack basemap tiles.
## Environment Variables
- `NWS_USER_AGENT` – Required User-Agent string for National Weather Service API requests.
- `OWM_API_KEY` – OpenWeatherMap tile API key used by the proxy.
- `RAINVIEWER_ENABLED` – `true|false` to enable/disable RainViewer proxy (default enabled).
- `GIBS_ENABLED` – `true|false` to enable/disable GIBS proxy (if implemented).
- `CESIUM_ION_KEY` – Cesium ion tokens as required.
- `GLM_TOE_ENABLED` – `true|false` to enable experimental GLM TOE tile endpoint.
- `GLM_TOE_PY_URL` – If set, proxy `/api/glm-toe/:z/:x/:y.png` to the Python FastAPI service (`tiling-services/glm_toe`).
- `GLM_USE_ABI_GRID` – When running the Python service, enable precise ABI 2×2 km grid accumulation.
- `GLM_TILE_CACHE_SIZE` – Python service tile LRU size (default 128).
- ``
## Basemap Tokens
The included demo basemap uses Protomaps’ public style and PMTiles and does not require a token. If you switch to Mapbox or other providers, add the appropriate environment variables locally and in your deployment platform — do not hard-code keys in source.
## References
- National Weather Service API: https://api.weather.gov
- OpenWeatherMap Weather Maps: https://openweathermap.org/api/weathermaps
- NASA GIBS WMTS/XYZ access: https://gibs.earthdata.nasa.gov
- RainViewer Weather Maps: https://www.rainviewer.com/api.html
- GLM TOE details and endpoints: see `docs/glm-toe.md`
  - GOES-East GLM L2 (AWS Open Data): https://noaa-goes16.s3.amazonaws.com/index.html
  - GOES-West GLM L2 (AWS Open Data): https://noaa-goes17.s3.amazonaws.com/index.html
## Deploy: API Proxy (Option A)
Serverless production proxy for `/api/*` using API Gateway HTTP API + Lambda, fronted by CloudFront. Static SPA remains on S3+CloudFront.
- Prereqs:
  - Set variables in `infra/terraform.tfvars` (copy from `infra/terraform.tfvars.example`).
  - Ensure AWS credentials via `AWS_PROFILE`/`AWS_REGION`.
- Deploy (from `infra/`):
  - `terraform init`
  - `terraform plan -out tfplan`
  - `terraform apply tfplan`
- Outputs:
  - API direct URL: `terraform output -raw proxy_api_endpoint`
- Quick tests (direct to API Gateway):
  - `curl -I "$(terraform output -raw proxy_api_endpoint)/api/healthz"` → 200
  - `curl -I "$(terraform output -raw proxy_api_endpoint)/api/nws/alerts/active?area=AZ"` → 200, `application/geo+json`
- CloudFront propagation (5–20 min), then test via your domain:
  - `curl -I https://<your-domain>/api/healthz` → 200
  - `curl -I "https://<your-domain>/api/nws/alerts/active?area=AZ"` → 200
  - `curl -I https://<your-domain>/api/rainviewer/index.json` → 200
  - OWM tiles (key configured): `curl -I https://<your-domain>/api/owm/clouds_new/0/0/0.png` → 200
  - GIBS redirect sample: `curl -I "https://<your-domain>/api/gibs/redirect?layer=BlueMarble_ShadedRelief_Bathymetry&epsg=3857&tms=GoogleMapsCompatible_Level6&z=3&x=2&y=1&ext=jpg"` → 302
- Targeted apply (if non-API resources aren’t ready):
  - `terraform apply -target=aws_lambda_function.proxy_api -target=aws_apigatewayv2_api.proxy -target=aws_cloudfront_distribution.this`
Notes
- GLM TOE: `/api/glm-toe/:z/:x/:y.png` returns 503 until `glm_toe_py_url` points at the Python tiles service.
- Health check: `/api/healthz` is available for quick probes and monitoring.
## apps/web
A Next.js 15 App Router prototype lives in `apps/web`. Install dependencies and start the dev server:
```bash
pnpm install
pnpm dev
### Design tokens
Tokens are built with Style Dictionary in `packages/tokens` and emitted as CSS variables and a typed map. Key tokens:
- Accent Teal `#1BC7B5`
- Accent Coral `#FF7A66`
- Radius: 8, 10, 12, 14
- Spacing: 4, 8, 12, 16
- Shadows: `sm`, `md`
- Motion timings: fast 150ms, slow 300ms
### Keyboard shortcuts
- `Space` – play/pause
- `←`/`→` – step frame
- `Shift+←`/`Shift+→` – major tick
- `N` – jump to now
- `R` – open run picker
### Deep-link example
/app?bbox=-10,30,10,40&zoom=5&timeISO=2025-08-28T00:00:00Z
- `TRACESTRACK_API_KEY` – Tracestrack basemap API key for tile requests.
- `AIRNOW_ENABLED` – `true|false` to enable/disable AirNow air-quality proxy.
- `AIRNOW_API_KEY` – AirNow API key used when the proxy is enabled.
- `OPENAQ_ENABLED` – `true|false` to enable/disable OpenAQ air-quality proxy.
- Mapbox/Cesium tokens as required by your chosen basemap providers.
## Attribution
- National Weather Service data courtesy of NOAA/NWS.
- OpenWeatherMap layers © OpenWeatherMap.
- RainViewer radar imagery © RainViewer.
- NASA GIBS imagery courtesy of NASA EOSDIS.
- Basemap tiles by Tracestrack and CyclOSM © OpenStreetMap contributors.
- Air quality data from AirNow (U.S. EPA) and OpenAQ.
