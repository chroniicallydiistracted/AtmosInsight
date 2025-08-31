export declare const slug = "dwd-opendata";
export declare const baseUrl = "https://opendata.dwd.de";
export interface KvpParams {
    [key: string]: string | number | boolean;
}
export declare function buildKvp(params: KvpParams): string;
