export declare const slug = "smhi-open-data";
export declare const baseUrl = "https://opendata-download-metfcst.smhi.se/api";
export interface Params {
    lon: number;
    lat: number;
}
export declare function buildRequest({ lon, lat }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
export declare const slug = "smhi-opendata";
export declare const baseUrl = "https://opendata-download-metfcst.smhi.se";
    path: string;
export declare function buildRequest({ path }: Params): string;
