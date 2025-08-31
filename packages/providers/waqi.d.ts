export declare const slug = 'waqi';
export declare const baseUrl = 'https://api.waqi.info';
export interface Params {
  lat: number;
  lon: number;
}
export declare function buildRequest({ lat, lon }: Params): string;
export interface TileParams {
  host: string;
  z: number;
  x: number;
  y: number;
}
export declare function buildTileUrl({ host, z, x, y }: TileParams): string;
export declare function fetchJson(url: string): Promise<any>;
