import { fetchWithRetry } from '@atmos/fetch-client';
export const slug = 'microsoft-pc';
export const baseUrl = 'https://planetarycomputer.microsoft.com/api/stac/v1';

export interface Params {
  bbox: number[];
  datetime: string;
  collections: string[];
}

export interface Request {
  url: string;
  body: {
    bbox: number[];
    datetime: string;
    collections: string[];
  };
}

export function buildRequest({ bbox, datetime, collections }: Params): Request {
  return {
    url: `${baseUrl}/search`,
    body: { bbox, datetime, collections },
  };
}

export async function fetchJson({ url, body }: Request): Promise<any> {
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
