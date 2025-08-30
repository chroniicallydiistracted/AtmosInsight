export declare const slug = "dwd-opendata";
export declare const baseUrl = "https://opendata.dwd.de";
export interface KvpParams {
    [key: string]: string | number | boolean;
}
export declare function buildKvp(params: KvpParams): string;
export declare function buildWmsParams(params: KvpParams): string;
export declare function buildWfsParams(params: KvpParams): string;
export declare function fetchTile(url: string): Promise<ArrayBuffer>;
export interface Params {
    path: string;
export declare function buildRequest({ path }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
