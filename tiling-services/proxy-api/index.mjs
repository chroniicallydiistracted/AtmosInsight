// packages/proxy-constants/index.js
var DEFAULT_NWS_USER_AGENT = "(AtmosInsight, contact@atmosinsight.com)";
var GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts";
var OWM_BASE = "https://tile.openweathermap.org/map";
var OWM_ALLOW = /* @__PURE__ */ new Set([
  "clouds_new",
  "precipitation_new",
  "pressure_new",
  "wind_new",
  "temp_new",
  "rain",
  "snow"
]);
function buildGibsTileUrl({ epsg, layer, time, tms, z, y, x, ext }) {
  const timePart = time ? `${time}/` : "";
  return `${GIBS_BASE}/epsg${epsg}/best/${layer}/default/${timePart}${tms}/${z}/${y}/${x}.${ext}`;
}
function buildGibsDomainsUrl({ epsg, layer, tms, range }) {
  return `${GIBS_BASE}/epsg${epsg}/best/1.0.0/${layer}/default/${tms}/all/${range}.xml`;
}

// packages/shared-utils/dist/index.js
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var config = null;
var absConfigPath = "/AtmosInsight/config/ports.json";
var relativeConfigPath = join(__dirname, "..", "..", "config", "ports.json");
try {
  config = JSON.parse(readFileSync(absConfigPath, "utf8"));
} catch (e) {
  try {
    config = JSON.parse(readFileSync(relativeConfigPath, "utf8"));
  } catch (e2) {
    config = { proxy: 3e3, catalog: 3001, web: 3002, database: 5432 };
  }
}
var PORTS = {
  PROXY: config.proxy,
  CATALOG: config.catalog,
  WEB: config.web,
  DATABASE: config.database
};
async function fetchWithRetry(url, options = {}, retries = 3, timeoutMs = 1e4, backoffMs = 500) {
  let attempt = 0;
  let delay = backoffMs;
  while (true) {
    try {
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
      const response = await fetch(url, { ...options, signal });
      if (response.status === 429 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        attempt++;
        continue;
      }
      return response;
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
      attempt++;
    }
  }
}

// packages/providers/providers.json
var providers_default = {
  providers: [
    {
      id: "goes19-abi",
      name: "GOES-19 ABI",
      category: "satellite",
      access: "s3",
      s3: {
        bucket: "noaa-goes19",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "ABI-L2-CMIPC/2025/09/08/",
          "ABI-L1b-RadC/2025/09/08/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NESDIS",
      notes: "Public S3; prefer same-Region access",
      costNote: "same-region"
    },
    {
      id: "goes18-abi",
      name: "GOES-18 ABI",
      category: "satellite",
      access: "s3",
      s3: {
        bucket: "noaa-goes18",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "ABI-L2-CMIPC/2025/09/08/",
          "ABI-L1b-RadC/2025/09/08/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NESDIS",
      notes: "Public S3; prefer same-Region access",
      costNote: "same-region"
    },
    {
      id: "goes19-glm",
      name: "GOES-19 GLM Lightning",
      category: "lightning",
      access: "s3",
      s3: {
        bucket: "noaa-goes19",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "GLM-L2-LCFA/2025/09/08/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NESDIS",
      notes: "GLM Lightning data for TOE processing",
      costNote: "same-region"
    },
    {
      id: "hrrr",
      name: "HRRR Model",
      category: "weather",
      access: "s3",
      s3: {
        bucket: "noaa-hrrr-bdp-pds",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "hrrr.20250908/conus/",
          "hrrr.20250908/alaska/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NCEP",
      notes: "High-resolution rapid refresh model GRIB2 files",
      costNote: "same-region"
    },
    {
      id: "mrms",
      name: "MRMS Multi-Radar",
      category: "radar",
      access: "s3",
      s3: {
        bucket: "noaa-mrms-pds",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "CONUS/PrecipRate_00.00/20250908/",
          "CONUS/ReflectivityAtLowestAltitude_00.00/20250908/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/MRMS",
      notes: "Multi-radar multi-sensor precipitation and reflectivity",
      costNote: "same-region"
    },
    {
      id: "nexrad-level2",
      name: "NEXRAD Level II",
      category: "radar",
      access: "s3",
      s3: {
        bucket: "unidata-nexrad-level2",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "2025/09/08/KAMX/",
          "2025/09/08/KBMX/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/Unidata",
      notes: "Raw Level II radar volumes",
      costNote: "same-region"
    },
    {
      id: "gfs",
      name: "GFS Global Model",
      category: "weather",
      access: "s3",
      s3: {
        bucket: "noaa-gfs-bdp-pds",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "gfs.20250908/00/atmos/",
          "gfs.20250908/06/atmos/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NCEP",
      notes: "Global Forecast System GRIB2 files",
      costNote: "same-region"
    },
    {
      id: "nam",
      name: "NAM Model",
      category: "weather",
      access: "s3",
      s3: {
        bucket: "noaa-nam-pds",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "nam.20250908/",
          "nam_conusnest.20250908/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NCEP",
      notes: "North American Mesoscale model",
      costNote: "same-region"
    },
    {
      id: "nbm",
      name: "NBM Blend",
      category: "weather",
      access: "s3",
      s3: {
        bucket: "noaa-nbm-pds",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "blend.20250908/00/",
          "blend.20250908/12/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NCEP",
      notes: "National Blend of Models",
      costNote: "same-region"
    },
    {
      id: "ndfd",
      name: "NDFD Forecast",
      category: "weather",
      access: "s3",
      s3: {
        bucket: "noaa-ndfd-pds",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "SL.us008001/ST.opnl/DF.gr2/DC.ndfd/AR.conus/",
          "SL.us008001/ST.opnl/DF.gr2/DC.ndfd/AR.alaska/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NWS",
      notes: "National Digital Forecast Database",
      costNote: "same-region"
    },
    {
      id: "nwm",
      name: "National Water Model",
      category: "hydrology",
      access: "s3",
      s3: {
        bucket: "noaa-nwm-pds",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "nwm.20250908/",
          "nwm.20250908/short_range/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/OWP",
      notes: "National Water Model forecasts",
      costNote: "same-region"
    },
    {
      id: "rtofs",
      name: "RTOFS Ocean Model",
      category: "ocean",
      access: "s3",
      s3: {
        bucket: "noaa-nws-rtofs-pds",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "rtofs.20250908/",
          "rtofs_da.20250908/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NCEP",
      notes: "Real-Time Ocean Forecast System",
      costNote: "same-region"
    },
    {
      id: "gestofs",
      name: "GESTOFS Storm Surge",
      category: "ocean",
      access: "s3",
      s3: {
        bucket: "noaa-gestofs-pds",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "gestofs.20250908/",
          "gestofs_da.20250908/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NOS",
      notes: "Global Extratropical Surge and Tide Operational Forecast System",
      costNote: "same-region"
    },
    {
      id: "landsat-pds",
      name: "Landsat on AWS",
      category: "satellite",
      access: "s3",
      s3: {
        bucket: "landsat-pds",
        region: "us-west-2",
        requesterPays: false,
        prefixExamples: [
          "c1/L8/042/034/LC08_L1TP_042034_20170616_20170629_01_T1/",
          "collection02/level-1/standard/oli-tirs/2025/042/034/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "USGS open",
      attribution: "USGS/NASA",
      notes: "Landsat Collection 1 and 2 imagery",
      costNote: "cross-region (us-west-2)"
    },
    {
      id: "copernicus-dem-30m",
      name: "Copernicus DEM 30m",
      category: "elevation",
      access: "s3",
      s3: {
        bucket: "copernicus-dem-30m",
        region: "eu-central-1",
        requesterPays: false,
        prefixExamples: [
          "Copernicus_DSM_COG_10_N46_00_E006_00_DEM/",
          "Copernicus_DSM_COG_10_N45_00_E005_00_DEM/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "CC-BY-4.0",
      attribution: "ESA/Copernicus",
      notes: "Global 30m elevation model",
      costNote: "cross-region (eu-central-1)"
    },
    {
      id: "copernicus-dem-90m",
      name: "Copernicus DEM 90m",
      category: "elevation",
      access: "s3",
      s3: {
        bucket: "copernicus-dem-90m",
        region: "eu-central-1",
        requesterPays: false,
        prefixExamples: [
          "Copernicus_DSM_COG_30_N46_00_E006_00_DEM/",
          "Copernicus_DSM_COG_30_N45_00_E005_00_DEM/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "CC-BY-4.0",
      attribution: "ESA/Copernicus",
      notes: "Global 90m elevation model",
      costNote: "cross-region (eu-central-1)"
    },
    {
      id: "nasa-gibs",
      name: "NASA GIBS",
      category: "satellite",
      access: "non_s3",
      s3: null,
      wmts: {
        baseUrl: "https://gibs.earthdata.nasa.gov/wmts-geo/1.0.0",
        layers: [
          "MODIS_Terra_CorrectedReflectance_TrueColor",
          "MODIS_Aqua_CorrectedReflectance_TrueColor",
          "VIIRS_SNPP_CorrectedReflectance_TrueColor"
        ]
      },
      auth: "none",
      license: "NASA open",
      attribution: "NASA/GIBS",
      notes: "Global Imagery Browse Services - WMTS tiles only, not S3",
      costNote: "external-service"
    },
    {
      id: "airnow",
      name: "AirNow API",
      category: "air-quality",
      access: "non_s3",
      s3: null,
      rest: {
        baseUrl: "https://www.airnowapi.org",
        apiKeyRequired: true,
        endpoints: [
          "/aq/current/",
          "/aq/forecast/",
          "/aq/observations/"
        ]
      },
      auth: "api_key",
      license: "EPA open with registration",
      attribution: "U.S. EPA AirNow",
      notes: "Real-time air quality data - requires API key",
      costNote: "external-service"
    },
    {
      id: "openaq",
      name: "OpenAQ API",
      category: "air-quality",
      access: "non_s3",
      s3: null,
      rest: {
        baseUrl: "https://api.openaq.org/v3",
        apiKeyRequired: false,
        endpoints: [
          "/locations",
          "/measurements",
          "/averages"
        ]
      },
      auth: "none",
      license: "CC-BY-4.0",
      attribution: "OpenAQ",
      notes: "Global air quality measurements from community",
      costNote: "external-service"
    },
    {
      id: "met-norway",
      name: "MET Norway Locationforecast",
      category: "weather",
      access: "non_s3",
      s3: null,
      rest: {
        baseUrl: "https://api.met.no/weatherapi/locationforecast/2.0",
        apiKeyRequired: false,
        userAgentRequired: true,
        endpoints: [
          "/complete",
          "/compact"
        ]
      },
      auth: "user_agent",
      license: "Norwegian Licence for Open Government Data",
      attribution: "MET Norway",
      notes: "Requires proper User-Agent header",
      costNote: "external-service"
    },
    {
      id: "noaa-swpc",
      name: "NOAA Space Weather",
      category: "space-weather",
      access: "non_s3",
      s3: null,
      rest: {
        baseUrl: "https://services.swpc.noaa.gov",
        apiKeyRequired: false,
        endpoints: [
          "/products/solar-wind/",
          "/products/geomag-indices/",
          "/products/auroral-activity/"
        ]
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/SWPC",
      notes: "Space weather alerts and indices",
      costNote: "external-service"
    },
    {
      id: "tracestrack-topo",
      name: "TracesTrack Topographic",
      category: "basemap",
      access: "non_s3",
      s3: null,
      tiles: {
        baseUrl: "https://tile.tracestrack.com",
        apiKeyRequired: true,
        tileFormat: "/topo__/{z}/{x}/{y}.png",
        attribution: "\xA9 TracesTrack, \xA9 OpenStreetMap contributors"
      },
      auth: "api_key",
      license: "Commercial with attribution",
      attribution: "TracesTrack, OpenStreetMap contributors",
      notes: "High-quality topographic basemap - requires API key and attribution",
      costNote: "external-service"
    },
    {
      id: "openweather-tiles",
      name: "OpenWeatherMap Tiles",
      category: "weather",
      access: "non_s3",
      s3: null,
      tiles: {
        baseUrl: "https://tile.openweathermap.org/map",
        apiKeyRequired: true,
        layers: [
          "precipitation_new",
          "clouds_new",
          "temp_new",
          "wind_new"
        ],
        tileFormat: "/{layer}/{z}/{x}/{y}.png"
      },
      auth: "api_key",
      license: "OWM Commercial",
      attribution: "OpenWeatherMap",
      notes: "Weather overlay tiles - requires API key",
      costNote: "external-service"
    },
    {
      id: "cyclosm",
      name: "CyclOSM",
      category: "basemap",
      access: "non_s3",
      s3: null,
      tiles: {
        baseUrl: "https://a.tile-cyclosm.openstreetmap.fr/cyclosm",
        apiKeyRequired: false,
        tileFormat: "/{z}/{x}/{y}.png",
        attribution: "\xA9 OpenStreetMap contributors"
      },
      auth: "none",
      license: "ODbL",
      attribution: "OpenStreetMap contributors",
      notes: "Community tiles - use sparingly per usage policy",
      costNote: "external-service"
    },
    {
      id: "hrrrzarr",
      name: "HRRR Zarr Analysis-Ready",
      category: "weather",
      access: "s3",
      s3: {
        bucket: "hrrrzarr",
        region: "us-west-1",
        requesterPays: false,
        prefixExamples: [
          "sfc/20250908/20250908_00z_anl.zarr",
          "prs/20250908/20250908_00z_anl.zarr"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NCEP, University of Utah",
      notes: "Near-real time HRRR analysis-ready Zarr data managed by University of Utah",
      costNote: "cross-region (us-west-1)"
    },
    {
      id: "sentinel2-cog",
      name: "Sentinel-2 L2A COG",
      category: "satellite",
      access: "s3",
      s3: {
        bucket: "sentinel-cogs",
        region: "us-west-2",
        requesterPays: false,
        prefixExamples: [
          "sentinel-s2-l2a-cogs/32/T/MM/2025/1/S2A_32TMM_20250109_0_L2A/",
          "sentinel-s2-l2a-cogs/33/T/UF/2025/1/S2B_33TUF_20250109_0_L2A/"
        ],
        snsTopic: "arn:aws:sns:us-west-2:608149789419:cirrus-v0-publish"
      },
      auth: "none",
      license: "ESA open (CC-BY-4.0)",
      attribution: "ESA/Copernicus, Element84",
      notes: "Sentinel-2 L2A Cloud-Optimized GeoTIFFs with SNS notifications for new scenes",
      costNote: "cross-region (us-west-2)"
    },
    {
      id: "nsf-ncar-era5",
      name: "NCAR ERA5 Reanalysis",
      category: "climate",
      access: "s3",
      s3: {
        bucket: "nsf-ncar-era5",
        region: "us-west-2",
        requesterPays: false,
        prefixExamples: [
          "",
          "atmos/"
        ],
        snsTopic: "arn:aws:sns:us-west-2:891377163634:nsf-ncar-era5-object_created"
      },
      auth: "none",
      license: "CC-BY-4.0",
      attribution: "NSF NCAR",
      notes: "Global atmospheric reanalysis (1979\u2013present)",
      costNote: "cross-region (us-west-2)"
    },
    {
      id: "ncar-cesm-lens",
      name: "NCAR CESM Large Ensemble",
      category: "climate",
      access: "s3",
      s3: {
        bucket: "ncar-cesm-lens",
        region: "us-west-2",
        requesterPays: false,
        prefixExamples: [
          "atm/monthly/",
          "atm/monthly/cesmLE-20C-TEMP.zarr"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "CC-BY-4.0",
      attribution: "NCAR/UCAR",
      notes: "40-member ensemble climate simulations (1920\u20132100)",
      costNote: "cross-region (us-west-2)"
    },
    {
      id: "nasanex",
      name: "NASA Earth Exchange (NEX)",
      category: "climate",
      access: "s3",
      s3: {
        bucket: "nasanex",
        region: "us-west-2",
        requesterPays: false,
        prefixExamples: [
          "NEX-DCP30/",
          "NEX-GDDP/",
          "LOCA/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "US Government work (public domain)",
      attribution: "NASA NEX",
      notes: "Downscaled climate projections and related datasets",
      costNote: "cross-region (us-west-2)"
    },
    {
      id: "omi-no2-nasa",
      name: "NASA OMI NO2",
      category: "atmospheric-chemistry",
      access: "s3",
      s3: {
        bucket: "omi-no2-nasa",
        region: "us-west-2",
        requesterPays: false,
        prefixExamples: [
          "",
          "daily/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "Public domain",
      attribution: "NASA GSFC",
      notes: "Global NO2 tropospheric column composites (0.25\xB0)",
      costNote: "cross-region (us-west-2)"
    },
    {
      id: "epa-rsei-pds",
      name: "EPA RSEI",
      category: "air-quality",
      access: "s3",
      s3: {
        bucket: "epa-rsei-pds",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: [
          "",
          "rsei/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "US Government (public domain)",
      attribution: "U.S. EPA",
      notes: "Risk-Screening Environmental Indicators",
      costNote: "same-region"
    },
    {
      id: "ncar-na-cordex",
      name: "NCAR NA-CORDEX",
      category: "climate",
      access: "s3",
      s3: {
        bucket: "ncar-na-cordex",
        region: "us-west-2",
        requesterPays: false,
        prefixExamples: [
          "",
          "zarr/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "CC-BY-4.0",
      attribution: "NSF NCAR",
      notes: "Regional climate simulations over North America",
      costNote: "cross-region (us-west-2)"
    },
    {
      id: "usgs-lidar",
      name: "USGS 3DEP Lidar",
      category: "elevation",
      access: "s3",
      s3: {
        bucket: "usgs-lidar",
        region: "us-west-2",
        requesterPays: true,
        prefixExamples: [
          "",
          "laz/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "Public domain",
      attribution: "USGS",
      notes: "High-resolution elevation point clouds (ASPRS LAS/LAZ)",
      costNote: "requester-pays"
    },
    {
      id: "ecmwf-forecasts",
      name: "ECMWF Forecasts",
      category: "weather",
      access: "s3",
      s3: {
        bucket: "ecmwf-forecasts",
        region: "eu-central-1",
        requesterPays: false,
        prefixExamples: [
          "",
          "grib2/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "CC-BY-4.0",
      attribution: "ECMWF",
      notes: "Real-time global forecasts (0.4\xB0 GRIB2)",
      costNote: "cross-region (eu-central-1)"
    },
    {
      id: "met-office-radar-obs",
      name: "UK Met Office Radar",
      category: "radar",
      access: "s3",
      s3: {
        bucket: "met-office-radar-obs-data",
        region: "eu-west-2",
        requesterPays: false,
        prefixExamples: [
          "",
          "radar/"
        ],
        snsTopic: "arn:aws:sns:eu-west-2:633885181284:met-office-radar-obs-data-object_created"
      },
      auth: "none",
      license: "CC BY-SA",
      attribution: "UK Met Office",
      notes: "UK radar composites (15-min cadence)",
      costNote: "cross-region (eu-west-2)"
    },
    {
      id: "fmi-radar-geotiff",
      name: "FMI Radar GeoTIFF",
      category: "radar",
      access: "s3",
      s3: {
        bucket: "fmi-opendata-radar-geotiff",
        region: "eu-west-1",
        requesterPays: false,
        prefixExamples: [
          "",
          "composites/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "CC-BY-4.0",
      attribution: "Finnish Meteorological Institute",
      notes: "Weather radar composites and volumes",
      costNote: "cross-region (eu-west-1)"
    },
    {
      id: "jaxa-alos2",
      name: "JAXA ALOS/PALSAR-2",
      category: "satellite",
      access: "s3",
      s3: {
        bucket: "jaxaalos2",
        region: "us-west-2",
        requesterPays: false,
        prefixExamples: [
          "palsar2/",
          "palsar2/L2.2/"
        ],
        snsTopic: null
      },
      auth: "none",
      license: "JAXA open terms",
      attribution: "JAXA",
      notes: "L-band SAR imagery (25m) for land and disaster applications",
      costNote: "cross-region (us-west-2)"
    }
  ],
  meta: {
    version: "1.0.0",
    updated: "2025-09-09T00:00:00Z",
    schema: "https://github.com/chroniicallydiistracted/AtmosInsight/schemas/providers-v1.json",
    notes: "Provider manifest following AGENTS.md S3-first specification"
  }
};

// packages/providers/index.js
var providersManifest = providers_default;
var providers = providersManifest.providers;

// tiling-services/proxy-api/index.ts
async function getApiKey(envVarName, secretEnvVar) {
  const secretName = secretEnvVar ? process.env[secretEnvVar] : null;
  if (secretName) {
    console.log(`Would fetch secret: ${secretName}`);
  }
  return process.env[envVarName] || "";
}
async function getProvidersManifest() {
  try {
    if (Array.isArray(providers) && providers.length > 0) {
      return providers;
    }
  } catch (err) {
    console.warn("Falling back to embedded providers. Reason:", err);
  }
  return getEmbeddedProviders();
}
function getEmbeddedProviders() {
  return [
    {
      id: "goes19-abi",
      name: "GOES-19 ABI",
      category: "satellite",
      access: "s3",
      s3: {
        bucket: "noaa-goes19",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: ["ABI-L2-CMIPC/2025/09/08/"]
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NESDIS",
      costNote: "same-region"
    },
    {
      id: "goes18-abi",
      name: "GOES-18 ABI",
      category: "satellite",
      access: "s3",
      s3: {
        bucket: "noaa-goes18",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: ["ABI-L2-CMIPC/2025/09/08/"]
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NESDIS",
      costNote: "same-region"
    },
    {
      id: "hrrr",
      name: "HRRR Model",
      category: "weather",
      access: "s3",
      s3: {
        bucket: "noaa-hrrr-bdp-pds",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: ["hrrr.20250908/conus/"]
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NCEP",
      costNote: "same-region"
    },
    {
      id: "mrms",
      name: "MRMS Multi-Radar",
      category: "radar",
      access: "s3",
      s3: {
        bucket: "noaa-mrms-pds",
        region: "us-east-1",
        requesterPays: false,
        prefixExamples: ["CONUS/PrecipRate_00.00/20250908/"]
      },
      auth: "none",
      license: "NOAA open",
      attribution: "NOAA/NESDIS",
      costNote: "same-region"
    }
  ];
}
var JSON_HEADERS = { "Content-Type": "application/json" };
var getAllowedOrigins = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.ALLOWED_ORIGINS || "https://atmosinsight.app,https://atmosinsight.westfam.media";
  }
  return process.env.ALLOWED_ORIGINS || "http://localhost:3002,http://localhost:3000,http://localhost:5173";
};
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": getAllowedOrigins().split(",")[0],
  // Use first origin as default
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Requested-With, Authorization",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Expose-Headers": "x-cost-note, x-provider-id, cache-control"
};
function buildCorsHeaders(event) {
  const allowed = getAllowedOrigins().split(",").map((s) => s.trim()).filter(Boolean);
  const reqOrigin = event.headers?.origin || event.headers?.Origin;
  let origin = allowed[0] || "*";
  if (allowed.includes("*")) origin = "*";
  else if (reqOrigin && allowed.includes(reqOrigin)) origin = reqOrigin;
  const requestedHeaders = event.headers?.["access-control-request-headers"] || event.headers?.["Access-Control-Request-Headers"];
  return {
    ...CORS_HEADERS,
    "Access-Control-Allow-Origin": origin,
    ...requestedHeaders ? { "Access-Control-Allow-Headers": requestedHeaders } : {},
    "Vary": "Origin"
  };
}
function json(status, obj, extra = {}) {
  return {
    statusCode: status,
    headers: { ...JSON_HEADERS, ...CORS_HEADERS, ...extra },
    body: JSON.stringify(obj)
  };
}
function text(status, body, headers = {}) {
  return {
    statusCode: status,
    headers: { ...CORS_HEADERS, ...headers },
    body
  };
}
function bin(status, bodyBuf, contentType, headers = {}) {
  return {
    statusCode: status,
    isBase64Encoded: true,
    headers: { "Content-Type": contentType, ...CORS_HEADERS, ...headers },
    body: Buffer.from(bodyBuf).toString("base64")
  };
}
function buildOwmTileUrl({ layer, z, x, y, apiKey }) {
  return `${OWM_BASE}/${layer}/${z}/${x}/${y}.png?appid=${encodeURIComponent(apiKey)}`;
}
function withShortCache(h = {}) {
  return { "Cache-Control": "public, max-age=60", ...h };
}
function withMediumCache(h = {}) {
  return { "Cache-Control": "public, max-age=300", ...h };
}
var handler = async (event) => {
  const path = event.rawPath || "/";
  const qs = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const method = event.requestContext?.http?.method || "GET";
  const DYNAMIC_CORS = buildCorsHeaders(event);
  try {
    if (method === "OPTIONS") {
      return {
        statusCode: 200,
        headers: DYNAMIC_CORS,
        body: ""
      };
    }
    if (path === "/api/health") {
      if (method === "HEAD") {
        return { statusCode: 200, headers: DYNAMIC_CORS, body: "" };
      }
      return {
        statusCode: 200,
        headers: { ...JSON_HEADERS, ...DYNAMIC_CORS, ...withShortCache() },
        body: JSON.stringify({
          status: "ok",
          service: "weather-proxy-api",
          time: (/* @__PURE__ */ new Date()).toISOString(),
          features: {
            gibs: process.env.GIBS_ENABLED === "true"
          }
        })
      };
    }
    if (path.startsWith("/api/catalog/")) {
      const base = (process.env.CATALOG_API_BASE || "").replace(/\/$/, "");
      if (!base) return json(503, { error: "CATALOG_API_BASE not configured" });
      const target = `${base}${path.replace("/api", "")}${qs}`;
      const upstream = await fetchWithRetry(target, {});
      const body = await upstream.text();
      return text(
        upstream.status,
        body,
        withShortCache({
          "Content-Type": upstream.headers.get("content-type") || "application/json"
        })
      );
    }
    if (path === "/api/providers") {
      try {
        const providers2 = await getProvidersManifest();
        return json(200, { providers: providers2 }, withShortCache());
      } catch (error) {
        return json(503, { error: "Failed to load providers manifest", detail: String(error) });
      }
    }
    let listMatch = path.match(/^\/api\/s3\/([^/]+)\/list$/);
    if (listMatch) {
      const [, providerId] = listMatch;
      const prefix = new URLSearchParams(qs.slice(1)).get("prefix") || "";
      const maxKeys = parseInt(new URLSearchParams(qs.slice(1)).get("max-keys") || "1000", 10);
      try {
        const providers2 = await getProvidersManifest();
        const provider = providers2.find((p) => p.id === providerId && p.access === "s3");
        if (!provider) {
          return json(404, { error: `S3 provider '${providerId}' not found` });
        }
        const { bucket, region, requesterPays } = provider.s3;
        const s3Url = region === "us-east-1" ? `https://${bucket}.s3.amazonaws.com/` : `https://${bucket}.s3.${region}.amazonaws.com/`;
        const listParams = new URLSearchParams({
          "list-type": "2",
          prefix,
          "max-keys": maxKeys.toString()
        });
        const continuationToken = new URLSearchParams(qs.slice(1)).get("continuation-token");
        if (continuationToken) {
          listParams.set("continuation-token", continuationToken);
        }
        const headers = {};
        if (requesterPays) {
          headers["x-amz-request-payer"] = "requester";
        }
        const upstream = await fetchWithRetry(`${s3Url}?${listParams.toString()}`, { headers });
        const xmlBody = await upstream.text();
        return text(
          upstream.status,
          xmlBody,
          withShortCache({
            "Content-Type": "application/xml",
            "x-cost-note": provider.costNote,
            "x-provider-id": providerId
          })
        );
      } catch (error) {
        return json(503, {
          error: `S3 list failed for ${providerId}`,
          detail: String(error),
          prefix
        });
      }
    }
    let s3Match = path.match(/^\/api\/s3\/([^/]+)\/(.+)$/);
    if (s3Match) {
      const [, providerId, objectKey] = s3Match;
      try {
        const providers2 = await getProvidersManifest();
        const provider = providers2.find((p) => p.id === providerId && p.access === "s3");
        if (!provider) {
          return json(404, { error: `S3 provider '${providerId}' not found` });
        }
        const { bucket, region, requesterPays } = provider.s3;
        const s3Url = region === "us-east-1" ? `https://${bucket}.s3.amazonaws.com/${objectKey}` : `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
        const headers = {};
        if (requesterPays) {
          headers["x-amz-request-payer"] = "requester";
        }
        const upstream = await fetchWithRetry(s3Url, { headers });
        const contentType = upstream.headers.get("content-type") || "application/octet-stream";
        if (contentType.startsWith("image/") || contentType.startsWith("application/")) {
          const buf = Buffer.from(await upstream.arrayBuffer());
          return bin(
            upstream.status,
            buf,
            contentType,
            withMediumCache({
              "x-cost-note": provider.costNote,
              "x-provider-id": providerId
            })
          );
        } else {
          const body = await upstream.text();
          return text(
            upstream.status,
            body,
            withMediumCache({
              "Content-Type": contentType,
              "x-cost-note": provider.costNote,
              "x-provider-id": providerId
            })
          );
        }
      } catch (error) {
        return json(503, {
          error: `S3 fetch failed for ${providerId}`,
          detail: String(error),
          objectKey
        });
      }
    }
    if (path === "/api/healthz") {
      return text(200, "ok", { "Content-Type": "text/plain" });
    }
    if (path.startsWith("/api/nws/alerts")) {
      const userAgent = process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT;
      const url = "https://api.weather.gov" + path.replace("/api/nws", "") + qs;
      const upstream = await fetchWithRetry(url, {
        headers: { "User-Agent": userAgent, Accept: "application/geo+json" }
      });
      const textBody = await upstream.text();
      return {
        statusCode: upstream.status,
        headers: withShortCache({
          "Content-Type": upstream.headers.get("content-type") || "application/geo+json"
        }),
        body: textBody
      };
    }
    let m = path.match(/^\/api\/owm\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const [, layer, z, x, y] = m;
      if (!OWM_ALLOW.has(layer))
        return json(400, { error: "unknown or blocked layer" });
      const apiKey = await getApiKey("OPENWEATHER_API_KEY", "OPENWEATHER_API_KEY_SECRET");
      if (!apiKey)
        return json(503, { error: "OPENWEATHER_API_KEY not configured" });
      const url = buildOwmTileUrl({ layer, z, x, y, apiKey });
      const upstream = await fetchWithRetry(url, {});
      const buf = Buffer.from(await upstream.arrayBuffer());
      return bin(
        upstream.status,
        buf,
        upstream.headers.get("content-type") || "image/png",
        withShortCache()
      );
    }
    m = path.match(/^\/api\/osm\/cyclosm\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const [, z, x, y] = m;
      const servers = ["a", "b", "c"];
      let lastError = null;
      for (const s of servers) {
        try {
          const url = `https://${s}.tile.openstreetmap.fr/cyclosm/${z}/${x}/${y}.png`;
          const upstream = await fetchWithRetry(url, {
            headers: {
              "User-Agent": process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT,
              "Referer": "https://weather.westfam.media",
              Accept: "image/png,image/*,*/*"
            }
          }, 2, 1e4);
          if (upstream.ok) {
            const buf = Buffer.from(await upstream.arrayBuffer());
            return bin(
              200,
              buf,
              upstream.headers.get("content-type") || "image/png",
              withMediumCache()
            );
          }
        } catch (e) {
          lastError = e;
          continue;
        }
      }
      return json(503, { error: "OpenStreetMap tile servers unavailable", detail: String(lastError ?? "") });
    }
    m = path.match(/^\/api\/basemap\/carto\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const [, style, z, x, y] = m;
      const validStyles = ["light_all", "dark_all", "voyager", "positron"];
      const mapStyle = validStyles.includes(style) ? style : "light_all";
      const servers = ["a", "b", "c", "d"];
      const server = servers[parseInt(x) % servers.length];
      try {
        const url = `https://${server}.basemaps.cartocdn.com/${mapStyle}/${z}/${x}/${y}.png`;
        const upstream = await fetchWithRetry(url, {
          headers: {
            "User-Agent": process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT,
            Accept: "image/png,image/*,*/*"
          }
        });
        if (upstream.ok) {
          const buf = Buffer.from(await upstream.arrayBuffer());
          return bin(
            upstream.status,
            buf,
            upstream.headers.get("content-type") || "image/png",
            withMediumCache()
          );
        }
        return json(upstream.status, { error: "Carto basemap unavailable" });
      } catch (e) {
        return json(503, { error: "Carto service unavailable", detail: String(e) });
      }
    }
    m = path.match(/^\/api\/basemap\/osm\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const [, z, x, y] = m;
      const servers = ["a", "b", "c"];
      let lastError = null;
      for (const s of servers) {
        try {
          const url = `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
          const upstream = await fetchWithRetry(url, {
            headers: {
              "User-Agent": `AtmosInsight/1.0 (${process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT})`,
              Accept: "image/png,image/*,*/*",
              "Referer": "https://weather.westfam.media"
            }
          });
          if (upstream.ok) {
            const buf = Buffer.from(await upstream.arrayBuffer());
            return bin(
              200,
              buf,
              upstream.headers.get("content-type") || "image/png",
              withMediumCache()
            );
          }
        } catch (e) {
          lastError = e;
          continue;
        }
      }
      try {
        const cartoServers = ["a", "b", "c", "d"];
        const cs = cartoServers[parseInt(x) % cartoServers.length];
        const cartoUrl = `https://${cs}.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`;
        const upstream = await fetchWithRetry(cartoUrl, {
          headers: {
            "User-Agent": process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT,
            Accept: "image/png,image/*,*/*"
          }
        });
        if (upstream.ok) {
          const buf = Buffer.from(await upstream.arrayBuffer());
          return bin(
            200,
            buf,
            upstream.headers.get("content-type") || "image/png",
            withMediumCache({ "x-basemap-fallback": "carto" })
          );
        }
      } catch (e2) {
        lastError = `${String(lastError ?? "")} | carto:${String(e2)}`;
      }
      return json(503, { error: "OSM standard tile servers unavailable", detail: String(lastError ?? "") });
    }
    m = path.match(/^\/api\/tracestrack\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.webp$/);
    if (m) {
      const [, style, z, x, y] = m;
      const apiKey = await getApiKey("TRACESTRACK_API_KEY", "TRACESTRACK_API_KEY_SECRET");
      if (!apiKey) return json(503, { error: "TRACESTRACK_API_KEY not configured" });
      const url = `https://tile.tracestrack.com/${style}/${z}/${x}/${y}.webp?key=${encodeURIComponent(apiKey)}`;
      const upstream = await fetchWithRetry(url, {});
      const buf = Buffer.from(await upstream.arrayBuffer());
      return bin(
        upstream.status,
        buf,
        upstream.headers.get("content-type") || "image/webp",
        withMediumCache()
      );
    }
    if (path === "/api/gibs/redirect") {
      const params = new URLSearchParams(event.rawQueryString || "");
      const layer = params.get("layer");
      const epsg = params.get("epsg");
      const time = params.get("time") || void 0;
      const tms = params.get("tms");
      const z = params.get("z");
      const y = params.get("y");
      const x = params.get("x");
      const ext = params.get("ext") || "png";
      if (!layer || !epsg || !tms || !z || !y || !x)
        return json(400, { error: "missing params" });
      const url = buildGibsTileUrl({ epsg, layer, time, tms, z, y, x, ext });
      if (!url.startsWith("https://gibs.earthdata.nasa.gov/"))
        return json(400, { error: "invalid redirect" });
      return {
        statusCode: 302,
        headers: { Location: url, ...withShortCache() },
        body: ""
      };
    }
    m = path.match(
      /^\/api\/gibs\/tile\/(\d+)\/([^/]+)\/([^/]+)\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.([a-zA-Z0-9]+)$/
    );
    if (m) {
      const [, epsg, layer, time, tms, z, y, x, ext] = m;
      const url = buildGibsTileUrl({ epsg, layer, time, tms, z, y, x, ext });
      const upstream = await fetchWithRetry(url, {});
      const buf = Buffer.from(await upstream.arrayBuffer());
      return bin(
        upstream.status,
        buf,
        upstream.headers.get("content-type") || "image/png",
        withShortCache()
      );
    }
    m = path.match(
      /^\/api\/gibs\/tile\/(\d+)\/([^/]+)\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.([a-zA-Z0-9]+)$/
    );
    if (m) {
      const [, epsg, layer, tms, z, y, x, ext] = m;
      const url = buildGibsTileUrl({ epsg, layer, tms, z, y, x, ext });
      const upstream = await fetchWithRetry(url, {});
      const buf = Buffer.from(await upstream.arrayBuffer());
      return bin(
        upstream.status,
        buf,
        upstream.headers.get("content-type") || "image/png",
        withShortCache()
      );
    }
    m = path.match(
      /^\/api\/gibs\/domains\/(\d+)\/([^/]+)\/([^/]+)\/([^/]+)\.xml$/
    );
    if (m) {
      const [, epsg, layer, tms, range] = m;
      const url = buildGibsDomainsUrl({ epsg, layer, tms, range });
      const upstream = await fetchWithRetry(url, {});
      const body = await upstream.text();
      return text(
        upstream.status,
        body,
        withShortCache({
          "Content-Type": upstream.headers.get("content-type") || "application/xml"
        })
      );
    }
    if (path === "/api/forecast") {
      const params = new URLSearchParams(event.rawQueryString || "");
      const lat = params.get("lat");
      const lon = params.get("lon");
      const units = params.get("units") || "metric";
      const source = params.get("source") || "openmeteo";
      if (!lat || !lon) {
        return json(400, { error: "lat and lon parameters required" });
      }
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      if (isNaN(latNum) || isNaN(lonNum)) {
        return json(400, { error: "invalid lat/lon values" });
      }
      try {
        const tempUnit = units === "imperial" ? "fahrenheit" : "celsius";
        const windUnit = units === "imperial" ? "mph" : "kmh";
        const precipUnit = units === "imperial" ? "inch" : "mm";
        const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latNum}&longitude=${lonNum}&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m,weather_code&hourly=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&precipitation_unit=${precipUnit}&forecast_days=7`;
        const upstream = await fetchWithRetry(omUrl);
        if (!upstream.ok) {
          throw new Error(`Open-Meteo API error: ${upstream.status}`);
        }
        const data = await upstream.json();
        const normalized = {
          current: {
            temp: data.current?.temperature_2m,
            feels_like: data.current?.apparent_temperature,
            humidity: data.current?.relative_humidity_2m,
            pressure: data.current?.pressure_msl,
            wind_speed: data.current?.wind_speed_10m,
            wind_deg: data.current?.wind_direction_10m,
            weather_code: data.current?.weather_code,
            dt: Math.floor(Date.now() / 1e3)
          },
          hourly: data.hourly?.time?.slice(0, 24)?.map((time, i) => ({
            dt: Math.floor(new Date(time).getTime() / 1e3),
            temp: data.hourly?.temperature_2m?.[i],
            weather_code: data.hourly?.weather_code?.[i],
            pop: data.hourly?.precipitation_probability?.[i]
          })),
          daily: data.daily?.time?.slice(0, 7)?.map((time, i) => ({
            dt: Math.floor(new Date(time).getTime() / 1e3),
            temp_min: data.daily?.temperature_2m_min?.[i],
            temp_max: data.daily?.temperature_2m_max?.[i],
            weather_code: data.daily?.weather_code?.[i],
            pop: data.daily?.precipitation_probability_max?.[i]
          }))
        };
        return json(200, normalized, withShortCache());
      } catch (e) {
        console.error("Forecast error:", e);
        return json(503, { error: "forecast service unavailable", detail: String(e) });
      }
    }
    m = path.match(/^\/api\/glm-toe\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const glmBaseUrl = process.env.GLM_TOE_PY_URL;
      if (!glmBaseUrl) {
        return json(404, { error: "GLM TOE not enabled" }, withShortCache());
      }
      const [, z, x, y] = m;
      const url = `${glmBaseUrl.replace(/\/$/, "")}/${z}/${x}/${y}.png${qs}`;
      try {
        const upstream = await fetchWithRetry(url, {}, 2, 8e3);
        const buf = Buffer.from(await upstream.arrayBuffer());
        return bin(
          upstream.status,
          buf,
          upstream.headers.get("content-type") || "image/png",
          withShortCache()
        );
      } catch (e) {
        return json(503, { error: "GLM service unavailable", detail: String(e) });
      }
    }
    m = path.match(/^\/api\/firms\/csv\/(.+)$/);
    if (m) {
      const [, firmsPath] = m;
      const firmsMapKey = await getApiKey("FIRMS_MAP_KEY", "FIRMS_MAP_KEY_SECRET");
      if (!firmsMapKey) {
        return json(503, { error: "FIRMS_MAP_KEY not configured" });
      }
      try {
        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsPath}`;
        const upstream = await fetchWithRetry(url);
        const csvData = await upstream.text();
        return text(
          upstream.status,
          csvData,
          withShortCache({
            "Content-Type": "text/csv"
          })
        );
      } catch (e) {
        return json(503, { error: "FIRMS service unavailable", detail: String(e) });
      }
    }
    m = path.match(/^\/api\/firms\/(wms|wfs)\/([^/]+)$/);
    if (m) {
      const [, mode, dataset] = m;
      const firmsMapKey = await getApiKey("FIRMS_MAP_KEY", "FIRMS_MAP_KEY_SECRET");
      if (!firmsMapKey) {
        return json(503, { error: "FIRMS_MAP_KEY not configured" });
      }
      try {
        const params = new URLSearchParams(event.rawQueryString || "");
        params.set("MAP_KEY", firmsMapKey);
        const url = `https://firms.modaps.eosdis.nasa.gov/${mode}/${dataset}?${params.toString()}`;
        const upstream = await fetchWithRetry(url);
        if (mode === "wms") {
          const buf = Buffer.from(await upstream.arrayBuffer());
          return bin(
            upstream.status,
            buf,
            upstream.headers.get("content-type") || "image/png",
            withMediumCache()
          );
        } else {
          const responseText = await upstream.text();
          return text(
            upstream.status,
            responseText,
            withShortCache({
              "Content-Type": upstream.headers.get("content-type") || "application/xml"
            })
          );
        }
      } catch (e) {
        return json(503, { error: "FIRMS service unavailable", detail: String(e) });
      }
    }
    if (path === "/api/airnow/current") {
      const params = new URLSearchParams(event.rawQueryString || "");
      const lat = params.get("lat");
      const lon = params.get("lon");
      if (!lat || !lon) {
        return json(400, { error: "lat and lon parameters required" });
      }
      const airNowKey = await getApiKey("AIRNOW_API_KEY", "AIRNOW_API_KEY_SECRET");
      if (!airNowKey) {
        return json(503, { error: "AIRNOW_API_KEY not configured" });
      }
      try {
        const apiParams = new URLSearchParams({
          format: "application/json",
          latitude: lat,
          longitude: lon,
          API_KEY: airNowKey
        });
        const url = `https://www.airnowapi.org/aq/observation/latLong/current?${apiParams.toString()}`;
        const upstream = await fetchWithRetry(url);
        const data = await upstream.json();
        return json(upstream.status, data, withShortCache());
      } catch (e) {
        console.error("AirNow error:", e);
        return json(503, { error: "AirNow service unavailable", detail: String(e) });
      }
    }
    if (path.startsWith("/api/openaq/")) {
      const openAqKey = await getApiKey("OPENAQ_API_KEY", "OPENAQ_API_KEY_SECRET");
      if (!openAqKey) {
        return json(503, { error: "OPENAQ_API_KEY not configured" });
      }
      try {
        const apiPath = path.replace("/api/openaq", "");
        const url = `https://api.openaq.org/v3${apiPath}${qs}`;
        const upstream = await fetchWithRetry(url, {
          headers: { "X-API-Key": openAqKey }
        });
        const data = await upstream.json();
        return json(upstream.status, data, withShortCache());
      } catch (e) {
        console.error("OpenAQ error:", e);
        return json(503, { error: "OpenAQ service unavailable", detail: String(e) });
      }
    }
    if (path.startsWith("/api/purpleair/")) {
      const purpleAirKey = await getApiKey("PURPLEAIR_API_KEY", "PURPLEAIR_API_KEY_SECRET");
      if (!purpleAirKey) {
        return json(503, { error: "PURPLEAIR_API_KEY not configured" });
      }
      try {
        const apiPath = path.replace("/api/purpleair", "");
        const url = `https://api.purpleair.com/v1${apiPath}${qs}`;
        const upstream = await fetchWithRetry(url, {
          headers: { "X-API-Key": purpleAirKey }
        });
        const data = await upstream.json();
        return json(upstream.status, data, withShortCache());
      } catch (e) {
        console.error("PurpleAir error:", e);
        return json(503, { error: "PurpleAir service unavailable", detail: String(e) });
      }
    }
    m = path.match(/^\/api\/meteomatics\/(.+)$/);
    if (m) {
      const [, apiPath] = m;
      const meteomaticsUser = await getApiKey("METEOMATICS_USER", "METEOMATICS_USER_SECRET");
      const meteomaticsPassword = await getApiKey("METEOMATICS_PASSWORD", "METEOMATICS_PASSWORD_SECRET");
      if (!meteomaticsUser || !meteomaticsPassword) {
        return json(503, { error: "METEOMATICS credentials not configured" });
      }
      try {
        const auth = Buffer.from(`${meteomaticsUser}:${meteomaticsPassword}`).toString("base64");
        const url = `https://api.meteomatics.com/${apiPath}${qs}`;
        const upstream = await fetchWithRetry(url, {
          headers: { Authorization: `Basic ${auth}` }
        });
        const data = await upstream.json();
        return json(upstream.status, data, withShortCache());
      } catch (e) {
        console.error("Meteomatics error:", e);
        return json(503, { error: "Meteomatics service unavailable", detail: String(e) });
      }
    }
    if (path.startsWith("/api/google/")) {
      const googleCloudKey = await getApiKey("GOOGLE_CLOUD_KEY", "GOOGLE_CLOUD_KEY_SECRET");
      if (!googleCloudKey) {
        return json(503, { error: "GOOGLE_CLOUD_KEY not configured" });
      }
      try {
        const apiPath = path.replace("/api/google", "");
        const url = `https://airquality.googleapis.com/v1${apiPath}?key=${encodeURIComponent(googleCloudKey)}`;
        const upstream = await fetchWithRetry(url, {
          method: event.requestContext?.http?.method || "GET",
          headers: {
            "Content-Type": "application/json"
          },
          body: event.body || void 0
        });
        const data = await upstream.json();
        return json(upstream.status, data, withShortCache());
      } catch (e) {
        console.error("Google Cloud error:", e);
        return json(503, { error: "Google Cloud service unavailable", detail: String(e) });
      }
    }
    if (path.startsWith("/api/")) {
      return json(404, { error: "not found", path });
    }
    return json(400, { error: "bad request" });
  } catch (e) {
    console.error(e);
    return json(500, { error: "proxy error" });
  }
};
export {
  handler
};
