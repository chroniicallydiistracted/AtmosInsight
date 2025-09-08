import {
  NWS_API_BASE,
  DEFAULT_NWS_USER_AGENT,
  OWM_BASE,
  OWM_ALLOW,
  buildGibsTileUrl,
  buildGibsDomainsUrl,
} from '@atmos/proxy-constants';
import { fetchWithRetry } from '@atmos/fetch-client';

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

interface RainviewerTileParams {
  index: any;
  ts: string;
  size: string;
  z: string;
  x: string;
  y: string;
  color: string;
  options: string;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// CORS headers for browser requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400'
};

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

// -----------------
// RainViewer helpers
// -----------------
let rvCache: any = null;
let rvAt = 0;
const RV_TTL = 60_000;

async function getRainviewerIndex(): Promise<any> {
  const now = Date.now();
  if (rvCache && now - rvAt < RV_TTL) return rvCache;
  const res = await fetchWithRetry(
    'https://api.rainviewer.com/public/weather-maps.json'
  );
  if (!res.ok) throw new Error(`rainviewer index ${res.status}`);
  rvCache = await res.json();
  rvAt = now;
  return rvCache;
}

function buildRainviewerTileUrl({
  index,
  ts,
  size,
  z,
  x,
  y,
  color,
  options,
}: RainviewerTileParams): string | null {
  const sizeVal = size === '512' ? '512' : '256';
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return null;
  const frames = [
    ...(index?.radar?.past || []),
    ...(index?.radar?.nowcast || []),
  ];
  if (!frames.length) return null;
  let match = frames.find((f: any) => f.time === tsNum);
  if (!match) {
    const pastOrEqual = frames
      .filter((f: any) => f.time <= tsNum)
      .sort((a: any, b: any) => b.time - a.time);
    match =
      pastOrEqual[0] || frames.sort((a: any, b: any) => b.time - a.time)[0];
  }
  if (!match) return null;
  return `${index.host}${match.path}/${sizeVal}/${z}/${x}/${y}/${color}/${options}.png`;
}

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

  try {
    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: '',
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
              Accept: 'image/png,image/*,*/*',
            },
            signal: AbortSignal.timeout(5000),
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
      return json(503, { error: 'OpenStreetMap tile servers unavailable', detail: String(lastError ?? '') });
    }

    // Tracestrack tiles
    m = path.match(/^\/api\/tracestrack\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.webp$/);
    if (m) {
      const [, style, z, x, y] = m;
      const apiKey = await getApiKey('TRACESTRACK_API_KEY', 'TRACESTRACK_API_KEY_SECRET');
      if (!apiKey) return json(503, { error: 'TRACESTRACK_API_KEY not configured' });
      const params = new URLSearchParams(event.rawQueryString || '');
      const styleParam = params.get('style');
      const extra = styleParam ? `&style=${encodeURIComponent(styleParam)}` : '';
      const url = `https://tile.tracestrack.com/${style}/${z}/${x}/${y}.webp?key=${encodeURIComponent(apiKey)}${extra}`;
      const upstream = await fetchWithRetry(url, {});
      const buf = Buffer.from(await upstream.arrayBuffer());
      return bin(
        upstream.status,
        buf,
        upstream.headers.get('content-type') || 'image/webp',
        withMediumCache()
      );
    }

    // RainViewer index
    if (path === '/api/rainviewer/index.json') {
      const idx = await getRainviewerIndex();
      return json(200, idx, withShortCache());
    }

    // RainViewer tile
    m = path.match(
      /^\/api\/rainviewer\/(\d+)\/(256|512)\/(\d+)\/(\d+)\/(\d+)\/([^/]+)\/([^/]+)\.png$/
    );
    if (m) {
      const [, ts, size, z, x, y, color, options] = m;
      const idx = await getRainviewerIndex();
      const url = buildRainviewerTileUrl({
        index: idx,
        ts,
        size,
        z,
        x,
        y,
        color,
        options,
      });
      if (!url) return json(404, { error: 'frame not found' });
      const upstream = await fetchWithRetry(url, {});
      const buf = Buffer.from(await upstream.arrayBuffer());
      return bin(
        upstream.status,
        buf,
        upstream.headers.get('content-type') || 'image/png',
        withShortCache()
      );
    }

    // RainViewer tile (latest frame) variant: /api/rainviewer/:z/:x/:y/:size/:color/:options.png
    m = path.match(
      /^\/api\/rainviewer\/(\d+)\/(\d+)\/(\d+)\/(256|512)\/([^/]+)\/([^/]+)\.png$/
    );
    if (m) {
      const [, z, x, y, size, color, options] = m;
      const idx = await getRainviewerIndex();
      // choose the most recent frame
      const frames = [
        ...(idx?.radar?.past || []),
        ...(idx?.radar?.nowcast || []),
      ].sort((a: any, b: any) => b.time - a.time);
      const ts = frames[0]?.time;
      if (!ts) return json(404, { error: 'no frames' });
      const url = buildRainviewerTileUrl({
        index: idx,
        ts: String(ts),
        size,
        z,
        x,
        y,
        color,
        options,
      });
      if (!url) return json(404, { error: 'frame not found' });
      const upstream = await fetchWithRetry(url, {});
      const buf = Buffer.from(await upstream.arrayBuffer());
      return bin(
        upstream.status,
        buf,
        upstream.headers.get('content-type') || 'image/png',
        withShortCache()
      );
    }

    // RainViewer tile (minimal variant): /api/rainviewer/:z/:x/:y.png (defaults size=256,color=0,options=1_0)
    m = path.match(/^\/api\/rainviewer\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const [, z, x, y] = m;
      const idx = await getRainviewerIndex();
      const frames = [
        ...(idx?.radar?.past || []),
        ...(idx?.radar?.nowcast || []),
      ].sort((a: any, b: any) => b.time - a.time);
      const ts = frames[0]?.time;
      if (!ts) return json(404, { error: 'no frames' });
      const url = buildRainviewerTileUrl({
        index: idx,
        ts: String(ts),
        size: '256',
        z,
        x,
        y,
        color: '0',
        options: '1_0',
      });
      if (!url) return json(404, { error: 'frame not found' });
      const upstream = await fetchWithRetry(url, {});
      const buf = Buffer.from(await upstream.arrayBuffer());
      return bin(
        upstream.status,
        buf,
        upstream.headers.get('content-type') || 'image/png',
        withShortCache()
      );
    }

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
        return json(503, { error: 'GLM_TOE_PY_URL not configured' });
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
