import { PNG } from 'pngjs';
import type { GlmToeAggregator } from './ingest.js';

export type ColorStop = { value: number; color: [number, number, number, number] }; // RGBA 0-255

export const DEFAULT_RAMP: ColorStop[] = [
  { value: 0, color: [0, 0, 0, 0] },
  { value: 50, color: [65, 182, 196, 160] },
  { value: 200, color: [44, 127, 184, 200] },
  { value: 500, color: [37, 52, 148, 220] },
  { value: 1000, color: [255, 255, 0, 240] },
  { value: 2000, color: [255, 140, 0, 255] },
  { value: 5000, color: [220, 20, 60, 255] },
];

function colorFor(value: number, ramp: ColorStop[]): [number, number, number, number] {
  let last = ramp[0].color;
  for (const stop of ramp) {
    if (value <= stop.value) return stop.color;
    last = stop.color;
  }
  return last;
}

export function renderTilePng(agg: GlmToeAggregator, z: number, x: number, y: number, ramp = DEFAULT_RAMP): Buffer {
  const { bins, tileSize } = agg.aggregateTile(z, x, y);
  const png = new PNG({ width: tileSize, height: tileSize });
  // Optional: simple blur-ish fill by copying values into the step cell area. For now, plot at bin key.
  bins.forEach((toe, key) => {
    const py = Math.floor(key / tileSize);
    const px = key % tileSize;
    const [r, g, b, a] = colorFor(toe, ramp);
    const idx = (py * tileSize + px) << 2;
    png.data[idx] = r;
    png.data[idx + 1] = g;
    png.data[idx + 2] = b;
    png.data[idx + 3] = a;
  });
  return PNG.sync.write(png);
}

