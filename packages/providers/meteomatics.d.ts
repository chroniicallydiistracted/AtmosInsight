export declare const slug = "meteomatics";
export declare const baseUrl = "https://api.meteomatics.com";
export interface Params {
    datetime: string;
    parameters: string;
    lat: number;
    lon: number;
    format: string;
}
export declare function buildRequest({ datetime, parameters, lat, lon, format, }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
