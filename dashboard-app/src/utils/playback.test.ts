import { describe, it, expect } from 'vitest';
import {
  clampFps,
  frameDelayMs,
  isPlayable,
  nextIndex,
  prefetchSchedule,
  MIN_FPS,
  MAX_FPS,
  DEFAULT_FPS,
} from './playback';

describe('playback utils', () => {
  it('clamps FPS bounds and defaults', () => {
    expect(clampFps(undefined)).toBe(DEFAULT_FPS);
    expect(clampFps(null as unknown as number)).toBe(DEFAULT_FPS);
    expect(clampFps(1)).toBe(MIN_FPS);
    expect(clampFps(2)).toBe(2);
    expect(clampFps(4)).toBe(4);
    expect(clampFps(9)).toBe(MAX_FPS);
  });

  it('computes frame delay from clamped FPS', () => {
    expect(frameDelayMs(4)).toBeCloseTo(250, 0);
    expect(frameDelayMs(1)).toBeCloseTo(500, 0); // clamped to 2 fps => 500ms
    expect(frameDelayMs(60)).toBeCloseTo(125, 0); // clamped to 8 fps => 125ms
  });

  it('gating logic disables play for <2 timestamps or errors', () => {
    expect(isPlayable([])).toBe(false);
    expect(isPlayable(['a'])).toBe(false);
    expect(isPlayable(['a', 'b'])).toBe(true);
    expect(isPlayable(['a', 'b'], new Error('oops'))).toBe(false);
  });

  it('nextIndex wraps properly', () => {
    expect(nextIndex(0, 5)).toBe(1);
    expect(nextIndex(4, 5)).toBe(0);
    expect(nextIndex(0, 0)).toBe(0);
  });

  it('prefetch schedule returns only next frame index', () => {
    expect(prefetchSchedule(5, 1)).toEqual([2]);
    expect(prefetchSchedule(5, 4)).toEqual([0]);
    expect(prefetchSchedule(0, 0)).toEqual([]);
  });
});
