export declare const slug = 'nws-alerts';
export declare const baseUrl = 'https://api.weather.gov/alerts';
export interface Params {
  status?: string;
  area?: string;
  point?: string;
  urgency?: string;
  event?: string;
}
export declare function buildRequest(params?: Params): string;
export declare function fetchJson(url: string): Promise<any>;
