export declare const slug = "google-air-quality";
export declare const baseUrl = "https://airquality.googleapis.com/v1";
export interface Params {
    lat: number;
    lon: number;
}
export interface Request {
    url: string;
    body: {
        location: {
            latitude: number;
            longitude: number;
        };
    };
}
export declare function buildRequest({ lat, lon }: Params): Request;
export declare function fetchJson({ url, body }: Request): Promise<any>;
