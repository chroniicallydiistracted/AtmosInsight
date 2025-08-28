import express from 'express';
import { setDefaultResultOrder } from 'node:dns';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { shortLived60 } from './cache.js';
import { buildGibsTileUrl, buildGibsDomainsUrl } from './gibs.js';
import { buildOwmTileUrl, isAllowedOwmLayer } from './owm.js';
import { getRainviewerIndex, buildRainviewerTileUrl } from './rainviewer.js';
import { GlmToeAggregator } from './services/glm-toe/ingest.js';
import { renderTilePng } from './services/glm-toe/tiles.js';

setDefaultResultOrder('ipv4first');
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxy) {
  setGlobalDispatcher(new ProxyAgent(proxy));
}

const app = express();

async function fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
  let attempt = 0;
  let delay = 500;
  while (true) {
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt >= retries) {
      return res;
    }
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
    attempt++;
  }
}

app.use('/api/nws/alerts', async (req, res) => {
  const userAgent = process.env.NWS_USER_AGENT || '(Vortexa, contact@example.com)';
  const targetUrl = 'https://api.weather.gov/alerts' + req.originalUrl.replace(/^\/api\/nws\/alerts/, '');
  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    'Accept': 'application/geo+json'
  };
  try {
    const upstream = await fetchWithRetry(targetUrl, { headers });
    const body = await upstream.text();
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'content-encoding' || k === 'content-length' || k === 'transfer-encoding' || k === 'cache-control') {
        return;
      }
      res.setHeader(key, value);
    });
    res.send(body);
  } catch (err) {
    console.error(err);
    res.status(500).send('proxy error');
  }
});

// -----------------
// OpenWeatherMap
// -----------------
app.get('/api/owm/:layer/:z/:x/:y.png', shortLived60, async (req, res) => {
  try {
    const { layer, z, x, y } = req.params as Record<string, string>;
    if (!isAllowedOwmLayer(layer)) {
      res.status(400).send('unknown or blocked layer');
      return;
    }
    const apiKey = process.env.OWM_API_KEY;
    if (!apiKey) {
      res.status(503).send('OWM_API_KEY not configured');
      return;
    }
    const targetUrl = buildOwmTileUrl({ layer, z, x, y, apiKey });
    const upstream = await fetchWithRetry(targetUrl, {});
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'content-encoding' || k === 'content-length' || k === 'transfer-encoding' || k === 'cache-control') {
        return;
      }
      res.setHeader(key, value);
    });
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('proxy error');
  }
});

// -----------------
// RainViewer
// -----------------
app.get('/api/rainviewer/:ts/:size/:z/:x/:y/:color/:options.png', shortLived60, async (req, res) => {
  try {
    if (process.env.RAINVIEWER_ENABLED && process.env.RAINVIEWER_ENABLED.toLowerCase() === 'false') {
      res.status(503).send('RainViewer disabled');
      return;
    }
    const { ts, size, z, x, y, color, options } = req.params as Record<string, string>;
    const index = await getRainviewerIndex();
    const targetUrl = buildRainviewerTileUrl({ index, ts, size, z, x, y, color, options });
    if (!targetUrl) {
      res.status(404).send('frame not found');
      return;
    }
    const upstream = await fetchWithRetry(targetUrl, {});
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'content-encoding' || k === 'content-length' || k === 'transfer-encoding' || k === 'cache-control') {
        return;
      }
      res.setHeader(key, value);
    });
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('proxy error');
  }
});

async function proxyGibsTile(req: express.Request, res: express.Response) {
  const { epsg, layer, tms, z, y, x, ext } = req.params;
  const time = (req.params as any).time as string | undefined;
  const targetUrl = buildGibsTileUrl({ epsg, layer, time, tms, z, y, x, ext });
  try {
    const upstream = await fetchWithRetry(targetUrl, {});
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'content-encoding' || k === 'content-length' || k === 'transfer-encoding' || k === 'cache-control') {
        return;
      }
      res.setHeader(key, value);
    });
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('proxy error');
  }
}

async function proxyGibsDomains(req: express.Request, res: express.Response) {
  const { epsg, layer, tms, range } = req.params;
  const targetUrl = buildGibsDomainsUrl({ epsg, layer, tms, range });
  try {
    const upstream = await fetchWithRetry(targetUrl, {});
    const body = await upstream.text();
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'content-encoding' || k === 'content-length' || k === 'transfer-encoding' || k === 'cache-control') {
        return;
      }
      res.setHeader(key, value);
    });
    res.send(body);
  } catch (err) {
    console.error(err);
    res.status(500).send('proxy error');
  }
}

function redirectGibs(req: express.Request, res: express.Response) {
  const { layer, epsg, time, tms, z, y, x, ext } = req.query as Record<string, string>;
  if (!layer || !epsg || !tms || !z || !y || !x) {
    res.status(400).send('missing params');
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
    res.status(400).send('invalid redirect');
    return;
  }
  res.redirect(302, url);
}

app.get('/api/gibs/tile/:epsg/:layer/:time/:tms/:z/:y/:x.:ext', shortLived60, proxyGibsTile);
app.get('/api/gibs/tile/:epsg/:layer/:tms/:z/:y/:x.:ext', shortLived60, proxyGibsTile);
app.get('/api/gibs/domains/:epsg/:layer/:tms/:range.xml', shortLived60, proxyGibsDomains);
app.get('/api/gibs/redirect', shortLived60, redirectGibs);

export { app };

// --------------
// GLM TOE Tiles (feature-flagged)
// --------------
const TOE_ENABLED = String(process.env.GLM_TOE_ENABLED || '').toLowerCase() === 'true';
const toeAgg = new GlmToeAggregator();
if (TOE_ENABLED) {
  // Ingest synthetic data endpoint (dev support)
  app.post('/api/glm-toe/ingest', express.json(), (req, res) => {
    const batch = Array.isArray(req.body) ? req.body : [];
    toeAgg.ingest(batch);
    res.json({ ok: true, count: batch.length });
  });

  app.get('/api/glm-toe/:z/:x/:y.png', shortLived60, (req, res) => {
    const { z, x, y } = req.params as Record<string, string>;
    try {
      const buf = renderTilePng(toeAgg, Number(z), Number(x), Number(y));
      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(buf);
    } catch (e) {
      console.error(e);
      res.status(500).send('glm toe error');
    }
  });
}
