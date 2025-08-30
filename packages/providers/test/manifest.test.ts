import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as providers from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const manifest = JSON.parse(
  readFileSync(resolve(__dirname, '../../../providers.json'), 'utf-8')
);

describe('provider manifest', () => {
  it('matches exports and is sorted', () => {
    const exportedSlugs = Object.values(providers).map((p: any) => p.slug).sort();
    const manifestSlugs = manifest.map((p: any) => p.slug);
    expect(manifestSlugs).toEqual([...manifestSlugs].sort());
    expect(manifestSlugs).toEqual(exportedSlugs);
  });
});
