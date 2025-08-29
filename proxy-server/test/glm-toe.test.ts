import { describe, it, expect } from 'vitest';
import { GlmToeAggregator, type GlmEvent } from '../src/services/glm-toe/ingest.js';
import { renderTilePng } from '../src/services/glm-toe/tiles.js';

function tileFromLonLat(lon: number, lat: number, z: number) {
  const n = Math.pow(2, z);
  const xtile = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const ytile = Math.floor(
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
  );
  return { x: xtile, y: ytile };
}

describe('GLM TOE aggregator and tile renderer', () => {
  it('aggregates TOE into approx 2km bins and renders PNG', () => {
    const agg = new GlmToeAggregator(30 * 60 * 1000);
    const now = Date.now();
    // Synthetic cluster near Tucson, AZ
    const center = { lon: -110.97, lat: 32.22 };
    const events: GlmEvent[] = [];
    for (let i = 0; i < 50; i++) {
      events.push({
        lon: center.lon + (Math.random() - 0.5) * 0.05,
        lat: center.lat + (Math.random() - 0.5) * 0.05,
        energy_fj: 100 + Math.random() * 900,
        timeMs: now - Math.floor(Math.random() * 10 * 60 * 1000),
      });
    }
    agg.ingest(events);

    const z = 6;
    const { x, y } = tileFromLonLat(center.lon, center.lat, z);
    const png = renderTilePng(agg, z, x, y);
    expect(png.byteLength).toBeGreaterThan(200);
  });
});
