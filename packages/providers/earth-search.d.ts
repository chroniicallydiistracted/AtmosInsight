export declare const slug = "earth-search";
export declare const baseUrl = "https://earth-search.aws.element84.com/v1";
export interface Params {
    bbox: number[];
    datetime: string;
    collections: string[];
}
export declare function buildRequest({ bbox, datetime, collections }: Params): {
    readonly url: "https://earth-search.aws.element84.com/v1/search";
    readonly body: {
        readonly bbox: number[];
        readonly datetime: string;
        readonly collections: string[];
    };
};
export declare function fetchJson({ url, body }: ReturnType<typeof buildRequest>): Promise<any>;
