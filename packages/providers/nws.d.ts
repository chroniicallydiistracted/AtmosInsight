export declare const slug = 'nws-weather';
export declare const baseUrl = 'https://api.weather.gov';
export interface Params {
  lat: number;
  lon: number;
}
export declare function buildRequest({ lat, lon }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
