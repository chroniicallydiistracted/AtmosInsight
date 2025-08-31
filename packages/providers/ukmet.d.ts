export declare const slug = 'ukmet-datahub';
export declare const baseUrl =
  'https://api-metoffice.apiconnect.ibmcloud.com/metoffice/production/v0';
export interface Params {
  path: string;
  [key: string]: string | number;
}
export declare function buildRequest({ path, ...query }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
