import { GIBS_BASE } from '@atmos/proxy-constants';
const BASE = GIBS_BASE;

export interface TileParams {
  epsg: string;
  layer: string;
  tms: string;
  z: string;
  y: string;
  x: string;
  ext: string;
  time?: string;
}

export function buildGibsTileUrl({ epsg, layer, time, tms, z, y, x, ext }: TileParams): string {
  const timePart = time ? `${time}/` : '';
  return `${BASE}/epsg${epsg}/best/${layer}/default/${timePart}${tms}/${z}/${y}/${x}.${ext}`;
}

export function buildGibsDomainsUrl({ epsg, layer, tms, range }: { epsg: string; layer: string; tms: string; range: string; }): string {
  return `${BASE}/epsg${epsg}/best/1.0.0/${layer}/default/${tms}/all/${range}.xml`;
}
