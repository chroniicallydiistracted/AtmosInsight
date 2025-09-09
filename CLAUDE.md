# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

AtmosInsight is a unified educational portal for atmospheric and planetary science, designed as an interactive web dashboard that aggregates diverse meteorological and space-science data feeds. The project provides real-time visualization of radar, satellite, lightning data, severe-weather alerts, air-quality indices, and astronomical information on a single map interface.

**Core Goals:**
- Single map interface for exploring multiple atmospheric/planetary data sources
- Use open/public data with standardized proxy access and caching
- Interactive controls (timelines, legends, playback) for educational exploration
- Foundation for advanced features like multi-model comparisons and smooth animations

**Current Milestone (M1):** Stand up core infrastructure and minimal app shell with Tracestrack basemap integration.

## Architecture

### Monorepo Structure
This is a pnpm workspace monorepo organized into:

- **apps/web/** - Next.js 14 web dashboard with MapLibre GL mapping and deck.gl overlays
- **proxy-server/** - Express-based Node.js proxy for local development (TypeScript with live reload)
- **packages/** - Shared libraries:
  - `tokens` - Design tokens built with Style Dictionary v4
  - `providers` - Weather data provider modules with S3-first categorization and machine-readable manifest
  - `proxy-constants` - Shared constants for proxy services
  - `shared-utils` - Common utilities including secrets management and port configuration
  - `fetch-client` - HTTP client utilities with retry logic
- **infra/** - Terraform configuration for serverless AWS deployment (API Gateway + Lambda + CloudFront + RDS)
- **tiling-services/** - 3 services:
  - `catalog-api` - Layer metadata service
  - `proxy-api` - Production Lambda proxy with restrictive CORS
  - `glm_toe` - GLM lightning Total Optical Energy FastAPI service
- **scripts/** - Development and operations utilities including CI/CD tools

### Backend Proxy Architecture
**Dual Proxy Setup:**
- **Development:** Express-based `proxy-server/` with live reload, helmet security, and comprehensive error handling
- **Production:** Lambda-based `tiling-services/proxy-api/` with restrictive CORS and cost tracking

Both proxy implementations:
- Centralize calls to external data providers following the S3-first policy
- Add required API keys from AWS Secrets Manager (with environment variable fallback)
- Implement caching and error handling with fetchWithRetry
- Forward standardized responses with cost-awareness headers
- Support the provider manifest system for dynamic routing

**Key Proxy Endpoints:**
- `/api/s3/:provider/*` - S3 object access with signed URLs and region-aware routing
- `/api/catalog/:provider/times` - Layer timeline data from SNS-driven index or S3 listing
- `/api/nws/alerts/*` - National Weather Service alerts (GeoJSON)
- `/api/air/airnow`, `/api/air/openaq` - Air quality data
- `/api/gibs/tile/*` - NASA GIBS satellite tiles (non-S3)
- `/api/glm-toe/{z}/{x}/{y}.png` - GLM lightning Total Optical Energy tiles
- `/api/point/metno` - MET Norway location forecasts
- `/api/space/*` - NOAA Space Weather data

### Frontend Dashboard Components
The apps/web dashboard implements:

**Map Layers:**
- Dual basemap sources (CyclOSM and Tracestrack) via proxy
- NWS alerts overlay with severity-based styling and popups
- GLM lightning raster tiles with color-mapped energy intensity
- Configurable opacity and visibility controls

**Interactive Controls:**
- Timeline component with play/pause, scrubbing, and frame prefetching
- GLM legend panel with aggregation window selection (1-10 min)
- Astronomy panel showing sun/moon positions via geolocation + suncalc
- Adjustable playback FPS and animation controls

**State Management:**
- Zustand for application state
- MapLibre GL JS with deck.gl overlays
- Real-time data fetching with caching

## Commands

### Primary Development Commands
```bash
# Install dependencies
pnpm install

# Start web development server (runs on port 3002)
pnpm dev

# Build all packages
pnpm build

# Run linting across all packages
pnpm lint

# Run tests across all packages
pnpm test

# Format code with Prettier
pnpm format

# Build design tokens
pnpm tokens
```

### Service Management Scripts
```bash
# Start all services
pnpm start
# or: ./scripts/start-atmosinsight.sh

# Stop all services  
pnpm stop
# or: ./scripts/stop-atmosinsight.sh

# Check service status
pnpm status
# or: ./scripts/status-atmosinsight.sh

# Restart services
pnpm restart
```

### Port Scanning and Management
```bash
# Scan common ports
pnpm scan:common

# Scan specific port ranges
pnpm scan:web      # ports 80, 443
pnpm scan:database # ports 3306-5432

# Kill processes on ports
pnpm kill:common
pnpm kill:web
pnpm kill:database
```

## Port Configuration

All service ports are centrally defined in `config/ports.json`:
- Proxy: 3000
- Catalog: 3001  
- Web: 3002
- Database range: 3306-5432

Scripts and services load from this file as the single source of truth for port assignments.

## Design Tokens

The design system uses Style Dictionary v4 in `packages/tokens/`. Key tokens include:
- Colors: Accent Teal (#1BC7B5), Accent Coral (#FF7A66)
- Spacing: 4, 8, 12, 16px scale
- Border radius: 8, 10, 12, 14px
- Motion timings: fast (150ms), slow (300ms)

Tokens are built to CSS variables and TypeScript exports. Run `pnpm tokens` after making changes.

## Environment Variables

The application uses environment variables for provider APIs, AWS services, and feature toggles. Key categories:

- **Provider APIs**: `NWS_USER_AGENT`, `OPENWEATHER_API_KEY`, `AIRNOW_API_KEY`, `TRACESTRACK_API_KEY`, `FIRMS_MAP_KEY`
- **AWS Services**: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `LAMBDA_FUNCTION_NAME`
- **Feature Toggles**: `GIBS_ENABLED`, `GLM_TOE_ENABLED`, `FIRMS_ENABLED` 
- **Service URLs**: `GLM_TOE_PY_URL`, `CATALOG_API_BASE`, `NEXT_PUBLIC_API_BASE_URL`
- **Security**: `ALLOWED_ORIGINS`, `NODE_ENV`
- **S3 Configuration**: `REQUESTER_PAYS_DEFAULT`, `AWS_S3_FORCE_PATH_STYLE`, `PROVIDER_CONFIG_PATH`

Secrets can be managed via AWS Secrets Manager (production) or environment variables (development).
See `packages/providers/providers.json` for the machine-readable provider manifest.

## Weather Data Providers

The system implements an **S3-first policy** with machine-readable provider manifest at `packages/providers/providers.json`:

**S3 Providers (Direct AWS Access):**
- **NOAA Data** (us-east-1): GOES-19/18 ABI & GLM, HRRR, MRMS, NEXRAD Level II, GFS, NAM, NBM, NDFD, NWM, RTOFS, GESTOFS
- **Cross-Region S3**: Landsat (us-west-2), Copernicus DEM (eu-central-1) - with cost annotations
- **Earthdata Cloud**: FIRMS, PO.DAAC, NSIDC, LAADS - requiring authentication
- **Open Datasets**: Sentinel-2 COG, HiRISE DTMs, LOLA - various regions

**Non-S3 Providers (External APIs):**
- **NASA GIBS** - WMTS/XYZ tiles (not available on S3)
- **Air Quality**: AirNow (API key), OpenAQ (free)
- **Weather Services**: MET Norway (User-Agent required), NOAA SWPC
- **Commercial**: TracesTrack topographic tiles, OpenWeatherMap
- **Community**: CyclOSM (development only)

**Provider Categorization:**
- Each provider includes `access: "s3" | "non_s3"`, `costNote`, `auth` method, and license information
- S3 providers specify bucket, region, and requester-pays status
- Cost-awareness headers (`x-cost-note`) distinguish same-region, cross-region, and external services

Provider utilities in `packages/providers/index.ts` enable filtering by category, access type, and cost model.

## Development Notes

**Frontend Stack:**
- Next.js App Router in `apps/web/`
- MapLibre GL JS for mapping with deck.gl overlays for advanced visualizations
- State management with Zustand for application state
- React components for interactive controls (timelines, legends, panels)
- Real-time data visualization with frame animation and prefetching

**Backend Architecture:**
- Express-based proxy server with consistent `/api/*` routing
- Caching layer for external API responses
- Error handling and failover across multiple tile servers
- API key injection and user-agent management for third-party services

**Infrastructure:**
- Serverless deployment: API Gateway + Lambda + CloudFront + S3
- Terraform for AWS resource provisioning
- Environment-based configuration for API keys and feature toggles
- Support for local development and production deployment

**Code Organization:**
- TypeScript throughout with strict configuration
- ESLint for linting, Prettier for formatting
- Monorepo structure with pnpm workspaces
- Shared packages for cross-cutting concerns
- No formal test framework configured yet (test scripts echo "no tests")

**Key Features:**
- Real-time weather data aggregation from multiple sources
- Interactive map with multiple overlay types and basemap options
- Timeline controls for temporal data with smooth playback
- Educational focus with legends, color ramps, and contextual information