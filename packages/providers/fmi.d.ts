export declare const slug = "fmi-opendata";
export declare const baseUrl = "https://opendata.fmi.fi";
export interface Params {
    path: string;
}
export declare function buildRequest({ path }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
