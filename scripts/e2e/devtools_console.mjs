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
  // Install early window error hooks
  try {
    await page.evaluateOnNewDocument(() => {
      window.addEventListener('error', (e) => {
        console.error('[client:error]', JSON.stringify({ message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno }));
      });
      window.addEventListener('unhandledrejection', (e) => {
        console.error('[client:unhandled]', JSON.stringify({ reason: e.reason && (e.reason.stack || e.reason.message || String(e.reason)) }));
      });
    });
  } catch {}
  // Ensure desktop layout and consistent breakpoints
  try { await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 }); } catch {}

  // Pipe console logs
  page.on('console', async (msg) => {
    const type = msg.type();
    const txt = msg.text();
    let loc = {};
    try { loc = typeof msg.location === 'function' ? msg.location() : (msg.location || {}); } catch {}
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
    if (type === 'error' || type === 'warning') {
      console.log('[console:loc]', JSON.stringify(loc));
    }
  });

  // JS errors on the page
  page.on('pageerror', (err) => console.error('[page:error]', err?.message || err, err?.stack || ''));

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
  try { console.log('[debug] initial HTML length:', (await page.content()).length); } catch {}
  // Log initial DOM stats
  try {
    const stats = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      buttons: document.querySelectorAll('button').length,
      navs: document.querySelectorAll('nav').length,
      asides: document.querySelectorAll('aside').length,
      h2s: Array.from(document.querySelectorAll('h2')).map(h => (h.textContent||'').trim()).slice(0, 5),
    }));
    console.log('[debug] initial DOM:', JSON.stringify(stats));
  } catch {}

  // Automated interactions to verify UI wiring
  try {
    // Click Search and Settings buttons (right controls) first
    await page.waitForSelector('nav .p-2.rounded-lg.glass', { timeout: 5000 }).catch(() => {});
    const buttonsRight = await page.$$('nav .p-2.rounded-lg.glass');
    if (buttonsRight.length >= 2) {
      await buttonsRight[0].click();
      console.log('[action] Clicked Search');
      await new Promise(r => setTimeout(r, 150));
      await buttonsRight[1].click();
      console.log('[action] Clicked Settings');
    } else {
      console.log('[ui] Search/Settings buttons not found');
    }

    const urlBefore = page.url();
    // Click "+ Add Custom Layer" (opens Providers panel)
    const addFound = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const btn = btns.find(b => (b.textContent || '').includes('+ Add Custom Layer'));
      if (btn) btn.click();
      return !!btn;
    });
    if (addFound) {
      console.log('[action] Clicked + Add Custom Layer');
      // Wait a moment for panel to render
      await new Promise(r => setTimeout(r, 800));
      console.log('[debug] url before:', urlBefore, 'after:', page.url());
      try {
        const loc = await page.evaluate(() => ({ href: window.location.href, readyState: document.readyState }));
        console.log('[debug] location after click:', JSON.stringify(loc));
      } catch {}
      try {
        const stats2 = await page.evaluate(() => ({
          buttons: document.querySelectorAll('button').length,
          asides: document.querySelectorAll('aside').length,
          asideH2s: Array.from(document.querySelectorAll('aside h2')).map(h => (h.textContent||'').trim()),
        }));
        console.log('[debug] post-click DOM:', JSON.stringify(stats2));
      } catch {}
      // Wait for panel header or Close button to appear
      try {
        await page.waitForFunction(() => {
          const hasHeader = !!document.querySelector('[data-testid="providers-header"]') || !!Array.from(document.querySelectorAll('h2')).find(h => (h.textContent||'').toLowerCase().includes('s3 providers'));
          const hasClose = !!Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim() === 'Close');
          return hasHeader || hasClose;
        }, { timeout: 3000 });
      } catch {}
      // Quick debug: log all aside h2 texts
      const asideHeaders = await page.evaluate(() => Array.from(document.querySelectorAll('aside h2')).map(h => (h.textContent || '').trim()));
      console.log('[debug] aside h2s:', JSON.stringify(asideHeaders));
      try { console.log('[debug] post-click HTML length:', (await page.content()).length); } catch {}
      try {
        const bodyInfo = await page.evaluate(() => ({
          textLen: (document.body.innerText || '').length,
          textHead: (document.body.innerText || '').slice(0, 200),
          hasNextData: typeof window.__NEXT_DATA__ !== 'undefined',
          hasNextRoot: !!document.getElementById('__next'),
        }));
        console.log('[debug] body after click:', JSON.stringify(bodyInfo));
      } catch {}
      // Also wait until the text appears anywhere on the page (best-effort)
      const waitStart = Date.now();
      while (Date.now() - waitStart < 3000) {
        const hasText = await page.evaluate(() => document.body.innerText.toLowerCase().includes('s3 providers'));
        if (hasText) break;
        await new Promise(r => setTimeout(r, 150));
      }
    const panelInfo = await page.evaluate(() => {
        // Find the specific aside that contains the S3 Providers header
        const asides = Array.from(document.querySelectorAll('aside'));
        const providerAside = asides.find(a => {
      const h2s = Array.from(a.querySelectorAll('h2,[data-testid="providers-header"]'));
      return h2s.some(h => (h.textContent || '').toLowerCase().includes('s3 providers'));
        });
        if (!providerAside) return { visible: false, count: 0 };
        // Count provider buttons in the left column. Heuristic: buttons whose text contains a bullet '•'
        const btns = Array.from(providerAside.querySelectorAll('button'));
        const providerBtns = btns.filter(b => (b.textContent || '').includes('•'));
        return { visible: true, count: providerBtns.length };
      });
      console.log(`[ui] Providers panel ${panelInfo.visible ? 'visible' : 'NOT visible'}`);
      console.log(`[ui] Providers listed: ${panelInfo.count}`);
    } else {
      console.log('[ui] + Add Custom Layer not found');
    }

  // Done
  } catch (e) {
    console.log('[warn] interaction error:', e?.message || String(e));
  }

  // Keep process alive in headful with DevTools. Exit headless after a short observation.
  if (headless === false) {
    console.log('\nDevTools should be open. Interact with the page; logs will stream here.');
    // Keep running until user Ctrl+C
  } else {
    // Observe a bit then close
  await new Promise(r => setTimeout(r, 2000));
    await browser.close();
  }
})();
