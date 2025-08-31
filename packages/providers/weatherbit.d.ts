export declare const slug = "weatherbit";
export declare const baseUrl = "https://api.weatherbit.io";
export interface Params {
    endpoint: string;
    lat: number;
    lon: number;
}
export declare function buildRequest({ endpoint, lat, lon }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
