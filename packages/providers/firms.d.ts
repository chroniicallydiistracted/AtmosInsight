export declare const slug = 'nasa-firms';
export declare const baseUrl = 'https://firms.modaps.eosdis.nasa.gov';
export type Params =
  | {
      mode: 'csv';
      path: string;
    }
  | {
      mode: 'wms' | 'wfs';
      dataset: string;
      params: Record<string, string>;
    };
export declare function buildRequest(p: Params): string;
export declare function fetchTile(url: string): Promise<ArrayBuffer | string>;
