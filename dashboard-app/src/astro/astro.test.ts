import { describe, it, expect } from 'vitest';
import { computeAstro } from './astro';

describe('computeAstro', () => {
  it('produces reasonable values for a known time/place', () => {
    const date = new Date('2024-01-01T12:00:00Z');
    const lat = 40.7128; // NYC
    const lon = -74.0060;
    const out = computeAstro({ date, lat, lon });

    // Sanity checks (ranges)
    expect(out.sun.azimuth_rad).toBeGreaterThan(-Math.PI);
    expect(out.sun.azimuth_rad).toBeLessThan(Math.PI);
    expect(out.sun.elevation_rad).toBeGreaterThan(-Math.PI / 2);
    expect(out.sun.elevation_rad).toBeLessThan(Math.PI / 2);

    expect(out.moon.distance_m).toBeGreaterThan(300_000e3); // > 300,000 km
    expect(out.moon.distance_m).toBeLessThan(410_000e3);   // < 410,000 km
    expect(out.moon.phase_fraction).toBeGreaterThanOrEqual(0);
    expect(out.moon.phase_fraction).toBeLessThanOrEqual(1);
  });
});

