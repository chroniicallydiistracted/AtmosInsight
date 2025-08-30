export declare const slug = "rainviewer";
export declare const baseUrl = "https://api.rainviewer.com";
export interface Params {
    ts: number;
    size: number;
    z: number;
    x: number;
    y: number;
    color: number;
    options: string;
}
export declare function buildRequest({ ts, size, z, x, y, color, options, }: Params): Promise<string>;
export declare function fetchTile(url: string): Promise<ArrayBuffer>;
