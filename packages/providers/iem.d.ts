export declare const slug = 'iowastate-iem';
export declare const baseUrl = 'https://mesonet.agron.iastate.edu';
export interface Params {
  layer: string;
  z: number;
  x: number;
  y: number;
}
export declare function buildRequest({ layer, z, x, y }: Params): string;
export declare function fetchTile(url: string): Promise<Buffer>;
