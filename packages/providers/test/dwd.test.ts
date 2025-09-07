import { describe, it, expect } from 'vitest';
import { buildKvp } from '../dwd.js';

describe('dwd-opendata provider', () => {
  it('builds params in sorted uppercase order', () => {
    const params = buildKvp({ version: '1.3.0', service: 'WMS', request: 'GetMap' });
    expect(params).toBe('REQUEST=GetMap&SERVICE=WMS&VERSION=1.3.0');
  });
});