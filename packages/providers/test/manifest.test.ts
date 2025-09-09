import { describe, it, expect } from 'vitest';
import { providersManifest } from '../index.js';

describe('provider manifest', () => {
  it('has unique ids and valid access values', () => {
    const ids = providersManifest.providers.map(p => p.id);
    expect(new Set(ids).size).toEqual(ids.length);

    const validAccess = new Set(['s3', 'non_s3']);
    expect(
      providersManifest.providers.every(p => validAccess.has(p.access as any))
    ).toBe(true);
  });
});
