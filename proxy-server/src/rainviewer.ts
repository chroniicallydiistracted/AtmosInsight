type Frame = { time: number; path: string };
type RadarIndex = {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: Frame[];
    nowcast?: Frame[];
  };
};

let cachedIndex: RadarIndex | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

export async function getRainviewerIndex(): Promise<RadarIndex> {
  const now = Date.now();
  if (cachedIndex && now - cachedAt < TTL_MS) return cachedIndex;
  const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
  if (!res.ok) throw new Error(`rainviewer index fetch failed: ${res.status}`);
  const json = (await res.json()) as RadarIndex;
  cachedIndex = json;
  cachedAt = now;
  return json;
}

export function buildRainviewerTileUrl(params: {
  index: RadarIndex;
  ts: string;
  size: string;
  z: string;
  x: string;
  y: string;
  color: string;
  options: string;
}): string | null {
  const { index } = params;
  const size = params.size === '512' ? '512' : '256';
  const z = params.z;
  const x = params.x;
  const y = params.y;
  const color = params.color;
  const options = params.options;

  const tsNum = Number(params.ts);
  if (!Number.isFinite(tsNum)) return null;

  const frames: Frame[] = [...(index.radar.past || []), ...((index.radar.nowcast || []))];
  if (frames.length === 0) return null;

  let match: Frame | undefined = frames.find((f) => f.time === tsNum);

  // Fallback: pick the closest past frame <= ts, else the latest available
  if (!match) {
    const pastOrEqual = frames.filter((f) => f.time <= tsNum);
    if (pastOrEqual.length > 0) {
      pastOrEqual.sort((a, b) => b.time - a.time);
      match = pastOrEqual[0];
    } else {
      frames.sort((a, b) => b.time - a.time);
      match = frames[0];
    }
  }

  if (!match) return null;
  return `${index.host}${match.path}/${size}/${z}/${x}/${y}/${color}/${options}.png`;
}

