export declare const slug = 'met-norway';
export declare const baseUrl = 'https://api.met.no/weatherapi';
export interface Params {
  lat: number;
  lon: number;
  format: 'compact' | 'complete';
}
export declare function buildRequest({ lat, lon, format }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
