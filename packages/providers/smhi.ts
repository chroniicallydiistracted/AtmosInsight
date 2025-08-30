export const slug = 'smhi-open-data';
export const baseUrl = 'https://opendata-download-metfcst.smhi.se/api';
export interface Params {
  lon: number;
  lat: number;
}
export function buildRequest({ lon, lat }: Params): string {
  return `${baseUrl}/category/pmp3g/version/2/geotype/point/lon/${lon}/lat/${lat}/data.json`;
export async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
export const slug = 'smhi-opendata';
export const baseUrl = 'https://opendata-download-metfcst.smhi.se';
  path: string;
export function buildRequest({ path }: Params): string {
  return `${baseUrl}/${path}`;
