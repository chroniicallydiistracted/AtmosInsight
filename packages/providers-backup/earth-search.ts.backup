export const slug = 'earth-search';
export const baseUrl = 'https://earth-search.aws.element84.com/v1';

export interface Params {
  bbox: number[];
  datetime: string;
  collections: string[];
}

export function buildRequest({ bbox, datetime, collections }: Params) {
  return {
    url: `${baseUrl}/search`,
    body: { bbox, datetime, collections },
  } as const;
}

export async function fetchJson({
  url,
  body,
}: ReturnType<typeof buildRequest>): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}
