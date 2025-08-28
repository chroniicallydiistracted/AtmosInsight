import express from 'express';
import { setDefaultResultOrder } from 'node:dns';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { shortLived60 } from './cache.js';
import { buildGibsTileUrl, buildGibsDomainsUrl } from './gibs.js';

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

app.get('/api/gibs/tile/:epsg/:layer/:time/:tms/:z/:y/:x.:ext', shortLived60, proxyGibsTile);
app.get('/api/gibs/tile/:epsg/:layer/:tms/:z/:y/:x.:ext', shortLived60, proxyGibsTile);
app.get('/api/gibs/domains/:epsg/:layer/:tms/:range.xml', shortLived60, proxyGibsDomains);

export { app };
