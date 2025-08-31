# AtmosInsight

Version: v0.1.0
Atmospheric Weather and Planetary Science Education App

## Repository Layout

- `apps/web/` – Next.js client with Tracestrack basemap tiles
- `infra/` – Terraform configuration for AWS resources
- `data-pipelines/` – ETL jobs (placeholder)
- `tiling-services/` – Tile rendering services (placeholder)
- `docs/` – Documentation and ADRs


## Port configuration

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

This repository establishes Milestone M1: foundational infrastructure configuration and a minimal app shell with Tracestrack basemap tiles.

## Environment variables

Common environment variables used by services in this repo:

- `NWS_USER_AGENT` — User-Agent string for National Weather Service API requests (e.g. "AtmosInsight/v0.1.0 (you@example.com)").
- `OPENWEATHER_API_KEY` — OpenWeatherMap tile API key used by the proxy.
- `NEXT_PUBLIC_API_BASE_URL` — Base URL for frontend requests to the proxy.
- `RAINVIEWER_ENABLED` — `true|false` to enable/disable RainViewer proxy (default: true).
- `GIBS_ENABLED` — `true|false` to enable/disable GIBS proxy (if implemented).
- `WEATHERKIT_TEAM_ID` — Apple Developer team ID for WeatherKit JWTs.
- `WEATHERKIT_SERVICE_ID` — WeatherKit service identifier.
- `WEATHERKIT_KEY_ID` — Key ID associated with the WeatherKit private key.
- `WEATHERKIT_PRIVATE_KEY` — PEM contents used to sign WeatherKit JWTs.
- `GLM_TOE_PY_URL` — If set, proxy `/api/glm-toe/:z/:x/:y.png` to the Python FastAPI service (`tiling-services/glm_toe`).
- `GLM_USE_ABI_GRID` — When running the Python service, enable precise ABI 2×2 km grid accumulation.
- `GLM_TILE_CACHE_SIZE` — Python service tile LRU size (default: 128).
- `FIRMS_MAP_KEY` — NASA FIRMS API key.
- `AIRNOW_API_KEY` — AirNow API key.
- `NASA_API_KEY` — NASA Earthdata API key.
- `OPENAQ_API_KEY` — OpenAQ API key.
- `PURPLEAIR_API_KEY` — PurpleAir API key.
- `CESIUM_ION_TOKEN` — Cesium Ion token.
- `EARTHDATA_TOKEN` — Earthdata token.
- `GOOGLE_CLOUD_KEY` — Google Cloud API key.
- `TRACESTRACK_API_KEY` — Tracestrack API key.
- `METEOMATICS_USER` - Meteomatics Username.
- `METEOMATICS_PASSWORD` - Meteomatics Password.

# AWS infrastructure

- `AWS_ACCESS_KEY_ID` - 
- `AWS_SECRET_ACCESS_KEY` - 
- `ALERTS_TABLE` - 
- `DYNAMODB_ENDPOINT` - 
- `DIST_ARN` - 
- `DIST_ID` - 
- `APP_BUCKET` - 
- `AWS_DEFAULT_REGION` - 
- `AWS_PROFILE` - 
- `LAMBDA_FUNCTION_NAME` - 
- `LAMBDA_URL_HOST` - 
- `DOMAIN` - 
- `CERT_ARN` - 
- `HOSTED_ZONE_ID` - 



# Optional outgoing HTTP(S) proxy for upstream requests
# HTTPS_PROXY=
# HTTP_PROXY=

# Optional outgoing SOCKS proxy for upstream requests
# SOCKS_PROXY=


# Feature Toggles

- `RAINVIEWER_ENABLED` — `true|false`
- `GIBS_ENABLED` — `true|false`
- `GLM_TOE_ENABLED` — `true|false`
- `OPENAQ_ENABLED` — `true|false`

## Basemap tokens

The included demo basemap uses Protomaps’ public style and PMTiles and does not require a token. If you switch to Mapbox or other providers, add the appropriate environment variables locally and in your deployment platform — do not hard-code keys in source.

## References

- National Weather Service API: https://api.weather.gov
- OpenWeatherMap Weather Maps: https://openweathermap.org/api/weathermaps
- NASA GIBS WMTS/XYZ access: https://gibs.earthdata.nasa.gov
- RainViewer Weather Maps: https://www.rainviewer.com/api.html
- GLM TOE details and endpoints: see `docs/glm-toe.md`
  - GOES-East GLM L2 (AWS Open Data): https://noaa-goes16.s3.amazonaws.com/index.html
  - GOES-West GLM L2 (AWS Open Data): https://noaa-goes17.s3.amazonaws.com/index.html

## Deploy: API proxy (Option A)

Serverless production proxy for `/api/*` using API Gateway HTTP API + Lambda, fronted by CloudFront. Static SPA remains on S3+CloudFront.

Prereqs:

- Set variables in `infra/terraform.tfvars` (copy from `infra/terraform.tfvars.example`).
- Ensure AWS credentials via `AWS_PROFILE` / `AWS_REGION`.

Deploy (from `infra/`):

```bash
terraform init
terraform plan -out tfplan
terraform apply tfplan
```

Outputs:

- API direct URL: `terraform output -raw proxy_api_endpoint`

Quick tests (direct to API Gateway):

- `curl -I "$(terraform output -raw proxy_api_endpoint)/api/healthz"` → 200
- `curl -I "$(terraform output -raw proxy_api_endpoint)/api/nws/alerts/active?area=AZ"` → 200, `application/geo+json`

CloudFront propagation (5–20 min), then test via your domain:

- `curl -I https://<your-domain>/api/healthz` → 200
- `curl -I "https://<your-domain>/api/nws/alerts/active?area=AZ"` → 200
- `curl -I https://<your-domain>/api/rainviewer/index.json` → 200
- OWM tiles (key configured): `curl -I https://<your-domain>/api/owm/clouds_new/0/0/0.png` → 200
- GIBS redirect sample: `curl -I "https://<your-domain>/api/gibs/redirect?layer=BlueMarble_ShadedRelief_Bathymetry&epsg=3857&tms=GoogleMapsCompatible_Level6&z=3&x=2&y=1&ext=jpg"` → 302

Notes:

- GLM TOE: `/api/glm-toe/:z/:x/:y.png` returns 503 until `GLM_TOE_PY_URL` points at the Python tiles service.
- Health check: `/api/healthz` is available for quick probes and monitoring.

## apps/web

A Next.js App Router prototype lives in `apps/web`. Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
```

### Design tokens

Tokens are built with Style Dictionary in `packages/tokens` and emitted as CSS variables and a typed map. Key tokens:

- Accent Teal `#1BC7B5`
- Accent Coral `#FF7A66`
- Radius: 8, 10, 12, 14
- Spacing: 4, 8, 12, 16
- Shadows: `sm`, `md`
- Motion timings: fast 150ms, slow 300ms

### Keyboard shortcuts

- `Space` — play/pause
- `←` / `→` — step frame
- `Shift+←` / `Shift+→` — major tick
- `N` — jump to now
- `R` — open run picker

### Deep-link example

```
/app?bbox=-10,30,10,40&zoom=5&timeISO=2025-08-28T00:00:00Z
```

## Attribution

- National Weather Service data courtesy of NOAA/NWS.
- OpenWeatherMap layers © OpenWeatherMap.
- RainViewer radar imagery © RainViewer.
- NASA GIBS imagery courtesy of NASA EOSDIS.
- Basemap tiles by Tracestrack and CyclOSM © OpenStreetMap contributors.
- Air quality data from AirNow (U.S. EPA) and OpenAQ.
- Mapbox/Cesium tokens as required by your chosen basemap providers.
## Attribution
- National Weather Service data courtesy of NOAA/NWS.
- OpenWeatherMap layers © OpenWeatherMap.
- RainViewer radar imagery © RainViewer.
- NASA GIBS imagery courtesy of NASA EOSDIS.
- Basemap tiles by Tracestrack and CyclOSM © OpenStreetMap contributors.
- Air quality data from AirNow (U.S. EPA) and OpenAQ.
