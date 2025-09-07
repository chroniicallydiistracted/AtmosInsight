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

- **apps/web/** - React/Next.js dashboard with MapLibre GL mapping
- **proxy-server/** - Express-based Node.js proxy centralizing external API calls
- **packages/** - Shared libraries:
  - `tokens` - Design tokens built with Style Dictionary v4
  - `providers` - Weather data provider modules 
  - `proxy-constants` - Shared constants for proxy services
  - `shared-utils` - Common utilities
  - `fetch-client` - HTTP client utilities
- **infra/** - Terraform configuration for serverless AWS deployment (API Gateway + Lambda + CloudFront)
- **tiling-services/** - Tile rendering services (including GLM lightning processing)
- **data-pipelines/** - ETL jobs for data processing
- **scripts/** - Development and operations utilities

### Backend Proxy Architecture
The proxy-server exposes `/api/*` endpoints that:
- Centralize calls to external data providers (NWS, OpenWeather, NASA GIBS, AirNow, etc.)
- Add required API keys and user-agent headers
- Implement caching and error handling
- Forward standardized responses to frontend

**Key Proxy Endpoints:**
- `/api/nws/alerts/*` - National Weather Service alerts (GeoJSON)
- `/api/air/airnow`, `/api/air/openaq` - Air quality data
- `/api/osm/cyclosm/{z}/{x}/{y}.png` - OpenStreetMap CyclOSM tiles
- `/api/gibs/tile/*` - NASA GIBS satellite tiles
- `/api/glm-toe/{z}/{x}/{y}.png` - GLM lightning Total Optical Energy tiles
- `/api/rainviewer/*` - RainViewer radar frames and indices

### Frontend Dashboard Components
The apps/web dashboard implements:

**Map Layers:**
- Dual basemap sources (CyclOSM and Tracestrack) via proxy
- NWS alerts overlay with severity-based styling and popups
- GLM lightning raster tiles with color-mapped energy intensity
- RainViewer radar with frame animation and prefetching
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

The application uses numerous environment variables for weather provider APIs, AWS services, and feature toggles. Key categories:

- **Weather APIs**: NWS_USER_AGENT, OPENWEATHER_API_KEY, WEATHERKIT_*, METEOMATICS_*
- **AWS**: AWS_ACCESS_KEY_ID, LAMBDA_FUNCTION_NAME, DIST_ID, APP_BUCKET
- **Feature Toggles**: RAINVIEWER_ENABLED, GIBS_ENABLED, GLM_TOE_ENABLED
- **Frontend**: NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_DEV_PORT

See `README_MAIN.md` for complete environment variable documentation.

## Weather Data Providers

The system integrates numerous atmospheric and planetary science data sources:

**Weather & Radar:**
- National Weather Service (NWS) - alerts, forecasts, observations
- OpenWeatherMap - global weather tiles and data
- RainViewer - real-time radar precipitation with animation
- WeatherKit (Apple) - premium weather data
- Meteomatics - meteorological model data

**Satellite & Lightning:**
- NASA GIBS - satellite imagery and earth observation data
- GLM (Geostationary Lightning Mapper) - lightning Total Optical Energy on 2×2km grid
- NOAA GOES-East/West - satellite data via AWS Open Data

**Air Quality:**
- AirNow (U.S. EPA) - official air quality indices
- OpenAQ - global air quality measurements
- PurpleAir - crowdsourced air quality sensors

**Additional Data Sources:**
- FIRMS - NASA fire detection and monitoring
- Tracestrack/CyclOSM - basemap tile services
- Astronomical data - sun/moon calculations via suncalc

Provider modules are organized in `packages/providers/` with TypeScript support and consistent API interfaces.

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