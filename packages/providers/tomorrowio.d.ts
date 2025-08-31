export declare const slug = 'tomorrowio-v4';
export declare const baseUrl = 'https://api.tomorrow.io/v4';
export interface Params {
  location: string;
  fields: string;
  timesteps: string;
}
export declare function buildRequest({
  location,
  fields,
  timesteps,
}: Params): string;
export declare function fetchJson(url: string): Promise<any>;
