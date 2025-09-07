export interface TileCacheOptions {
  enabled: boolean;
  max: number;
}

export function createTileCache(opts: TileCacheOptions) {
  const max = Math.max(1, opts.max | 0);
  const enabled = !!opts.enabled;
  const map = new Map<string, HTMLImageElement>();

  function touch(key: string) {
    const val = map.get(key);
    if (val) {
      map.delete(key);
      map.set(key, val);
    }
  }

  function set(key: string, img: HTMLImageElement) {
    if (!enabled) return;
    if (map.has(key)) map.delete(key);
    map.set(key, img);
    while (map.size > max) {
      const oldest = map.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      map.delete(oldest);
    }
  }

  function get(key: string) {
    const v = map.get(key);
    if (v) touch(key);
    return v;
  }

  function has(key: string) {
    return map.has(key);
  }

  return { get, set, has };
}

export async function loadImage(
  url: string,
  cache: ReturnType<typeof createTileCache>
): Promise<HTMLImageElement> {
  const cached = cache.get(url);
  if (cached) return cached;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = e => reject(e);
  });
  img.src = url;
  try {
    await p;
    cache.set(url, img);
  } catch (error) {
    // Do not cache failures, but log for debugging
    console.debug('Tile cache: Failed to load image', { url, error: error instanceof Error ? error.message : error });
  }
  return img;
}
