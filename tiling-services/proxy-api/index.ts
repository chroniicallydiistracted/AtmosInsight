import {
  NWS_API_BASE,
  DEFAULT_NWS_USER_AGENT,
  OWM_BASE,
  OWM_ALLOW,
  buildGibsTileUrl,
  buildGibsDomainsUrl,
} from '@atmos/proxy-constants';
import { fetchWithRetry } from '@atmos/fetch-client';
import { providers as sharedProviders } from '@atmos/providers';

// Lightweight Lambda proxy for /api/* endpoints.
// Runtime: nodejs20.x (fetch available)

// Helper to get API keys from Secrets Manager or env vars
async function getApiKey(envVarName: string, secretEnvVar?: string): Promise<string> {
  // For now, use fallback to environment variables
  // TODO: Implement Secrets Manager integration with proper AWS SDK
  const secretName = secretEnvVar ? process.env[secretEnvVar] : null;
  if (secretName) {
    // In production, this would use AWS SDK to fetch from Secrets Manager
    // For now, fallback to env vars
    console.log(`Would fetch secret: ${secretName}`);
  }
  
  return process.env[envVarName] || '';
}

// Load providers manifest (prefer shared package, fallback to embedded subset)
async function getProvidersManifest(): Promise<any[]> {
  try {
    if (Array.isArray(sharedProviders) && sharedProviders.length > 0) {
      return sharedProviders as any[];
    }
  } catch (err) {
    console.warn('Falling back to embedded providers. Reason:', err);
  }
  return getEmbeddedProviders();
}

// Embedded fallback providers (key S3 providers only)
function getEmbeddedProviders(): any[] {
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
  prefixExamples: ["ABI-L2-CMIPC/2025/251/"]
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
  prefixExamples: ["ABI-L2-CMIPC/2025/251/"]
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

interface LambdaEvent {
  rawPath?: string;
  rawQueryString?: string;
  requestContext?: {
    http?: {
      method?: string;
    };
  };
  queryStringParameters?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

interface OwmTileParams {
  layer: string;
  z: string;
  x: string;
  y: string;
  apiKey: string;
}

// RainViewer removed

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// CORS headers for browser requests - configurable based on environment
const getAllowedOrigins = (): string => {
  // In production, use specific origins from environment variable
  if (process.env.NODE_ENV === 'production') {
    return process.env.ALLOWED_ORIGINS || 'https://atmosinsight.app,https://atmosinsight.westfam.media';
  }
  // In development, allow common local development origins
  return process.env.ALLOWED_ORIGINS || 'http://localhost:3002,http://localhost:3000,http://localhost:5173';
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': getAllowedOrigins().split(',')[0], // Use first origin as default
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, Authorization',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers': 'x-cost-note, x-provider-id, cache-control'
};

function buildCorsHeaders(event: LambdaEvent): Record<string, string> {
  const allowed = getAllowedOrigins()
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const reqOrigin = event.headers?.origin || event.headers?.Origin;
  let origin = allowed[0] || '*';
  if (allowed.includes('*')) origin = '*';
  else if (reqOrigin && allowed.includes(reqOrigin)) origin = reqOrigin;

  const requestedHeaders = event.headers?.['access-control-request-headers'] || event.headers?.['Access-Control-Request-Headers'];
  return {
    ...CORS_HEADERS,
    'Access-Control-Allow-Origin': origin,
    ...(requestedHeaders ? { 'Access-Control-Allow-Headers': requestedHeaders } : {}),
    'Vary': 'Origin',
  };
}

function json(
  status: number,
  obj: any,
  extra: Record<string, string> = {}
): LambdaResponse {
  return {
    statusCode: status,
    headers: { ...JSON_HEADERS, ...CORS_HEADERS, ...extra },
    body: JSON.stringify(obj),
  };
}

function text(
  status: number,
  body: string,
  headers: Record<string, string> = {}
): LambdaResponse {
  return {
    statusCode: status,
    headers: { ...CORS_HEADERS, ...headers },
    body,
  };
}

function bin(
  status: number,
  bodyBuf: Buffer,
  contentType: string,
  headers: Record<string, string> = {}
): LambdaResponse {
  return {
    statusCode: status,
    isBase64Encoded: true,
    headers: { 'Content-Type': contentType, ...CORS_HEADERS, ...headers },
    body: Buffer.from(bodyBuf).toString('base64'),
  };
}

// -----------------
// OWM helpers
// -----------------
function buildOwmTileUrl({ layer, z, x, y, apiKey }: OwmTileParams): string {
  return `${OWM_BASE}/${layer}/${z}/${x}/${y}.png?appid=${encodeURIComponent(apiKey)}`;
}

// RainViewer helpers removed

// Util
function withShortCache(
  h: Record<string, string> = {}
): Record<string, string> {
  return { 'Cache-Control': 'public, max-age=60', ...h };
}

function withMediumCache(
  h: Record<string, string> = {}
): Record<string, string> {
  return { 'Cache-Control': 'public, max-age=300', ...h };
}

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const path = event.rawPath || '/';
  const qs = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const method = event.requestContext?.http?.method || 'GET';
  const DYNAMIC_CORS = buildCorsHeaders(event);

  try {
    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: DYNAMIC_CORS,
        body: '',
      };
    }
      // Simple geocoding proxy (Nominatim)
      if (path === '/api/search') {
        const q = new URLSearchParams(qs.slice(1)).get('q') || '';
        const limit = new URLSearchParams(qs.slice(1)).get('limit') || '5';
        if (!q) return json(400, { error: 'missing q' });
        const nominatim = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`;
        try {
          const upstream = await fetchWithRetry(nominatim, {
            headers: {
              'User-Agent': process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT,
              'Accept': 'application/json',
              'Referer': 'https://weather.westfam.media'
            },
          });
          const data = await upstream.json().catch(async () => JSON.parse(await upstream.text()));
          const normalized = Array.isArray(data) ? data.map((r: any) => ({
            display_name: r.display_name,
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
            type: r.type,
            class: r.class
          })) : [];
          return json(200, { results: normalized }, withShortCache());
        } catch (e) {
          return json(503, { error: 'geocoding failed', detail: String(e) });
        }
      }


    // Health check
    if (path === '/api/health') {
      if (method === 'HEAD') {
        return { statusCode: 200, headers: DYNAMIC_CORS, body: '' };
      }
      return {
        statusCode: 200,
        headers: { ...JSON_HEADERS, ...DYNAMIC_CORS, ...withShortCache() },
        body: JSON.stringify({
          status: 'ok',
          service: 'weather-proxy-api',
          time: new Date().toISOString(),
          features: {
            gibs: process.env.GIBS_ENABLED === 'true',
          },
        }),
      };
    }
    // Catalog forwarder (keep a single API origin)
    if (path.startsWith('/api/catalog/')) {
      const base = (process.env.CATALOG_API_BASE || '').replace(/\/$/, '');
      if (!base) return json(503, { error: 'CATALOG_API_BASE not configured' });
      const target = `${base}${path.replace('/api', '')}${qs}`;
      const upstream = await fetchWithRetry(target, {});
      const body = await upstream.text();
      return text(
        upstream.status,
        body,
        withShortCache({
          'Content-Type':
            upstream.headers.get('content-type') || 'application/json',
        })
      );
    }

    // S3 Providers endpoint
    if (path === '/api/providers') {
      try {
        const providers = await getProvidersManifest();
        return json(200, { providers }, withShortCache());
      } catch (error) {
        return json(503, { error: 'Failed to load providers manifest', detail: String(error) });
      }
    }

    // S3 Provider list endpoint: /api/s3/:provider/list (check this BEFORE general object access)
    let listMatch = path.match(/^\/api\/s3\/([^/]+)\/list$/);
    if (listMatch) {
      const [, providerId] = listMatch;
      const prefix = new URLSearchParams(qs.slice(1)).get('prefix') || '';
      const maxKeys = parseInt(new URLSearchParams(qs.slice(1)).get('max-keys') || '1000', 10);
      
      try {
        const providers = await getProvidersManifest();
        const provider = providers.find((p: any) => p.id === providerId && p.access === 's3');
        
        if (!provider) {
          return json(404, { error: `S3 provider '${providerId}' not found` });
        }

        const { bucket, region, requesterPays } = provider.s3;
        
        // Build S3 list URL
        const s3Url = region === 'us-east-1' 
          ? `https://${bucket}.s3.amazonaws.com/`
          : `https://${bucket}.s3.${region}.amazonaws.com/`;

        const listParams = new URLSearchParams({
          'list-type': '2',
          prefix,
          'max-keys': maxKeys.toString()
        });

        const continuationToken = new URLSearchParams(qs.slice(1)).get('continuation-token');
        if (continuationToken) {
          listParams.set('continuation-token', continuationToken);
        }

        // Prepare headers
        const headers: Record<string, string> = {};
        if (requesterPays) {
          headers['x-amz-request-payer'] = 'requester';
        }

        // Fetch list from S3
        const upstream = await fetchWithRetry(`${s3Url}?${listParams.toString()}`, { headers });
        const xmlBody = await upstream.text();
        
        return text(
          upstream.status,
          xmlBody,
          withShortCache({
            'Content-Type': 'application/xml',
            'x-cost-note': provider.costNote,
            'x-provider-id': providerId,
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

    // S3 Provider object access: /api/s3/:provider/* (check AFTER list endpoint)
    let s3Match = path.match(/^\/api\/s3\/([^/]+)\/(.+)$/);
    if (s3Match) {
      const [, providerId, objectKey] = s3Match;
      try {
        const providers = await getProvidersManifest();
        const provider = providers.find((p: any) => p.id === providerId && p.access === 's3');
        
        if (!provider) {
          return json(404, { error: `S3 provider '${providerId}' not found` });
        }

        const { bucket, region, requesterPays } = provider.s3;
        
        // Build S3 URL
        const s3Url = region === 'us-east-1' 
          ? `https://${bucket}.s3.amazonaws.com/${objectKey}`
          : `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;

        // Prepare headers
        const headers: Record<string, string> = {};
        if (requesterPays) {
          headers['x-amz-request-payer'] = 'requester';
        }

        // Fetch from S3
        const upstream = await fetchWithRetry(s3Url, { headers });
        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        
        if (contentType.startsWith('image/') || contentType.startsWith('application/')) {
          const buf = Buffer.from(await upstream.arrayBuffer());
          return bin(
            upstream.status,
            buf,
            contentType,
            withMediumCache({
              'x-cost-note': provider.costNote,
              'x-provider-id': providerId,
            })
          );
        } else {
          const body = await upstream.text();
          return text(
            upstream.status,
            body,
            withMediumCache({
              'Content-Type': contentType,
              'x-cost-note': provider.costNote,
              'x-provider-id': providerId,
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

    // Health
    if (path === '/api/healthz') {
      return text(200, 'ok', { 'Content-Type': 'text/plain' });
    }

    // NWS Alerts
    if (path.startsWith('/api/nws/alerts')) {
      const userAgent = process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT;
      const url = 'https://api.weather.gov' + path.replace('/api/nws', '') + qs;
      const upstream = await fetchWithRetry(url, {
        headers: { 'User-Agent': userAgent, Accept: 'application/geo+json' },
      });
      const textBody = await upstream.text();
      return {
        statusCode: upstream.status,
        headers: withShortCache({
          'Content-Type':
            upstream.headers.get('content-type') || 'application/geo+json',
        }),
        body: textBody,
      };
    }

    // OWM tiles
    let m = path.match(/^\/api\/owm\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const [, layer, z, x, y] = m;
      if (!OWM_ALLOW.has(layer))
        return json(400, { error: 'unknown or blocked layer' });
      const apiKey = await getApiKey('OPENWEATHER_API_KEY', 'OPENWEATHER_API_KEY_SECRET');
      if (!apiKey)
        return json(503, { error: 'OPENWEATHER_API_KEY not configured' });
      const url = buildOwmTileUrl({ layer, z, x, y, apiKey });
      const upstream = await fetchWithRetry(url, {});
      const buf = Buffer.from(await upstream.arrayBuffer());
      return bin(
        upstream.status,
        buf,
        upstream.headers.get('content-type') || 'image/png',
        withShortCache()
      );
    }

    // OpenStreetMap CyclOSM tiles (fallback across a/b/c)
    m = path.match(/^\/api\/osm\/cyclosm\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const [, z, x, y] = m;
      const servers = ['a', 'b', 'c'];
      let lastError: unknown = null;
      for (const s of servers) {
        try {
          const url = `https://${s}.tile.openstreetmap.fr/cyclosm/${z}/${x}/${y}.png`;
          const upstream = await fetchWithRetry(url, {
            headers: {
              'User-Agent': process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT,
              'Referer': 'https://weather.westfam.media',
              Accept: 'image/png,image/*,*/*',
            },
          }, 2, 10000); // Retry 2 times with 10s timeout
          if (upstream.ok) {
            const buf = Buffer.from(await upstream.arrayBuffer());
            return bin(
              200,
              buf,
              upstream.headers.get('content-type') || 'image/png',
              withMediumCache()
            );
          }
        } catch (e) {
          lastError = e;
          continue;
        }
      }
      return json(503, { error: 'OpenStreetMap tile servers unavailable', detail: String(lastError ?? '') });
    }

    // Carto basemap tiles (reliable alternative)
    m = path.match(/^\/api\/basemap\/carto\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const [, style, z, x, y] = m;
      // Carto provides free basemap tiles
      const validStyles = ['light_all', 'dark_all', 'voyager', 'positron'];
      const mapStyle = validStyles.includes(style) ? style : 'light_all';
      const servers = ['a', 'b', 'c', 'd'];
      const server = servers[parseInt(x) % servers.length];
      
      try {
        const url = `https://${server}.basemaps.cartocdn.com/${mapStyle}/${z}/${x}/${y}.png`;
        const upstream = await fetchWithRetry(url, {
          headers: {
            'User-Agent': process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT,
            Accept: 'image/png,image/*,*/*',
          },
        });
        if (upstream.ok) {
          const buf = Buffer.from(await upstream.arrayBuffer());
          return bin(
            upstream.status,
            buf,
            upstream.headers.get('content-type') || 'image/png',
            withMediumCache()
          );
        }
        return json(upstream.status, { error: 'Carto basemap unavailable' });
      } catch (e) {
        return json(503, { error: 'Carto service unavailable', detail: String(e) });
      }
    }

    // OpenStreetMap standard tiles (with proper headers)
    m = path.match(/^\/api\/basemap\/osm\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const [, z, x, y] = m;
      const servers = ['a', 'b', 'c'];
      let lastError: unknown = null;
      
      for (const s of servers) {
        try {
          const url = `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
          const upstream = await fetchWithRetry(url, {
            headers: {
              'User-Agent': `AtmosInsight/1.0 (${process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT})`,
              Accept: 'image/png,image/*,*/*',
              'Referer': 'https://weather.westfam.media',
            },
          });
          if (upstream.ok) {
            const buf = Buffer.from(await upstream.arrayBuffer());
            return bin(
              200,
              buf,
              upstream.headers.get('content-type') || 'image/png',
              withMediumCache()
            );
          }
        } catch (e) {
          lastError = e;
          continue;
        }
      }
      // Server-side fallback to Carto if OSM is unavailable
      try {
        const cartoServers = ['a', 'b', 'c', 'd'];
        const cs = cartoServers[parseInt(x) % cartoServers.length];
        const cartoUrl = `https://${cs}.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`;
        const upstream = await fetchWithRetry(cartoUrl, {
          headers: {
            'User-Agent': process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT,
            Accept: 'image/png,image/*,*/*',
          },
        });
        if (upstream.ok) {
          const buf = Buffer.from(await upstream.arrayBuffer());
          return bin(
            200,
            buf,
            upstream.headers.get('content-type') || 'image/png',
            withMediumCache({ 'x-basemap-fallback': 'carto' })
          );
        }
      } catch (e2) {
        lastError = `${String(lastError ?? '')} | carto:${String(e2)}`;
      }
      return json(503, { error: 'OSM standard tile servers unavailable', detail: String(lastError ?? '') });
    }

    // Tracestrack tiles
    m = path.match(/^\/api\/tracestrack\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.webp$/);
    if (m) {
      const [, style, z, x, y] = m;
      const apiKey = await getApiKey('TRACESTRACK_API_KEY', 'TRACESTRACK_API_KEY_SECRET');
      if (!apiKey) return json(503, { error: 'TRACESTRACK_API_KEY not configured' });
      
      // Don't add extra style parameters - just use the URL path style directly
      const url = `https://tile.tracestrack.com/${style}/${z}/${x}/${y}.webp?key=${encodeURIComponent(apiKey)}`;
      const upstream = await fetchWithRetry(url, {});
      const buf = Buffer.from(await upstream.arrayBuffer());
      return bin(
        upstream.status,
        buf,
        upstream.headers.get('content-type') || 'image/webp',
        withMediumCache()
      );
    }

  // RainViewer endpoints removed

    // GIBS redirect helper
    if (path === '/api/gibs/redirect') {
      const params = new URLSearchParams(event.rawQueryString || '');
      const layer = params.get('layer');
      const epsg = params.get('epsg');
      const time = params.get('time') || undefined;
      const tms = params.get('tms');
      const z = params.get('z');
      const y = params.get('y');
      const x = params.get('x');
      const ext = params.get('ext') || 'png';
      if (!layer || !epsg || !tms || !z || !y || !x)
        return json(400, { error: 'missing params' });
      const url = buildGibsTileUrl({ epsg, layer, time, tms, z, y, x, ext });
      if (!url.startsWith('https://gibs.earthdata.nasa.gov/'))
        return json(400, { error: 'invalid redirect' });
      return {
        statusCode: 302,
        headers: { Location: url, ...withShortCache() },
        body: '',
      };
    }

    // GIBS tile (with time)
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
        upstream.headers.get('content-type') || 'image/png',
        withShortCache()
      );
    }

    // GIBS tile (no time)
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
        upstream.headers.get('content-type') || 'image/png',
        withShortCache()
      );
    }

    // GIBS DescribeDomains
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
          'Content-Type':
            upstream.headers.get('content-type') || 'application/xml',
        })
      );
    }

    // Weather forecast endpoint
    if (path === '/api/forecast') {
      const params = new URLSearchParams(event.rawQueryString || '');
      const lat = params.get('lat');
      const lon = params.get('lon');
      const units = params.get('units') || 'metric';
      const source = params.get('source') || 'openmeteo';
      
      if (!lat || !lon) {
        return json(400, { error: 'lat and lon parameters required' });
      }

      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      if (isNaN(latNum) || isNaN(lonNum)) {
        return json(400, { error: 'invalid lat/lon values' });
      }

      try {
        // Default to Open-Meteo (no API key required)
        const tempUnit = units === 'imperial' ? 'fahrenheit' : 'celsius';
        const windUnit = units === 'imperial' ? 'mph' : 'kmh';
        const precipUnit = units === 'imperial' ? 'inch' : 'mm';
        
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
            dt: Math.floor(Date.now() / 1000),
          },
          hourly: data.hourly?.time?.slice(0, 24)?.map((time: string, i: number) => ({
            dt: Math.floor(new Date(time).getTime() / 1000),
            temp: data.hourly?.temperature_2m?.[i],
            weather_code: data.hourly?.weather_code?.[i],
            pop: data.hourly?.precipitation_probability?.[i],
          })),
          daily: data.daily?.time?.slice(0, 7)?.map((time: string, i: number) => ({
            dt: Math.floor(new Date(time).getTime() / 1000),
            temp_min: data.daily?.temperature_2m_min?.[i],
            temp_max: data.daily?.temperature_2m_max?.[i],
            weather_code: data.daily?.weather_code?.[i],
            pop: data.daily?.precipitation_probability_max?.[i],
          })),
        };
        
        return json(200, normalized, withShortCache());
      } catch (e) {
        console.error('Forecast error:', e);
        return json(503, { error: 'forecast service unavailable', detail: String(e) });
      }
    }

    // GLM TOE tiles (if service is configured)
    m = path.match(/^\/api\/glm-toe\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const glmBaseUrl = process.env.GLM_TOE_PY_URL;
      if (!glmBaseUrl) {
  // Return 404 when GLM is not enabled to reduce error noise in monitors
  return json(404, { error: 'GLM TOE not enabled' }, withShortCache());
      }
      const [, z, x, y] = m;
      const url = `${glmBaseUrl.replace(/\/$/, '')}/${z}/${x}/${y}.png${qs}`;
      try {
        const upstream = await fetchWithRetry(url, {}, 2, 8000);
        const buf = Buffer.from(await upstream.arrayBuffer());
        return bin(
          upstream.status,
          buf,
          upstream.headers.get('content-type') || 'image/png',
          withShortCache()
        );
      } catch (e) {
        return json(503, { error: 'GLM service unavailable', detail: String(e) });
      }
    }

    // NASA FIRMS (Fire Information for Resource Management System)
    // CSV data: /api/firms/csv/{path}
    m = path.match(/^\/api\/firms\/csv\/(.+)$/);
    if (m) {
      const [, firmsPath] = m;
      const firmsMapKey = await getApiKey('FIRMS_MAP_KEY', 'FIRMS_MAP_KEY_SECRET');
      if (!firmsMapKey) {
        return json(503, { error: 'FIRMS_MAP_KEY not configured' });
      }
      
      try {
        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsPath}`;
        const upstream = await fetchWithRetry(url);
        const csvData = await upstream.text();
        return text(
          upstream.status,
          csvData,
          withShortCache({
            'Content-Type': 'text/csv',
          })
        );
      } catch (e) {
        return json(503, { error: 'FIRMS service unavailable', detail: String(e) });
      }
    }

    // NASA FIRMS WMS/WFS tiles: /api/firms/{mode}/{dataset}
    m = path.match(/^\/api\/firms\/(wms|wfs)\/([^/]+)$/);
    if (m) {
      const [, mode, dataset] = m;
      const firmsMapKey = await getApiKey('FIRMS_MAP_KEY', 'FIRMS_MAP_KEY_SECRET');
      if (!firmsMapKey) {
        return json(503, { error: 'FIRMS_MAP_KEY not configured' });
      }
      
      try {
        const params = new URLSearchParams(event.rawQueryString || '');
        params.set('MAP_KEY', firmsMapKey);
        const url = `https://firms.modaps.eosdis.nasa.gov/${mode}/${dataset}?${params.toString()}`;
        const upstream = await fetchWithRetry(url);
        
        if (mode === 'wms') {
          // Return image data for WMS requests
          const buf = Buffer.from(await upstream.arrayBuffer());
          return bin(
            upstream.status,
            buf,
            upstream.headers.get('content-type') || 'image/png',
            withMediumCache()
          );
        } else {
          // Return JSON/XML data for WFS requests
          const responseText = await upstream.text();
          return text(
            upstream.status,
            responseText,
            withShortCache({
              'Content-Type': upstream.headers.get('content-type') || 'application/xml',
            })
          );
        }
      } catch (e) {
        return json(503, { error: 'FIRMS service unavailable', detail: String(e) });
      }
    }

    // AirNow air quality by coordinates: /api/airnow/current?lat={lat}&lon={lon}
    if (path === '/api/airnow/current') {
      const params = new URLSearchParams(event.rawQueryString || '');
      const lat = params.get('lat');
      const lon = params.get('lon');
      
      if (!lat || !lon) {
        return json(400, { error: 'lat and lon parameters required' });
      }
      
      const airNowKey = await getApiKey('AIRNOW_API_KEY', 'AIRNOW_API_KEY_SECRET');
      if (!airNowKey) {
        return json(503, { error: 'AIRNOW_API_KEY not configured' });
      }
      
      try {
        const apiParams = new URLSearchParams({
          format: 'application/json',
          latitude: lat,
          longitude: lon,
          API_KEY: airNowKey,
        });
        const url = `https://www.airnowapi.org/aq/observation/latLong/current?${apiParams.toString()}`;
        const upstream = await fetchWithRetry(url);
        const data = await upstream.json();
        return json(upstream.status, data, withShortCache());
      } catch (e) {
        console.error('AirNow error:', e);
        return json(503, { error: 'AirNow service unavailable', detail: String(e) });
      }
    }

    // OpenAQ air quality data: /api/openaq/measurements
    if (path.startsWith('/api/openaq/')) {
      const openAqKey = await getApiKey('OPENAQ_API_KEY', 'OPENAQ_API_KEY_SECRET');
      if (!openAqKey) {
        return json(503, { error: 'OPENAQ_API_KEY not configured' });
      }
      
      try {
        const apiPath = path.replace('/api/openaq', '');
        const url = `https://api.openaq.org/v3${apiPath}${qs}`;
        const upstream = await fetchWithRetry(url, {
          headers: { 'X-API-Key': openAqKey }
        });
        const data = await upstream.json();
        return json(upstream.status, data, withShortCache());
      } catch (e) {
        console.error('OpenAQ error:', e);
        return json(503, { error: 'OpenAQ service unavailable', detail: String(e) });
      }
    }

    // PurpleAir air quality sensors: /api/purpleair/sensors
    if (path.startsWith('/api/purpleair/')) {
      const purpleAirKey = await getApiKey('PURPLEAIR_API_KEY', 'PURPLEAIR_API_KEY_SECRET');
      if (!purpleAirKey) {
        return json(503, { error: 'PURPLEAIR_API_KEY not configured' });
      }
      
      try {
        const apiPath = path.replace('/api/purpleair', '');
        const url = `https://api.purpleair.com/v1${apiPath}${qs}`;
        const upstream = await fetchWithRetry(url, {
          headers: { 'X-API-Key': purpleAirKey }
        });
        const data = await upstream.json();
        return json(upstream.status, data, withShortCache());
      } catch (e) {
        console.error('PurpleAir error:', e);
        return json(503, { error: 'PurpleAir service unavailable', detail: String(e) });
      }
    }

    // Meteomatics weather data: /api/meteomatics/{datetime}/{parameters}/{lat},{lon}/{format}
    m = path.match(/^\/api\/meteomatics\/(.+)$/);
    if (m) {
      const [, apiPath] = m;
      const meteomaticsUser = await getApiKey('METEOMATICS_USER', 'METEOMATICS_USER_SECRET');
      const meteomaticsPassword = await getApiKey('METEOMATICS_PASSWORD', 'METEOMATICS_PASSWORD_SECRET');
      
      if (!meteomaticsUser || !meteomaticsPassword) {
        return json(503, { error: 'METEOMATICS credentials not configured' });
      }
      
      try {
        const auth = Buffer.from(`${meteomaticsUser}:${meteomaticsPassword}`).toString('base64');
        const url = `https://api.meteomatics.com/${apiPath}${qs}`;
        const upstream = await fetchWithRetry(url, {
          headers: { Authorization: `Basic ${auth}` }
        });
        const data = await upstream.json();
        return json(upstream.status, data, withShortCache());
      } catch (e) {
        console.error('Meteomatics error:', e);
        return json(503, { error: 'Meteomatics service unavailable', detail: String(e) });
      }
    }

    // Google Cloud air quality: /api/google/air-quality
    if (path.startsWith('/api/google/')) {
      const googleCloudKey = await getApiKey('GOOGLE_CLOUD_KEY', 'GOOGLE_CLOUD_KEY_SECRET');
      if (!googleCloudKey) {
        return json(503, { error: 'GOOGLE_CLOUD_KEY not configured' });
      }
      
      try {
        const apiPath = path.replace('/api/google', '');
        // Example endpoint for Air Quality API
        const url = `https://airquality.googleapis.com/v1${apiPath}?key=${encodeURIComponent(googleCloudKey)}`;
        const upstream = await fetchWithRetry(url, {
          method: event.requestContext?.http?.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: event.body || undefined,
        });
        const data = await upstream.json();
        return json(upstream.status, data, withShortCache());
      } catch (e) {
        console.error('Google Cloud error:', e);
        return json(503, { error: 'Google Cloud service unavailable', detail: String(e) });
      }
    }

    // Fallback
    if (path.startsWith('/api/')) {
      return json(404, { error: 'not found', path });
    }

    // Non-API traffic should not hit this Lambda
    return json(400, { error: 'bad request' });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'proxy error' });
  }
};
