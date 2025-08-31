#!/usr/bin/env node
// packages/tokens/build.mjs — Style Dictionary v4 / ESM build script
// Why: prior script used `.extend` (v3 API). In v4, instantiate the class and await async methods.
// Docs: https://www.styledictionary.org/versions/v4/migration/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');

function readJson(basename) {
  return JSON.parse(fs.readFileSync(path.join(SRC, `${basename}.json`), 'utf8'));
}

const PRIMITIVES = readJson('primitives');
const SEMANTIC = readJson('semantic');
const LIGHT = readJson('light');
const DARK = readJson('dark');

// Wrap plain objects into SD token shape { key: { value } }
function toTokens(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, { value: v }]));
}

function themeTokens(themeVars) {
  // order: primitives → semantic → theme
  return {
    ...toTokens(PRIMITIVES),
    ...toTokens(SEMANTIC),
    ...toTokens(themeVars),
  };
}

// v4: register formats via registerFormat; handler is `format` (not `formatter`)
StyleDictionary.registerFormat({
  name: 'javascript/namedTokens',
  format: ({ dictionary }) => `export const tokens = ${JSON.stringify(dictionary.tokens, null, 2)};\n`,
});

function makeConfig(themeName, themeVars) {
  return {
    // Inline tokens (supported in v4 config ESM)
    tokens: themeTokens(themeVars),
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: `${DIST}/`,
        files: [{ destination: `tokens-${themeName}.css`, format: 'css/variables' }],
      },
      js: {
        transformGroup: 'js',
        buildPath: `${DIST}/`,
        files: [
          { destination: `tokens-${themeName}.js`, format: 'javascript/namedTokens' },
          { destination: `tokens-${themeName}.d.ts`, format: 'typescript/es6-declarations' },
        ],
      },
    },
  };
}

function ensureDist() {
  fs.mkdirSync(DIST, { recursive: true });
}

async function buildTheme(themeName, vars) {
  const sd = new StyleDictionary(makeConfig(themeName, vars));
  await sd.hasInitialized; // v4: async init
  await sd.buildAllPlatforms();
}

async function buildAll() {
  ensureDist();
  await buildTheme('base', LIGHT);
  await buildTheme('dark', DARK);
  console.log('[tokens] built to dist/');
}

async function watch() {
  ensureDist();
  const rebuild = () => buildAll().catch((e) => console.error(e));
  fs.watch(SRC, { recursive: true }, rebuild);
  await rebuild();
  console.log('[tokens] watching…');
}

if (process.argv.includes('--watch')) watch();
else buildAll().catch((e) => { console.error(e); process.exit(1); });

