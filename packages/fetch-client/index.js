export async function fetchWithRetry(
  url,
  init = {},
  retries = 3,
  timeoutMs = 10000,
  backoffMs = 500
) {
  let attempt = 0;
  let delay = backoffMs;
  while (true) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (res.status !== 429 || attempt >= retries) {
        clearTimeout(id);
        return res;
      }
    } catch (err) {
      if (attempt >= retries) {
        clearTimeout(id);
        throw err;
      }
    }
    clearTimeout(id);
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
    attempt++;
  }
}
