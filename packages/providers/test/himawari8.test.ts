import { describe, it, expect } from 'vitest';
import { buildRequest } from '../himawari8.js';

describe('himawari8 provider', () => {
  it('builds key URL', () => {
    const dt = new Date('2025-01-02T03:04:05Z');
    const url = buildRequest({
      product: 'prod',
      datetime: dt,
      region: 'R01/0/0.png',
    });
    expect(url).toBe(
      'https://himawari8.s3.amazonaws.com/prod/2025/01/02/030405/R01/0/0.png'
    );
  });
});
