export declare const slug = "visual-crossing";
export declare const baseUrl = "https://weather.visualcrossing.com";
export interface Params {
    endpoint: string;
    location: string;
}
export declare function buildRequest({ endpoint, location }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
