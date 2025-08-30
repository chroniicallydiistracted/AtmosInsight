import { OWM_BASE, OWM_ALLOW } from '@atmos/proxy-constants';
const BASE = OWM_BASE;

const ALLOWLIST = OWM_ALLOW;

export function isAllowedOwmLayer(layer: string): boolean {
  return ALLOWLIST.has(layer);
}

export function buildOwmTileUrl({
  layer,
  z,
  x,
  y,
  apiKey,
}: {
  layer: string;
  z: string;
  x: string;
  y: string;
  apiKey: string;
}): string {
  return `${BASE}/${layer}/${z}/${x}/${y}.png?appid=${encodeURIComponent(apiKey)}`;
}

export { ALLOWLIST as ALLOWED_OWM_LAYERS };
