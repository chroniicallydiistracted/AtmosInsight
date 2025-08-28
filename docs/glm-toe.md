# GOES-R GLM Total Optical Energy (TOE) — MVP

- TOE = sum of optical energy (femtojoules, fJ) from GLM detections aggregated to the ABI 2×2 km grid over a rolling window.
- Inputs: GOES-R GLM Level-2 (events/groups/flashes) NetCDF files at ~20 s cadence.

## Data Sources

- NOAA CLASS / AWS Open Data (GOES-East/West L2 GLM):
  - https://noaa-goes16.s3.amazonaws.com/index.html (GOES-East)
  - https://noaa-goes17.s3.amazonaws.com/index.html (GOES-West)
  - Product family: GLM-L2 (NetCDF)

## Server Endpoints (experimental)

- Feature flag: set `GLM_TOE_ENABLED=true` in `proxy-server` env.
- Ingest synthetic events (dev only): `POST /api/glm-toe/ingest` with JSON array of `{lat, lon, energy_fj, timeMs}`.
- Tile rendering: `GET /api/glm-toe/:z/:x/:y.png` → PNG tile with a stepped color ramp.

## Implementation Notes (MVP)

- Aggregation window defaults to 30 minutes; older events are pruned.
- Current MVP snaps events to approximate 2 km bins based on Web Mercator meters-per-pixel at event latitude; this is a placeholder. Replace with exact ABI 2×2 km grid mapping in a subsequent PR.
- Color ramp is a stepped RGBA palette; adjust thresholds to match operational needs.

## Next Steps

- Implement NetCDF ingestion (GLM L2) and exact ABI grid transform.
- Add snapshot tests for color mapping and an integration test using sample GLM files.
- Add WMTS/XYZ descriptors and legend metadata.
