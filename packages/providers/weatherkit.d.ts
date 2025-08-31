export declare const slug = 'apple-weatherkit';
export declare const baseUrl = 'https://weatherkit.apple.com/api/v1/weather';
export interface Params {
  lang: string;
  lat: number;
  lon: number;
  dataSets: string[];
}
export declare function buildRequest({
  lang,
  lat,
  lon,
  dataSets,
}: Params): string;
export declare let generateJwt: () => string;
export declare function fetchJson(url: string, token?: string): Promise<any>;
