export declare const slug = "openweather-onecall";
export declare const baseUrl = "https://api.openweathermap.org";
export interface Params {
    lat: number;
    lon: number;
}
export declare function buildRequest({ lat, lon }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
