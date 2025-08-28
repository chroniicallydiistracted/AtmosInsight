# GLM TOE Python Service (High-Quality Ingestion + Tiles)

A FastAPI microservice that ingests GOES-R GLM Level-2 data and renders Total Optical Energy (TOE) tiles. This service is the high‑quality path for precise ABI 2×2 km grid mapping and robust NetCDF4 ingestion, proxied by the Node server via `GLM_TOE_PY_URL`.

## Endpoints

- `GET /health` — service health
- `POST /ingest` — dev-only synthetic events `[ {lat, lon, energy_fj, timeMs?} ]`
- `GET /tiles/{z}/{x}/{y}.png` — TOE PNG tile
- `POST /ingest_files` — ingest GLM L2 NetCDF file paths (local or s3:// URIs)

## Run locally

```bash
cd tiling-services/glm_toe
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Then configure the proxy to use it:

```bash
# proxy-server/.env
GLM_TOE_ENABLED=true
GLM_TOE_PY_URL=http://localhost:8080
```

## Roadmap (Phase 2)

- Add xarray/netCDF4 ingestion from NOAA S3 (GOES-East/West) with rolling window.
- Implement exact ABI 2×2 km grid mapping via pyproj/geostationary transform.
- On-demand tile rendering with caching, configurable color ramp.
- Integration test with sample GLM files.

## Background/headless runs (avoid blocking the terminal)

Run uvicorn in the background when developing:

```bash
nohup uvicorn app.main:app --port 8080 > glm_toe.log 2>&1 & disown
```

Similarly, you can run the Node proxy without blocking your shell:

```bash
cd ../../../proxy-server
nohup npm start > proxy.log 2>&1 & disown
```

## Windowing and deterministic tiles

The tiles endpoint supports a time window and an optional end time:

```
GET /tiles/{z}/{x}/{y}.png?window=5m&t=2025-08-28T08:30:00Z
```

- `window`: `1m`, `5m`, `300s`, `180000ms` (default `5m`)
- `t`: ISO8601 UTC; if omitted, uses now.

Use these parameters to produce deterministic tiles and set caching in front of the service.
