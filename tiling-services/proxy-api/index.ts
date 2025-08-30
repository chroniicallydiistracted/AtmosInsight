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

function json(
  status: number,
  obj: any,
  extra: Record<string, string> = {}
): LambdaResponse {
  return {
    statusCode: status,
    headers: { ...JSON_HEADERS, ...extra },
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
    headers,
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
    headers: { 'Content-Type': contentType, ...headers },
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

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const path = event.rawPath || '/';
  const qs = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const method = event.requestContext?.http?.method || 'GET';

  try {
    // Health
    if (path === '/api/healthz') {
      return text(200, 'ok', { 'Content-Type': 'text/plain' });
    }

    // NWS Alerts
    if (path.startsWith('/api/nws/alerts')) {
      const userAgent = process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT;
      const url = NWS_API_BASE + path.replace('/api/nws/alerts', '') + qs;
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
      const apiKey = process.env.OWM_API_KEY;
      if (!apiKey) return json(503, { error: 'OWM_API_KEY not configured' });
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

    // GLM TOE tile (proxy to Python microservice if configured)
    m = path.match(/^\/api\/glm-toe\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const [, z, x, y] = m;
      const proxy = process.env.GLM_TOE_PY_URL;
      if (!proxy) return json(503, { error: 'GLM TOE disabled' });
      const url = `${proxy.replace(/\/$/, '')}/tiles/${z}/${x}/${y}.png`;
      const upstream = await fetchWithRetry(url, {});
      const buf = Buffer.from(await upstream.arrayBuffer());
      return bin(
        upstream.status,
        buf,
        upstream.headers.get('content-type') || 'image/png',
        withShortCache()
      );
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
