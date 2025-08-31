export declare const slug = 'eccc-geomet';
export declare const baseUrl = 'https://geo.weather.gc.ca/geomet';
export interface Params {
  urlTemplate?: string;
  [key: string]: any;
}
export declare function buildRequest(params: Params): string;
export declare function fetchTile(url: string): Promise<ArrayBuffer>;
