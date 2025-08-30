export declare const slug = "erddap";
export interface Params {
    dataset: string;
    query: string;
}
export declare function buildRequest({ dataset, query }: Params): string;
export declare function fetchJson(url: string): Promise<any>;
