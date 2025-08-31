export declare const slug = 'noaa-nwm';
export declare const baseUrl = 'https://noaa-nwm-pds.s3.amazonaws.com';
export interface Params {
  product: string;
  datetime: Date;
}
export declare function buildRequest({ product, datetime }: Params): string;
export declare function fetchTile(url: string): Promise<ArrayBuffer>;
