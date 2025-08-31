export declare const slug = "microsoft-pc";
export declare const baseUrl = "https://planetarycomputer.microsoft.com/api/stac/v1";
export interface Params {
    bbox: number[];
    datetime: string;
    collections: string[];
}
export interface Request {
    url: string;
    body: {
        bbox: number[];
        datetime: string;
        collections: string[];
    };
}
export declare function buildRequest({ bbox, datetime, collections }: Params): Request;
export declare function fetchJson({ url, body }: Request): Promise<any>;
