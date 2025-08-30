export declare const slug = "nws-radar-tiles";
export declare const baseUrl = "https://tiles.weather.gov";
export interface Params {
    layer: string;
    z: number;
    x: number;
    y: number;
}
export declare function buildRequest({ layer, z, x, y }: Params): string;
export declare function fetchTile(url: string): Promise<ArrayBuffer>;
