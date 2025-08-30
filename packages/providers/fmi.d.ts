export declare const slug = "fmi-open-data";
export declare const baseUrl = "https://opendata.fmi.fi";
export interface BaseParams {
    storedquery_id: string;
}
export interface LatLonParams extends BaseParams {
    latlon: [number, number];
export interface BBoxParams extends BaseParams {
    bbox: [number, number, number, number];
export type Params = LatLonParams | BBoxParams;
export declare function buildRequest(params: Params): string;
export declare function fetchTile(url: string): Promise<any>;
export declare const slug = "fmi-opendata";
export interface Params {
    path: string;
export declare function buildRequest({ path }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
