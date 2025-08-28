const BASE = 'https://tile.openweathermap.org/map';

const ALLOWLIST = new Set<string>([
  // Common official layers; keep minimal and safe
  'clouds_new',
  'precipitation_new',
  'pressure_new',
  'wind_new',
  'temp_new',
  'rain',
  'snow',
]);

export function isAllowedOwmLayer(layer: string): boolean {
  return ALLOWLIST.has(layer);
}

export function buildOwmTileUrl({ layer, z, x, y, apiKey }: { layer: string; z: string; x: string; y: string; apiKey: string; }): string {
  return `${BASE}/${layer}/${z}/${x}/${y}.png?appid=${encodeURIComponent(apiKey)}`;
}

export { ALLOWLIST as ALLOWED_OWM_LAYERS };

