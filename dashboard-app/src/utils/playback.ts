// Playback utilities for radar/satellite loops

export const MIN_FPS = 2;
export const MAX_FPS = 8;
export const DEFAULT_FPS = 4;

export function clampFps(raw: number | undefined | null): number {
  if (raw === undefined || raw === null) return DEFAULT_FPS;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_FPS;
  return Math.min(MAX_FPS, Math.max(MIN_FPS, Math.floor(n)));
}

export function frameDelayMs(fps: number): number {
  const f = clampFps(fps);
  return Math.round(1000 / f);
}

export function isPlayable(timestamps: readonly unknown[], lastError?: unknown): boolean {
  if (!Array.isArray(timestamps) || timestamps.length < 2) return false;
  if (lastError) return false;
  return true;
}

export function nextIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current + 1) % total;
}

// Returns indices to prefetch; spec requires prefetching next frame.
export function prefetchSchedule(length: number, index: number): number[] {
  if (length <= 0) return [];
  return [nextIndex(index, length)];
}
