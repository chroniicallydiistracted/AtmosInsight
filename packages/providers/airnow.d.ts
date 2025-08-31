export declare const slug = 'epa-airnow';
export declare const baseUrl = 'https://www.airnowapi.org';
export interface Params {
  lat: number;
  lon: number;
}
export declare function buildRequest({ lat, lon }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
