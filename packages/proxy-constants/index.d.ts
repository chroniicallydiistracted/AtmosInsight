export declare const NWS_API_BASE = "https://api.weather.gov/alerts";
export declare const DEFAULT_NWS_USER_AGENT = "(AtmosInsight, contact@atmosinsight.com)";
export declare const GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts";
export declare const OWM_BASE = "https://tile.openweathermap.org/map";
export declare const OWM_ALLOW: Set<string>;
export interface GibsTileParams {
    epsg: string;
    layer: string;
    tms: string;
    z: string;
    y: string;
    x: string;
    ext: string;
    time?: string;
}
export declare function buildGibsTileUrl({ epsg, layer, time, tms, z, y, x, ext, }: GibsTileParams): string;
export interface GibsDomainsParams {
    epsg: string;
    layer: string;
    tms: string;
    range: string;
}
export declare function buildGibsDomainsUrl({ epsg, layer, tms, range, }: GibsDomainsParams): string;
