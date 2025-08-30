export declare const slug = "dwd-opendata";
export declare const baseUrl = "https://opendata.dwd.de";
export interface Params {
    path: string;
}
export declare function buildRequest({ path }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
