export declare const slug = "nasa-gibs";
export declare const baseUrl = "https://gibs.earthdata.nasa.gov";
export type RestParams = {
    type?: 'rest';
    epsg: string;
    layer: string;
    tms: string;
    z: string;
    y: string;
    x: string;
    ext: string;
    time?: string;
};
export type KvpParams = {
    type: 'kvp';
    epsg: string;
    layer: string;
    tileMatrixSet: string;
    tileMatrix: string;
    tileRow: string;
    tileCol: string;
    format: string;
    time?: string;
};
export type XyzParams = {
    type: 'xyz';
    z: string;
    y: string;
    x: string;
};
export type Params = RestParams | KvpParams | XyzParams;
export declare function buildRequest(params: Params): string;
export interface DomainsParams {
    epsg: string;
    layer: string;
    tms: string;
    range: string;
}
export declare function buildDomainsRequest({ epsg, layer, tms, range }: DomainsParams): string;
export declare function fetchTile(url: string): Promise<ArrayBuffer>;
