import { fetchWithRetry } from '@atmos/fetch-client';
export const slug = 'erddap';

export interface Params {
  dataset: string;
  query: string;
}

export function buildRequest({ dataset, query }: Params): string {
  const base = process.env.ERDDAP_BASE_URL;
  if (!base) throw new Error('ERDDAP_BASE_URL missing');
  return `${base}/griddap/${dataset}.json?${query}`;
}

export async function fetchJson(url: string): Promise<any> {
  const res = await fetchWithRetry(url);
  return res.json();
}
