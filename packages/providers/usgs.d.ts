export declare const slug = 'usgs-water';
export declare const baseUrl = 'https://waterservices.usgs.gov/nwis';
export interface Params {
  service: string;
  sites: string;
  parameterCd: string;
  startDT: string;
  endDT: string;
}
export declare function buildRequest({
  service,
  sites,
  parameterCd,
  startDT,
  endDT,
}: Params): string;
export declare function fetchJson(url: string): Promise<any>;
