export declare const PORTS: {
  PROXY: any;
  CATALOG: any;
  WEB: any;
  DATABASE: any;
};
export interface ErrorResponse {
  status: number;
  error: string;
  details?: Record<string, unknown>;
}
export declare function createErrorResponse(
  status: number,
  error: string,
  details?: Record<string, unknown>
): ErrorResponse;
export interface SuccessResponse<T = unknown> {
  status: number;
  data: T;
  headers?: Record<string, string>;
}
export declare function createSuccessResponse<T>(
  status: number,
  data: T,
  headers?: Record<string, string>
): SuccessResponse<T>;
export declare const HTTP_STATUS: {
  OK: number;
  CREATED: number;
  BAD_REQUEST: number;
  UNAUTHORIZED: number;
  FORBIDDEN: number;
  NOT_FOUND: number;
  CONFLICT: number;
  UNPROCESSABLE_ENTITY: number;
  INTERNAL_SERVER_ERROR: number;
  BAD_GATEWAY: number;
  SERVICE_UNAVAILABLE: number;
  GATEWAY_TIMEOUT: number;
};
export declare const HEADERS: {
  JSON: {
    'Content-Type': string;
  };
  TEXT: {
    'Content-Type': string;
  };
  PNG: {
    'Content-Type': string;
  };
  XML: {
    'Content-Type': string;
  };
  CACHE_SHORT: {
    'Cache-Control': string;
  };
  CACHE_MEDIUM: {
    'Cache-Control': string;
  };
  CACHE_LONG: {
    'Cache-Control': string;
  };
};
export declare function isPortInUse(port: number): Promise<boolean>;
export declare function killProcessOnPort(port: number): Promise<boolean>;
export declare function createHealthCheckEndpoint(
  serviceName: string
): (req: any, res: any) => Promise<void>;
export declare function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries?: number,
  timeoutMs?: number,
  backoffMs?: number
): Promise<Response>;
