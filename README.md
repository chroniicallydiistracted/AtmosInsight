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
