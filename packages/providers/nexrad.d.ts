export declare const slug = "nexrad-l2";
export declare const baseUrl = "https://noaa-nexrad-level2.s3.amazonaws.com";
export interface Params {
    station: string;
    datetime: Date;
}
export declare function buildRequest({ station, datetime }: Params): string;
export declare function fetchTile(url: string): Promise<ArrayBuffer>;
