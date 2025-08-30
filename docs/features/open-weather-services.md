# Open Weather Services & Expansion Ideas

This document catalogs freely accessible, non-proprietary weather and space-data feeds that can be proxied through the AtmosInsight backend. It also lists feature directions and reference sites that align with the project's "build before buy" ethos.

## Non‑API Weather & Space Data Services

| Service | Type | Access Notes | Proxy Example |
|--------|------|--------------|---------------|
| **NOAA NEXRAD** | U.S. radar mosaics | Public S3 on `noaa-nexrad-level2` and `noaa-nexrad-level3`; no key required | `/api/radar/nexrad/{z}/{x}/{y}.png` → S3 tile URL |
| **Environment Canada** | Canadian radar | WMS/WMTS at `https://geo.weather.gc.ca/geomet/`; attribution required | `/api/radar/canada/{layer}/{z}/{x}/{y}.png` |
| **Brazil INMET** | Brazilian radar | Public WMS: `http://sgo.inmet.gov.br` | `/api/radar/inmet/{layer}/{z}/{x}/{y}.png` |
| **Australia BOM** | Australian radar | WMS: `https://api.weather.bom.gov.au/v1/radar`; free but attribution required | `/api/radar/bom/{layer}/{z}/{x}/{y}.png` |
| **NASA GIBS** | Global satellite tiles | WMTS/XYZ endpoints; already implemented | `/api/gibs/tile/...` |
| **Himawari 8/9** | Western Pacific GEO sat | NOAA S3 mirror `himawari8` | `/api/sat/himawari/{z}/{x}/{y}.png` |
| **EUMETSAT Meteosat** | Europe/Africa GEO sat | Requires free Data Store token; WMTS | `/api/sat/meteosat/{layer}/{z}/{x}/{y}.jpg` |
| **NOAA GFS/HRRR** | Forecast model grids | GRIB2 via `nomads.ncep.noaa.gov` or AWS; convert to COG/PMTiles | `/api/model/{model}/{var}/{z}/{x}/{y}.png` |
| **METAR/ASOS** | Surface observations | Text/CSV via `https://aviationweather.gov`; parse to PMTiles | `/api/obs/metar/latest.json` |
| **AirNow** | U.S. air quality index | Requires free API key; JSON | `/api/air/airnow/...?lat=..&lon=..` |
| **OpenAQ** | Global air quality | Public REST, no key | `/api/air/openaq/...` |
| **NOAA SWPC** | Space weather (solar wind, Kp, auroral oval) | JSON/CSV; no key | `/api/space/kp/latest.json` |

*All services should be routed through `/api/...` endpoints with caching (`shortLived60` unless otherwise required) and attribution metadata.*

## Feature Directions

- **Layer metadata panel** with source, license, and refresh cadence.
- **Time alignment** across radar, satellite, and lightning layers with latency indicators.
- **Offline mode**: cache last few frames and degrade gracefully on slow networks.
- **Educational popovers** explaining each layer, uncertainties, and usage tips.
- **Space‑Earth interactions**: solar wind vs. aurora probability, magnetosphere overlays.
- **Crowdsourced observations** (optional) stored separately and displayed as a toggleable layer.

## Reference Sites (Mostly Free/Open)

| Site | What They Offer | Cost Notes |
|------|-----------------|------------|
| **NASA Worldview** | Global satellite imagery & overlays | Public NASA data; free |
| **NOAA Radar Viewer** | U.S. radar loops & alerts | Government data; free |
| **Windy** | Global model visualizations | Free client, mixes proprietary & open sources |
| **Ventusky** | Radar/satellite + model comparisons | Primarily public data; ads support |
| **RainViewer** | Global radar aggregation | Free tiles with attribution |
| **LightningMaps** | Real‑time lightning strikes | Community network; public tiles |
| **earth.nullschool.net** | Animated wind/ocean currents | Uses open forecast models |
| **Open‑Meteo** | Free forecast API | Backend proxies public model data |
| **Pivotal Weather** | Model maps & soundings | Open data; ad-supported |
| **Zoom Earth** | Near real-time satellite & radar | Open data; simple tile approach |

These examples demonstrate that rich meteorological experiences can be built almost entirely on open data and OSS tooling.

