export declare const slug = "smhi-opendata";
export declare const baseUrl = "https://opendata-download-metfcst.smhi.se";
export interface Params {
    path: string;
}
export declare function buildRequest({ path }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
