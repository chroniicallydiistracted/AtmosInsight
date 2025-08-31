export declare const slug = "open-meteo";
export declare const baseUrl = "https://api.open-meteo.com";
export interface Params {
    latitude: number;
    longitude: number;
    hourly: string;
}
export declare function buildRequest({ latitude, longitude, hourly }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
