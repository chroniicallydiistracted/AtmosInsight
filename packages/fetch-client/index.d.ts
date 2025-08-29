export declare function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries?: number,
  timeoutMs?: number,
  backoffMs?: number
): Promise<Response>;
