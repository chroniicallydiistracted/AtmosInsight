export declare const slug = "noaa-ndbc";
export declare const baseUrl = "https://www.ndbc.noaa.gov";
export interface Params {
    station: string;
    format: 'txt' | 'json';
}
export declare function buildRequest({ station, format }: Params): string;
export declare function fetch(url: string, format: Params['format']): Promise<any>;
