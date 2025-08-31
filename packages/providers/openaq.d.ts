export declare const slug = 'openaq-v3';
export declare const baseUrl = 'https://api.openaq.org/v3';
export interface Params {
  coordinates: string;
  radius: number;
  parameter: string;
}
export declare function buildRequest({
  coordinates,
  radius,
  parameter,
}: Params): string;
export declare function fetchJson(url: string): Promise<any>;
