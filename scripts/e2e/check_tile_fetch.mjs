#!/usr/bin/env node
import puppeteer from 'puppeteer';

const SITE = process.env.SITE_URL || 'https://weather.westfam.media/';
const TILE_REGEX = /\/api\/basemap\/(osm|carto)\/[^\s"']+\/(\d+)\/(\d+)\/(\d+)\.png/;

(async () => {
  const executablePath = process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) {
    console.warn('No Chromium available for puppeteer; falling back to simple HTTP check.');
    const res = await fetch('https://weather.westfam.media/api/basemap/osm/9/97/205.png');
    if (res.ok) {
      console.log('Fetch fallback OK:', res.status);
      process.exit(0);
    } else {
      console.error('Fetch fallback failed:', res.status);
      process.exit(1);
    }
  }

  const browser = await puppeteer.launch({ headless: 'new', executablePath, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // Collect network events for /api/basemap/*
  const hits = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (TILE_REGEX.test(url)) {
      hits.push({ url, status: res.status(), type: res.request().resourceType() });
    }
  });

  // Navigate and wait for map tiles to load
  await page.goto(SITE, { waitUntil: 'networkidle2', timeout: 60000 });

  // Give a moment for late tile requests
  await page.waitForTimeout(3000);

  // Basic assertion: at least one basemap tile request returned 200
  const ok = hits.some(h => h.status === 200);
  if (!ok) {
    console.error('No successful basemap tile fetch found. Observed:', hits.slice(0, 10));
    await browser.close();
    process.exit(1);
  }

  console.log('Successful basemap fetch:', hits.find(h => h.status === 200));
  await browser.close();
})();
