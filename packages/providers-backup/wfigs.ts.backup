export const slug = 'nifc-wfigs';
export const baseUrl = 'https://services3.arcgis.com';
const servicePath =
  'T4QMspbfLg3qTGWY/ArcGIS/rest/services/WFIGS_Incident_Locations/FeatureServer';

export interface Params {
  layerId: string | number;
  where: string;
  outFields: string;
  f: string;
}

export function buildRequest({ layerId, where, outFields, f }: Params): string {
  const params = new URLSearchParams();
  params.set('f', f);
  params.set('outFields', outFields);
  params.set('where', where);
  const query = params.toString().replace(/\*/g, '%2A');
  return `${baseUrl}/${servicePath}/${layerId}/query?${query}`;
}

export async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
}
