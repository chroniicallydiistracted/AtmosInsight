# Partial Repository Review

**Date**: September 8, 2025

This document summarizes a limited review of the AtmosInsight repository. Due to time and environment constraints, only a subset of files were read directly. Findings below reflect only the examined files and should not be considered a comprehensive validation of all repository features.

## Monorepo Overview
- Root `package.json` configures pnpm workspace scripts for building, linting, testing, and various port-scanning utilities.

## Web Application (`apps/web`)
- Next.js 14 web app with MapLibre map rendering and deck.gl integrations.
- `page.tsx` sets up raster basemap layers, switches to a fallback source on errors, and loads National Weather Service alerts dynamically.
- `apps/web/package.json` indicates the test script is a placeholder (`echo 'no tests'`).
- `ForecastPopover.tsx` uses the browser's geolocation API to fetch a forecast from `/api/forecast`, with TODOs for configurable units and source selection.
- `AlertsLegend.tsx` renders a color-coded severity key for NWS alerts.
- Utility modules provide radar playback helpers (`playback.ts`) and an LRU tile cache with image preloading (`tileCache.ts`).

## Providers (`packages/providers`)
- Multiple provider modules interface with external weather and environmental APIs. Example: `nws.ts` constructs requests to `api.weather.gov` and fetches JSON responses using a customizable `User-Agent`.

## Shared Utilities (`packages/shared-utils`)
- Loads port configuration from `config/ports.json` with fallback defaults and exposes a `PORTS` constant.
- Supplies helper functions for error/success responses and common HTTP status codes.
- Includes utilities for detecting and terminating processes on specific ports.
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
- `build.mjs` uses Style Dictionary v4 to emit CSS variables and typed JS modules, with optional `--watch` mode.

## Additional Providers (`packages/providers`)
- `gibs.ts` builds NASA GIBS WMTS tile URLs in REST, KVP, and XYZ forms and appends an `EARTHDATA_TOKEN` when present.
- `earth-search.ts` crafts POST requests to Element84's STAC API and fetches JSON via `fetchWithRetry`.

## Provider Tests (`packages/providers/test`)
- Vitest suites cover most provider modules, checking URL construction and header or API key injection. Example: `nws-alerts.test.ts` mocks `fetch` to verify custom `User-Agent` and `Accept` headers.

## Infrastructure (`infra`)
- Terraform configuration provisions S3 buckets, CloudFront distribution, DynamoDB table, and a PostGIS RDS instance.
- Reusable modules parameterize bucket names, versioning, and server-side encryption.
- `monitoring.tf` defines optional CloudWatch alarms for Lambda errors, API Gateway 4xx/5xx counts, latency, and CloudFront error rates.

## Data Pipelines (`data-pipelines`)
- Placeholder README exists with no implementation details.

## Tiling Services (`tiling-services`)
- `catalog-api` exposes `/catalog/layers` and `/catalog/layers/{id}/times` by reading local `layers.json` and `times.json` files via a minimal HTTP handler.
- `proxy-api` is a Node.js Lambda-style handler forwarding `/api/*` requests to providers like NWS, OpenWeatherMap, RainViewer, Carto basemaps, NASA GIBS, and several air-quality services. It adds CORS headers, short/medium cache control, and TODOs for Secrets Manager-backed API keys.
- `glm_toe` is a Python FastAPI service that ingests GLM Level-2 lightning data, caches rendered TOE tiles, and optionally polls NOAA S3 buckets for new granules.

## Scripts (`scripts`)
- Collection of shell, JS, and Python utilities for starting/stopping services, deploying Lambdas, extracting NASA GIBS layer metadata, and scanning or killing ports.
- `port_scanner.py` offers an interactive CLI with range scans, common-port scans, and report generation.
- Several `*.Zone.Identifier` artifacts remain from Windows downloads and can be removed.

## Root Configuration Files
- `providers.json` is malformed JSON with duplicated and truncated provider entries.
- `requirements.txt` lists no external Python dependencies.

## Limitations
- Only the files referenced above were inspected. Many directories (e.g., other apps, data pipelines, scripts) were not reviewed.
- The presence or correctness of features outside the inspected files has not been verified.
