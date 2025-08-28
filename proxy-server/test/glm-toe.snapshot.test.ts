import { describe, it, expect } from 'vitest';
import { GlmToeAggregator } from '../src/services/glm-toe/ingest.js';
import { renderTilePng } from '../src/services/glm-toe/tiles.js';
import { createHash } from 'node:crypto';

function seededRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s & 0xfffffff) / 0xfffffff;
  };
}

function hash(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

describe('GLM TOE tile color mapping snapshot', () => {
  it('produces stable PNG hash for deterministic synthetic data', () => {
    const rng = seededRand(1234);
    const agg = new GlmToeAggregator(20 * 60 * 1000);
    const now = Date.now();
    const center = { lon: -97.7431, lat: 30.2672 }; // Austin, TX
    const events = [] as any[];
    for (let i = 0; i < 100; i++) {
      events.push({
        lon: center.lon + (rng() - 0.5) * 0.1,
        lat: center.lat + (rng() - 0.5) * 0.1,
        energy_fj: 50 + Math.floor(rng() * 5000),
        timeMs: now - Math.floor(rng() * 15 * 60 * 1000)
      });
    }
    agg.ingest(events);
    const z = 6;
    // Tile covering Austin approximately
    const x = 15, y = 28;
    const buf = renderTilePng(agg, z, x, y);
    const h = hash(buf);
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    // Snapshot hash for regression detection
    expect(h).toBe('d7a82c85633dad3888d58785831147ac9d4cce18901b31c411828da5919c2201');
  });
});
