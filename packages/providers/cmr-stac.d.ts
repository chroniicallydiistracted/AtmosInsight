export declare const slug = 'nasa-cmr-stac';
export declare const baseUrl = 'https://cmr.earthdata.nasa.gov/stac';
export interface Params {
  catalog: string;
  bbox: number[];
  datetime?: string;
  collections?: string[];
}
export interface Request {
  url: string;
  body: {
    bbox: number[];
    datetime?: string;
    collections?: string[];
  };
}
export declare function buildRequest({
  catalog,
  bbox,
  datetime,
  collections,
}: Params): Request;
export declare function fetchJson(url: string, body: any): Promise<any>;
