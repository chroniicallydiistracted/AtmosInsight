import express from 'express';
import cors from 'cors';
import { setDefaultResultOrder } from 'node:dns';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { NWS_API_BASE, DEFAULT_NWS_USER_AGENT } from '@atmos/proxy-constants';
import { PORTS, createErrorResponse, createSuccessResponse, createHealthCheckEndpoint, HTTP_STATUS, HEADERS } from '@atmos/shared-utils';
import { fetchWithRetry } from '@atmos/fetch-client';
import { shortLived60 } from './cache.js';
import { buildGibsTileUrl, buildGibsDomainsUrl } from './gibs.js';
import { buildOwmTileUrl, isAllowedOwmLayer } from './owm.js';
import { getRainviewerIndex, buildRainviewerTileUrl } from './rainviewer.js';
import { GlmToeAggregator } from './services/glm-toe/ingest.js';
import { renderTilePng } from './services/glm-toe/tiles.js';

// Set up DNS order and proxy if configured
setDefaultResultOrder('ipv4first');
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxy) {
  setGlobalDispatcher(new ProxyAgent(proxy));
}

// Create Express app with middleware
const app = express();
app.use(cors());

// Add health check endpoint
app.get('/api/healthz', createHealthCheckEndpoint('proxy-server'));

// Add web app proxy
app.get('/', async (req, res) => {
  const targetUrl = `http://localhost:3001${req.originalUrl}`;
  try {
    const upstream = await fetchWithRetry(targetUrl, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.body,
    });

    const body = await upstream.text();
    res.status(upstream.status);

    // Copy headers, excluding certain ones
    upstream.headers.forEach((value: string, key: string) => {
      const k = key.toLowerCase();
      if (
        k === 'content-encoding' ||
        k === 'content-length' ||
        k === 'transfer-encoding' ||
        k === 'cache-control'
      ) {
        return;
      }
      res.setHeader(key, value);
    });

    res.send(body);
  } catch (err) {
    console.error('Web app proxy error:', err);
    res.status(HTTP_STATUS.BAD_GATEWAY).json(createErrorResponse(
      HTTP_STATUS.BAD_GATEWAY,
      'Proxy error',
      { originalError: err instanceof Error ? err.message : String(err) }
    ));
  }
});

// Proxy static asset requests
app.use(/^\/_next\/.*/, async (req, res) => {
  const targetUrl = `http://localhost:3001${req.originalUrl}`;
  try {
    const upstream = await fetchWithRetry(targetUrl, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.body,
    });

    const body = await upstream.arrayBuffer();
    const buffer = Buffer.from(body);

    res.status(upstream.status);

    // Copy content type
    upstream.headers.forEach((value: string, key: string) => {
      if (key.toLowerCase() === 'content-type') {
        res.setHeader(key, value);
      }
    });

    res.send(buffer);
  } catch (err) {
    console.error('Static asset proxy error:', err);
    res.status(HTTP_STATUS.BAD_GATEWAY).json(createErrorResponse(
      HTTP_STATUS.BAD_GATEWAY,
      'Proxy error',
      { originalError: err instanceof Error ? err.message : String(err) }
    ));
  }
});

// Add catalog API proxy
app.use('/api/catalog', async (req, res) => {
  const targetUrl = `http://localhost:${PORTS.CATALOG}${req.originalUrl.replace('/api', '')}`;
  try {
    const upstream = await fetchWithRetry(targetUrl, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.body,
    });

    const body = await upstream.text();
    res.status(upstream.status);

    // Copy headers, excluding certain ones
    upstream.headers.forEach((value: string, key: string) => {
      const k = key.toLowerCase();
      if (
        k === 'content-encoding' ||
        k === 'content-length' ||
        k === 'transfer-encoding' ||
        k === 'cache-control'
      ) {
        return;
      }
      res.setHeader(key, value);
    });

    res.send(body);
  } catch (err) {
    console.error('Catalog API proxy error:', err);
    res.status(HTTP_STATUS.BAD_GATEWAY).json(createErrorResponse(
      HTTP_STATUS.BAD_GATEWAY,
      'Proxy error',
      { originalError: err instanceof Error ? err.message : String(err) }
    ));
  }
});

// NWS Alerts endpoint with caching
app.use('/api/nws/alerts', shortLived60, async (req, res) => {
  const userAgent = process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT;
  const targetUrl = NWS_API_BASE + req.originalUrl.replace(/^\/api\/nws\/alerts/, '');
  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    Accept: 'application/geo+json',
  };

  try {
    const upstream = await fetchWithRetry(targetUrl, { headers });
    const body = await upstream.text();

    res.status(upstream.status);

    // Copy headers, excluding certain ones
    upstream.headers.forEach((value: string, key: string) => {
      const k = key.toLowerCase();
      if (
        k === 'content-encoding' ||
        k === 'content-length' ||
        k === 'transfer-encoding' ||
        k === 'cache-control'
      ) {
        return;
      }
      res.setHeader(key, value);
    });

    res.send(body);
  } catch (err) {
    console.error('NWS alerts proxy error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Proxy error',
      { originalError: err instanceof Error ? err.message : String(err) }
    ));
  }
});

// -----------------
// OpenStreetMap CyclOSM Tiles
// -----------------
app.get('/api/osm/cyclosm/:z/:x/:y.png', shortLived60, async (req, res) => {
  try {
    const { z, x, y } = req.params as Record<string, string>;

    // Use multiple tile servers for redundancy
    const tileServers = ['a', 'b', 'c'];

    // Try each server until one works
    for (const server of tileServers) {
      try {
        const targetUrl = `https://${server}.tile.openstreetmap.fr/cyclosm/${z}/${x}/${y}.png`;

        console.log(`Trying OpenStreetMap tile from ${server}: ${targetUrl}`);

        const upstream = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'AtmosInsight/1.0 (https://github.com/your-repo)',
            Accept: 'image/png,image/*,*/*',
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (upstream.ok) {
          const buffer = Buffer.from(await upstream.arrayBuffer());
          res.status(HTTP_STATUS.OK);
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes for basemap tiles
          return res.send(buffer);
        }
      } catch (serverErr) {
        console.warn(
          `Server ${server} failed for tile ${z}/${x}/${y}:`,
          serverErr
        );
        continue; // Try next server
      }
    }

    // All servers failed, return a fallback tile or error
    console.error(`All OpenStreetMap servers failed for tile ${z}/${x}/${y}`);
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(createErrorResponse(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      'OpenStreetMap tile servers temporarily unavailable'
    ));
  } catch (err) {
    console.error('OpenStreetMap tile proxy error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Proxy error',
      { originalError: err instanceof Error ? err.message : String(err) }
    ));
  }
});

// -----------------
// OpenWeatherMap
// -----------------
app.get('/api/owm/:layer/:z/:x/:y.png', shortLived60, async (req, res) => {
  try {
    const { layer, z, x, y } = req.params as Record<string, string>;

    if (!isAllowedOwmLayer(layer)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(createErrorResponse(
        HTTP_STATUS.BAD_REQUEST,
        'Unknown or blocked layer'
      ));
      return;
    }

    const apiKey = process.env.OWM_API_KEY;
    if (!apiKey) {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(createErrorResponse(
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        'OWM_API_KEY not configured'
      ));
      return;
    }

    const targetUrl = buildOwmTileUrl({ layer, z, x, y, apiKey });
    const upstream = await fetchWithRetry(targetUrl, {});
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.status(upstream.status);

    // Copy headers, excluding certain ones
    upstream.headers.forEach((value: string, key: string) => {
      const k = key.toLowerCase();
      if (
        k === 'content-encoding' ||
        k === 'content-length' ||
        k === 'transfer-encoding' ||
        k === 'cache-control'
      ) {
        return;
      }
      res.setHeader(key, value);
    });

    res.send(buffer);
  } catch (err) {
    console.error('OpenWeatherMap tile proxy error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Proxy error',
      { originalError: err instanceof Error ? err.message : String(err) }
    ));
  }
});

// -----------------
// RainViewer
// -----------------
app.get('/api/rainviewer/index.json', shortLived60, async (_req, res) => {
  try {
    const index = await getRainviewerIndex();
    res.status(HTTP_STATUS.OK)
      .setHeader('Content-Type', 'application/json')
      .json(createSuccessResponse(HTTP_STATUS.OK, index));
  } catch (err) {
    console.error('RainViewer index error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Proxy error',
      { originalError: err instanceof Error ? err.message : String(err) }
    ));
  }
});

app.get(
  '/api/rainviewer/:ts/:size/:z/:x/:y/:color/:options.png',
  shortLived60,
  async (req, res) => {
    try {
      // Check if RainViewer is enabled
      if (
        process.env.RAINVIEWER_ENABLED &&
        process.env.RAINVIEWER_ENABLED.toLowerCase() === 'false'
      ) {
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(createErrorResponse(
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          'RainViewer disabled'
        ));
        return;
      }

      const { ts, size, z, x, y, color, options } = req.params as Record<
        string,
        string
      >;

      const index = await getRainviewerIndex();
      const targetUrl = buildRainviewerTileUrl({
        index,
        ts,
        size,
        z,
        x,
        y,
        color,
        options,
      });

      if (!targetUrl) {
        res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse(
          HTTP_STATUS.NOT_FOUND,
          'Frame not found'
        ));
        return;
      }

      const upstream = await fetchWithRetry(targetUrl, {});
      const buffer = Buffer.from(await upstream.arrayBuffer());

      res.status(upstream.status);

      // Copy headers, excluding certain ones
      upstream.headers.forEach((value: string, key: string) => {
        const k = key.toLowerCase();
        if (
          k === 'content-encoding' ||
          k === 'content-length' ||
          k === 'transfer-encoding' ||
          k === 'cache-control'
        ) {
          return;
        }
        res.setHeader(key, value);
      });

      res.send(buffer);
    } catch (err) {
      console.error('RainViewer tile proxy error:', err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Proxy error',
        { originalError: err instanceof Error ? err.message : String(err) }
      ));
    }
  }
);

// Stub RainViewer tile endpoint to prevent 404s (fallback)
app.get('/api/rainviewer/:z/:x/:y.png', shortLived60, async (req, res) => {
  try {
    // For now, return a transparent 1x1 PNG to prevent 404 errors
    // TODO: Implement real RainViewer tile fetching
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    res.status(HTTP_STATUS.OK)
      .setHeader('Content-Type', 'image/png')
      .setHeader('Cache-Control', 'public, max-age=60')
      .send(transparentPng);
  } catch (err) {
    console.error('RainViewer fallback error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Proxy error',
      { originalError: err instanceof Error ? err.message : String(err) }
    ));
  }
});

// Additional RainViewer tile route for the frontend's expected pattern
app.get(
  '/api/rainviewer/:z/:x/:y/:size/:color/:options.png',
  shortLived60,
  async (req, res) => {
    try {
      // For now, return a transparent 1x1 PNG to prevent 404 errors
      // TODO: Implement real RainViewer tile fetching
      const transparentPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );

      res.status(HTTP_STATUS.OK)
        .setHeader('Content-Type', 'image/png')
        .setHeader('Cache-Control', 'public, max-age=60')
        .send(transparentPng);
    } catch (err) {
      console.error('RainViewer fallback error:', err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Proxy error',
        { originalError: err instanceof Error ? err.message : String(err) }
      ));
    }
  }
);

async function proxyGibsTile(req: express.Request, res: express.Response) {
  const { epsg, layer, tms, z, y, x, ext } = req.params as Record<
    string,
    string
  >;
  const time =
    typeof (req.params as Record<string, unknown>).time === 'string'
      ? (req.params as Record<string, string>).time
      : undefined;
  const targetUrl = buildGibsTileUrl({ epsg, layer, time, tms, z, y, x, ext });

  try {
    const upstream = await fetchWithRetry(targetUrl, {});
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.status(upstream.status);

    // Copy headers, excluding certain ones
    upstream.headers.forEach((value: string, key: string) => {
      const k = key.toLowerCase();
      if (
        k === 'content-encoding' ||
        k === 'content-length' ||
        k === 'transfer-encoding' ||
        k === 'cache-control'
      ) {
        return;
      }
      res.setHeader(key, value);
    });

    res.send(buffer);
  } catch (err) {
    console.error('GIBS tile proxy error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Proxy error',
      { originalError: err instanceof Error ? err.message : String(err) }
    ));
  }
}

async function proxyGibsDomains(req: express.Request, res: express.Response) {
  const { epsg, layer, tms, range } = req.params;
  const targetUrl = buildGibsDomainsUrl({ epsg, layer, tms, range });

  try {
    const upstream = await fetchWithRetry(targetUrl, {});
    const body = await upstream.text();

    res.status(upstream.status);

    // Copy headers, excluding certain ones
    upstream.headers.forEach((value: string, key: string) => {
      const k = key.toLowerCase();
      if (
        k === 'content-encoding' ||
        k === 'content-length' ||
        k === 'transfer-encoding' ||
        k === 'cache-control'
      ) {
        return;
      }
      res.setHeader(key, value);
    });

    res.send(body);
  } catch (err) {
    console.error('GIBS domains proxy error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Proxy error',
      { originalError: err instanceof Error ? err.message : String(err) }
    ));
  }
}

function redirectGibs(req: express.Request, res: express.Response) {
  const { layer, epsg, time, tms, z, y, x, ext } = req.query as Record<
    string,
    string
  >;

  if (!layer || !epsg || !tms || !z || !y || !x) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(createErrorResponse(
      HTTP_STATUS.BAD_REQUEST,
      'Missing required parameters'
    ));
    return;
  }

  const url = buildGibsTileUrl({
    layer,
    epsg,
    time,
    tms,
    z,
    y,
    x,
    ext: ext || 'png',
  });

  if (!url.startsWith('https://gibs.earthdata.nasa.gov/')) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(createErrorResponse(
      HTTP_STATUS.BAD_REQUEST,
      'Invalid redirect URL'
    ));
    return;
  }

  res.redirect(302, url);
}

function ensureGibsEnabled(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (
    process.env.GIBS_ENABLED &&
    process.env.GIBS_ENABLED.toLowerCase() === 'false'
  ) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(createErrorResponse(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      'GIBS disabled'
    ));
    return;
  }
  next();
}

// GIBS endpoints
app.get(
  '/api/gibs/tile/:epsg/:layer/:time/:tms/:z/:y/:x.:ext',
  ensureGibsEnabled,
  shortLived60,
  proxyGibsTile
);
app.get(
  '/api/gibs/tile/:epsg/:layer/:tms/:z/:y/:x.:ext',
  ensureGibsEnabled,
  shortLived60,
  proxyGibsTile
);
app.get(
  '/api/gibs/domains/:epsg/:layer/:tms/:range.xml',
  ensureGibsEnabled,
  shortLived60,
  proxyGibsDomains
);
app.get('/api/gibs/redirect', ensureGibsEnabled, shortLived60, redirectGibs);

// -----------------
// Tracestrack Tiles
// -----------------
app.get('/api/tracestrack/:style/:z/:x/:y.webp', shortLived60, async (req, res) => {
  try {
    const { style, z, x, y } = req.params as Record<string, string>;
    const apiKey = process.env.TTRACK_API_KEY;
    if (!apiKey) {
      res
        .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
        .json(
          createErrorResponse(
            HTTP_STATUS.SERVICE_UNAVAILABLE,
            'Tracestrack API key not configured'
          )
        );
      return;
    }

    const targetUrl = `https://tile.tracestrack.com/${style}/${z}/${x}/${y}.webp?key=${apiKey}&style=outrun`;

    console.log(`Fetching Tracestrack tile from: ${targetUrl}`);

    const upstream = await fetchWithRetry(targetUrl, {});
    const buffer = Buffer.from(await upstream.arrayBuffer());
    
    res.status(upstream.status);
    
    // Copy headers, excluding certain ones
    upstream.headers.forEach((value: string, key: string) => {
      const k = key.toLowerCase();
      if (
        k === 'content-encoding' ||
        k === 'content-length' ||
        k === 'transfer-encoding' ||
        k === 'cache-control'
      ) {
        return;
      }
      res.setHeader(key, value);
    });
    
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes for basemap tiles
    res.send(buffer);
  } catch (err) {
    console.error('Tracestrack tile proxy error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Proxy error',
      { originalError: err instanceof Error ? err.message : String(err) }
    ));
  }
});

export { app };

// --------------
// GLM TOE Tiles (feature-flagged)
// --------------
const TOE_ENABLED =
  String(process.env.GLM_TOE_ENABLED || '').toLowerCase() === 'true';
const TOE_PROXY = process.env.GLM_TOE_PY_URL; // Optional Python microservice for high-quality ingestion/tiling
const toeAgg = new GlmToeAggregator();

if (TOE_ENABLED) {
  // Ingest synthetic data endpoint (dev support)
  app.post('/api/glm-toe/ingest', express.json(), (req, res) => {
    try {
      const batch = Array.isArray(req.body) ? req.body : [];
      toeAgg.ingest(batch);
      res.status(HTTP_STATUS.OK).json(createSuccessResponse(
        HTTP_STATUS.OK,
        { ok: true, count: batch.length }
      ));
    } catch (err) {
      console.error('GLM TOE ingest error:', err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Ingest error',
        { originalError: err instanceof Error ? err.message : String(err) }
      ));
    }
  });

  // If a Python microservice is provided, proxy to it for tile rendering; else fallback to local MVP
  app.get('/api/glm-toe/:z/:x/:y.png', async (req, res) => {
    try {
      const hasT =
        typeof req.query.t === 'string' && (req.query.t as string).length > 0;
      const cacheVal = hasT ? HEADERS.CACHE_MEDIUM : HEADERS.CACHE_SHORT;
      const { z, x, y } = req.params as Record<string, string>;

      if (TOE_PROXY) {
        try {
          const upstream = await fetchWithRetry(
            `${TOE_PROXY.replace(/\/$/, '')}/tiles/${z}/${x}/${y}.png`,
            {}
          );
          const buffer = Buffer.from(await upstream.arrayBuffer());

          res.status(upstream.status);

          // Copy headers, excluding certain ones
          upstream.headers.forEach((value: string, key: string) => {
            const k = key.toLowerCase();
            if (
              k === 'content-encoding' ||
              k === 'content-length' ||
              k === 'transfer-encoding' ||
              k === 'cache-control'
            ) {
              return;
            }
            res.setHeader(key, value);
          });

          res.setHeader('Cache-Control', cacheVal['Cache-Control']);
          res.send(buffer);
          return;
        } catch (e) {
          console.error('GLM TOE Python proxy error:', e);
          // fall back to local MVP below
        }
      }

      try {
        const buf = renderTilePng(toeAgg, Number(z), Number(x), Number(y));
        res.status(HTTP_STATUS.OK)
          .setHeader('Content-Type', 'image/png')
          .setHeader('Cache-Control', cacheVal['Cache-Control'])
          .send(buf);
      } catch (e) {
        console.error('GLM TOE render error:', e);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          'GLM TOE rendering error',
          { originalError: e instanceof Error ? e.message : String(e) }
        ));
      }
    } catch (err) {
      console.error('GLM TOE tile error:', err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'GLM TOE error',
        { originalError: err instanceof Error ? err.message : String(err) }
      ));
    }
  });
}
