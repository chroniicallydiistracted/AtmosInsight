# AtmosInsight
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
