export const NWS_API_BASE = 'https://api.weather.gov/alerts';
export const DEFAULT_NWS_USER_AGENT = '(AtmosInsight, contact@atmosinsight.com)';
export const GIBS_BASE = 'https://gibs.earthdata.nasa.gov/wmts';
export const OWM_BASE = 'https://tile.openweathermap.org/map';
export const OWM_ALLOW = new Set([
  'clouds_new',
  'precipitation_new',
  'pressure_new',
  'wind_new',
  'temp_new',
  'rain',
  'snow',
]);

export function buildGibsTileUrl({ epsg, layer, time, tms, z, y, x, ext }) {
  const timePart = time ? `${time}/` : '';
  return `${GIBS_BASE}/epsg${epsg}/best/${layer}/default/${timePart}${tms}/${z}/${y}/${x}.${ext}`;
}

export function buildGibsDomainsUrl({ epsg, layer, tms, range }) {
  return `${GIBS_BASE}/epsg${epsg}/best/1.0.0/${layer}/default/${tms}/all/${range}.xml`;
}
