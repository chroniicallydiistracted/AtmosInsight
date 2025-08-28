import express from 'express';
import { setDefaultResultOrder } from 'node:dns';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

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
      if (key.toLowerCase() === 'content-encoding' || key.toLowerCase() === 'content-length') {
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

export { app };
