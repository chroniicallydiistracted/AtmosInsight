// packages/tokens/build.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';

// Register the JavaScript format for named tokens
StyleDictionary.registerFormat({
  name: 'javascript/namedTokens',
  format: ({ dictionary, options }) => {
    const name = (options && options.name) || 'tokens';
    const typeName = name[0].toUpperCase() + name.slice(1);
    return `export const ${name} = ${JSON.stringify(dictionary.tokens, null, 2)} as const;
export type ${typeName} = typeof ${name};
`;
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const r = (...p) => path.join(__dirname, ...p);
const must = file => {
  if (!fs.existsSync(file)) throw new Error(`[tokens] Missing file: ${file}`);
  return file;
};

// Your files (as you described)
const PRIMITIVES = must(r('src/primitives.json'));
const SEMANTIC = must(r('src/semantic.json'));
const DARK = must(r('src/dark.json'));
const LIGHT = must(r('src/light.json'));

const OUT = r('dist');
fs.mkdirSync(OUT, { recursive: true });

function makeBaseConfig() {
  return {
    source: [PRIMITIVES, SEMANTIC],
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: OUT + path.sep,
        files: [
          {
            destination: 'tokens-base.css',
            format: 'css/variables',
            options: { selector: ':root', outputReferences: true },
          },
        ],
      },
      js: {
        transformGroup: 'js',
        buildPath: OUT + path.sep,
        files: [
          {
            destination: 'tokens-base.js',
            format: 'javascript/namedTokens',
            options: { name: 'tokensBase' },
          },
        ],
      },
    },
  };
}

function makeDarkConfig() {
  return {
    include: [PRIMITIVES, SEMANTIC],
    source: [DARK],
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: OUT + path.sep,
        files: [
          {
            destination: 'tokens-dark.css',
            format: 'css/variables',
            options: { selector: '.theme-dark', outputReferences: true },
          },
        ],
      },
      js: {
        transformGroup: 'js',
        buildPath: OUT + path.sep,
        files: [
          {
            destination: 'tokens-dark.js',
            format: 'javascript/namedTokens',
            options: { name: 'tokensDark' },
          },
        ],
      },
    },
  };
}

function makeLightConfig() {
  return {
    include: [PRIMITIVES, SEMANTIC],
    source: [LIGHT],
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: OUT + path.sep,
        files: [
          {
            destination: 'tokens-light.css',
            format: 'css/variables',
            options: { selector: '.theme-light', outputReferences: true },
          },
        ],
      },
      js: {
        transformGroup: 'js',
        buildPath: OUT + path.sep,
        files: [
          {
            destination: 'tokens-light.js',
            format: 'javascript/namedTokens',
            options: { name: 'tokensLight' },
          },
        ],
      },
    },
  };
}

async function buildAll() {
  // StyleDictionary v4 API - create instances and build
  const base = new StyleDictionary(makeBaseConfig());
  const dark = new StyleDictionary(makeDarkConfig());
  const light = new StyleDictionary(makeLightConfig());

  await base.buildAllPlatforms();
  await dark.buildAllPlatforms();
  await light.buildAllPlatforms();

  console.log(
    '[tokens] Built → dist/tokens-base.css/js, dist/tokens-dark.css/js, dist/tokens-light.css/js'
  );
}

async function watchAll() {
  // StyleDictionary v4 API - create instances and watch
  const base = new StyleDictionary(makeBaseConfig());
  const dark = new StyleDictionary(makeDarkConfig());
  const light = new StyleDictionary(makeLightConfig());

  await Promise.all([base.watch(), dark.watch(), light.watch()]);
  console.log('[tokens] Watching token files…');
}

if (process.argv.includes('--watch')) {
  watchAll().catch(e => {
    console.error(e);
    process.exit(1);
  });
} else {
  buildAll().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
