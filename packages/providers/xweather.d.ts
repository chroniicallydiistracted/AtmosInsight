export declare const slug = "xweather";
export declare const baseUrl = "https://api.aerisapi.com";
export interface BuildRequestOptions {
    endpoint: string;
    params: Record<string, string>;
}
export declare function buildRequest({ endpoint, params }: BuildRequestOptions): string;
export declare function fetchJson(url: string): Promise<any>;
