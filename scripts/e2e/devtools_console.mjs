#!/usr/bin/env node
// Launch a Chromium instance with DevTools and pipe the page console/network to stdout.
// Usage:
//   SITE_URL=https://weather.westfam.media pnpm e2e:devtools
// Optional:
//   PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

import puppeteer from 'puppeteer';

const SITE = process.env.SITE_URL || 'https://weather.westfam.media/';
const headlessEnv = process.env.HEADLESS || 'false';
const headless = headlessEnv === 'true' ? 'new' : false;

async function resolveExecutablePath() {
  // Prefer explicit env if provided
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;

  // Try puppeteer's default executablePath (works if a browser was downloaded)
  try {
    const p = puppeteer.executablePath?.();
    if (p) return p;
  } catch {}

  // Fallbacks common on Linux
  const guesses = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  for (const g of guesses) {
    try { await import('node:fs/promises').then(fs => fs.access(g)); return g; } catch {}
  }
  return null;
}

(async () => {
  const executablePath = await resolveExecutablePath();
  if (!executablePath && headless === false) {
    console.error('\nNo Chromium/Chrome executable found for headful mode.\n' +
      'Install a browser or run one of:\n' +
      '  pnpm exec puppeteer browsers install chrome\n' +
      '  pnpm exec puppeteer browsers install chromium\n' +
      'Then re-run with PUPPETEER_EXECUTABLE_PATH set. Falling back to headless...');
  }

  const baseArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
  const extraArgs = (process.env.PUPPETEER_ARGS || '').split(/\s+/).filter(Boolean);
  const remoteDebugPort = process.env.REMOTE_DEBUG_PORT;
  if (remoteDebugPort) baseArgs.push(`--remote-debugging-port=${remoteDebugPort}`);

  const browser = await puppeteer.launch({
    headless,
    devtools: headless === false && !remoteDebugPort, // avoid conflicting with remote debugging
    executablePath: executablePath || undefined,
    args: [...baseArgs, ...extraArgs]
  });

  const page = await browser.newPage();

  // Pipe console logs
  page.on('console', async (msg) => {
    const type = msg.type();
    const txt = msg.text();
    // Try to stringify JS handle args (best-effort)
    const vals = [];
    try {
      for (const arg of msg.args()) {
        const val = await arg.jsonValue().catch(() => undefined);
        if (val !== undefined) vals.push(val);
      }
    } catch {}
    const suffix = vals.length ? ' ' + JSON.stringify(vals, null, 0) : '';
    // eslint-disable-next-line no-console
    console.log(`[page:${type}] ${txt}${suffix}`);
  });

  // JS errors on the page
  page.on('pageerror', (err) => console.error('[page:error]', err?.message || err));

  // Failed requests
  page.on('requestfailed', (req) => console.error('[net:fail]', req.method(), req.url(), req.failure()?.errorText));

  // Successful API responses (filter to /api/*)
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/')) {
      const ct = res.headers()['content-type'];
      console.log('[api]', res.status(), ct || '', url);
    }
  });

  // Navigate
  console.log('Opening', SITE, `(headless=${headless !== false ? 'true' : 'false'})`);
  if (remoteDebugPort) {
    const wsEndpoint = await browser.wsEndpoint();
    console.log(`Remote debugging enabled on port ${remoteDebugPort}.`);
    console.log(`WebSocket endpoint: ${wsEndpoint}`);
    console.log('From a local Chrome, open chrome://inspect and add your server:PORT, then Inspect.');
  }
  await page.goto(SITE, { waitUntil: 'networkidle2', timeout: 90000 });

  // Keep process alive in headful with DevTools. Exit headless after a short observation.
  if (headless === false) {
    console.log('\nDevTools should be open. Interact with the page; logs will stream here.');
    // Keep running until user Ctrl+C
  } else {
    // Observe a bit then close
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
