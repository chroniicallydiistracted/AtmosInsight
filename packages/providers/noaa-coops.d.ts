export declare const slug = "noaa-coops";
export declare const baseUrl = "https://api.tidesandcurrents.noaa.gov/api/prod";
export interface Params {
    product: string;
    station: string;
    begin_date: string;
    end_date: string;
    units: string;
    time_zone: string;
    format: string;
}
export declare function buildRequest({ product, station, begin_date, end_date, units, time_zone, format }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
