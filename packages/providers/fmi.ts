import { fetchWithRetry } from '@atmos/fetch-client';
export const slug = 'fmi-open-data';
export const baseUrl = 'https://opendata.fmi.fi';

export interface BaseParams {
  storedquery_id: string;
}

export interface LatLonParams extends BaseParams {
  latlon: [number, number];
}

export interface BBoxParams extends BaseParams {
  bbox: [number, number, number, number];
}

export type Params = LatLonParams | BBoxParams;

export function buildRequest(params: Params): string {
  const parts = [
    'service=WFS',
    'request=getFeature',
    `storedquery_id=${params.storedquery_id}`,
  ];

  if ('latlon' in params) {
    const [lat, lon] = params.latlon;
    parts.push(`latlon=${lat},${lon}`);
  } else {
    parts.push(`bbox=${params.bbox.join(',')}`);
  }

  return `${baseUrl}/wfs?${parts.join('&')}`;
}
