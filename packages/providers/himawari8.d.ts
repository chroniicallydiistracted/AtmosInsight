export declare const slug = 'jma-himawari8';
export declare const baseUrl = 'https://himawari8.s3.amazonaws.com';
export interface Params {
  product: string;
  datetime: Date;
  region: string;
}
export declare function buildRequest({
  product,
  datetime,
  region,
}: Params): string;
export declare function fetchTile(url: string): Promise<ArrayBuffer>;
