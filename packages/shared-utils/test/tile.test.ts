import { describe, expect, it } from 'vitest';
import { latLonToTile } from '../tile';

describe('latLonToTile', () => {
  it('converts lat/lon to correct tile coordinates', () => {
    expect(latLonToTile(0, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(latLonToTile(0, 0, 1)).toEqual({ x: 1, y: 1 });
    expect(latLonToTile(85.05112878, 180, 2)).toEqual({ x: 3, y: 0 });
  });
});
