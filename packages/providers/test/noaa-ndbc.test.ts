import { describe, it, expect } from 'vitest';
import { buildRequest } from '../noaa-ndbc.js';

describe('noaa-ndbc provider', () => {
  it('builds station URL', () => {
    const url = buildRequest({ station: '41009', format: 'txt' });
    expect(url).toBe('https://www.ndbc.noaa.gov/data/realtime2/41009.txt');
  });
});
