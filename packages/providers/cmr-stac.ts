import { fetchWithRetry } from '@atmos/fetch-client';
export const slug = 'nasa-cmr-stac';
export const baseUrl = 'https://cmr.earthdata.nasa.gov/stac';

export interface Params {
  catalog: string;
  bbox: number[];
  datetime?: string;
  collections?: string[];
}

export interface Request {
  url: string;
  body: {
    bbox: number[];
    datetime?: string;
    collections?: string[];
  };
}

export function buildRequest({
  catalog,
  bbox,
  datetime,
  collections,
}: Params): Request {
  const body: any = { bbox };
  if (datetime) body.datetime = datetime;
  if (collections) body.collections = collections;
  return {
    url: `${baseUrl}/${catalog}/search`,
    body,
  };
}

export async function fetchJson(url: string, body: any): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = process.env.EARTHDATA_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}
