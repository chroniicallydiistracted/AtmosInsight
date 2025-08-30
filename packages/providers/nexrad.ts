export const slug = 'nexrad-l2';
export const baseUrl = 'https://noaa-nexrad-level2.s3.amazonaws.com';

export interface Params {
  station: string;
  datetime: Date;
}

export function buildRequest({ station, datetime }: Params): string {
  const yyyy = datetime.getUTCFullYear().toString().padStart(4, '0');
  const mm = String(datetime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(datetime.getUTCDate()).padStart(2, '0');
  const hh = String(datetime.getUTCHours()).padStart(2, '0');
  const min = String(datetime.getUTCMinutes()).padStart(2, '0');
  const ss = String(datetime.getUTCSeconds()).padStart(2, '0');
  const key = `${station}${yyyy}${mm}${dd}_${hh}${min}${ss}_V06`;
  return `${baseUrl}/${yyyy}/${mm}/${dd}/${station}/${key}`;
}

export async function fetchTile(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}

