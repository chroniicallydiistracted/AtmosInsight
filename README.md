# AtmosInsight

Version: v0.1.0
Atmospheric Weather and Planetary Science Education App

## Repository Layout

- `dashboard-app/` – React + Vite client with a PMTiles basemap
- `infra/` – Terraform configuration for AWS resources
- `data-pipelines/` – ETL jobs (placeholder)
- `tiling-services/` – Tile rendering services (placeholder)
- `docs/` – Documentation and ADRs

## Milestones

This commit establishes Milestone M1: foundational infrastructure configuration and a minimal app shell with a self-hosted PMTiles basemap.

## Environment Variables

- `NWS_USER_AGENT` – Required User-Agent string for National Weather Service API requests.
- `OWM_API_KEY` – OpenWeatherMap tile API key used by the proxy.
- `RAINVIEWER_ENABLED` – `true|false` to enable/disable RainViewer proxy (default enabled).
- `GIBS_ENABLED` – `true|false` to enable/disable GIBS proxy (if implemented).
- Mapbox/Cesium tokens as required by your chosen basemap providers.
- `GLM_TOE_ENABLED` – `true|false` to enable experimental GLM TOE tile endpoint.
- `GLM_TOE_PY_URL` – If set, proxy `/api/glm-toe/:z/:x/:y.png` to the Python FastAPI service (`tiling-services/glm_toe`).
- `GLM_USE_ABI_GRID` – When running the Python service, enable precise ABI 2×2 km grid accumulation.
- `GLM_TILE_CACHE_SIZE` – Python service tile LRU size (default 128).

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
