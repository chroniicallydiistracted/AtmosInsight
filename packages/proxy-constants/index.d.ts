export const NWS_API_BASE: string;
export const DEFAULT_NWS_USER_AGENT: string;
export const GIBS_BASE: string;
export const OWM_BASE: string;
export const OWM_ALLOW: Set<string>;

export interface GibsTileParams {
  epsg: string;
  layer: string;
  tms: string;
  z: string;
  y: string;
  x: string;
  ext: string;
  time?: string;
}
export function buildGibsTileUrl(params: GibsTileParams): string;

export interface GibsDomainsParams {
  epsg: string;
  layer: string;
  tms: string;
  range: string;
}
export function buildGibsDomainsUrl(params: GibsDomainsParams): string;
