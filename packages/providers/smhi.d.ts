export declare const slug = "smhi-open-data";
export declare const baseUrl = "https://opendata-download-metfcst.smhi.se/api";
export interface Params {
    lon: number;
    lat: number;
}
export declare function buildRequest({ lon, lat }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
