export declare const slug = 'noaa-goes';
export declare const baseUrl = 'https://noaa-goes16.s3.amazonaws.com';
export interface Params {
  satellite: string;
  product: string;
  datetime: Date;
}
export declare function buildRequest({
  satellite,
  product,
  datetime,
}: Params): string;
export declare function fetchBinary(url: string): Promise<ArrayBuffer>;
