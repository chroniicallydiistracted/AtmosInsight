export declare const slug = "msc-geomet";
export declare const baseUrl = "https://geo.weather.gc.ca/geomet";
export interface Params {
    path: string;
}
export declare function buildRequest({ path }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
