export type GlmEvent = {
  lat: number;
  lon: number;
  energy_fj: number; // femtojoules
  timeMs: number;
};

export class GlmToeAggregator {
  private events: GlmEvent[] = [];
  constructor(private windowMs: number = 30 * 60 * 1000) {}

  ingest(batch: GlmEvent[]) {
    const now = Date.now();
    for (const e of batch) {
      if (
        !Number.isFinite(e.lat) ||
        !Number.isFinite(e.lon) ||
        !Number.isFinite(e.energy_fj)
      )
        continue;
      if (Math.abs(e.lat) > 90 || Math.abs(e.lon) > 180) continue;
      // Coerce timeMs fallback to now if missing
      this.events.push({ ...e, timeMs: e.timeMs ?? now });
    }
    this.prune(now);
  }

  prune(nowMs: number = Date.now()) {
    const cutoff = nowMs - this.windowMs;
    // Simple filter; for higher volumes consider a deque
    this.events = this.events.filter(e => e.timeMs >= cutoff);
  }

  // Project lon/lat to WebMercator pixel within tile z/x/y (256px tile)
  private lonLatToPixel(
    lon: number,
    lat: number,
    z: number,
    x: number,
    y: number
  ) {
    const tileSize = 256;
    const scale = tileSize * Math.pow(2, z);
    const worldX = ((lon + 180) / 360) * scale;
    const sinLat = Math.sin((lat * Math.PI) / 180);
    const worldY =
      (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
    const px = worldX - x * tileSize;
    const py = worldY - y * tileSize;
    return { px, py };
  }

  private metersPerPixel(lat: number, z: number) {
    const metersPerPixelEquator = 156543.03392804097;
    return (
      (metersPerPixelEquator * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, z)
    );
  }

  // Aggregate TOE into approximate 2km bins by snapping to pixel grid sized to ~2km
  aggregateTile(z: number, x: number, y: number) {
    // Enforce rolling window relative to now to prevent unbounded growth and stale contributions
    this.prune(Date.now());
    const tileSize = 256;
    const bins = new Map<number, number>(); // key = py*tileSize + px
    for (const e of this.events) {
      // Compute pixel step ~ 2km at event latitude
      const mpp = this.metersPerPixel(e.lat, z);
      if (!Number.isFinite(mpp) || mpp <= 0) continue;
      const step = Math.max(1, Math.round(2000 / mpp));
      const { px, py } = this.lonLatToPixel(e.lon, e.lat, z, x, y);
      if (px < 0 || py < 0 || px >= tileSize || py >= tileSize) continue;
      const sx = Math.min(
        tileSize - 1,
        Math.max(0, Math.floor(px / step) * step)
      );
      const sy = Math.min(
        tileSize - 1,
        Math.max(0, Math.floor(py / step) * step)
      );
      const key = sy * tileSize + sx;
      bins.set(key, (bins.get(key) || 0) + e.energy_fj);
    }
    return { bins, tileSize };
  }
}
