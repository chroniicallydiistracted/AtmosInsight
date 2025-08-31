import { describe, it, expect } from 'vitest';
import { buildRequest } from '../goes.js';

describe('noaa goes provider', () => {
  it('builds S3 URL with DOY', () => {
    const datetime = new Date(Date.UTC(2024, 2, 29, 16, 0, 0));
    const url = buildRequest({
      satellite: 'G16',
      product: 'ABI-L2-CMIPC',
      datetime,
    });
    expect(url).toBe(
      'https://noaa-goes16.s3.amazonaws.com/ABI-L2-CMIPC/2024/089/16/OR_ABI-L2-CMIPC_G16_s2024089160000.nc'
    );
  });
});
