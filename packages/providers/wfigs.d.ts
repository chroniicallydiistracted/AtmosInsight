export declare const slug = 'nifc-wfigs';
export declare const baseUrl = 'https://services3.arcgis.com';
export interface Params {
  layerId: string | number;
  where: string;
  outFields: string;
  f: string;
}
export declare function buildRequest({
  layerId,
  where,
  outFields,
  f,
}: Params): string;
export declare function fetchJson(url: string): Promise<any>;
