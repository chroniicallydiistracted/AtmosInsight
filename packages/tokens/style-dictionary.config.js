const StyleDictionary = require('style-dictionary').default;

StyleDictionary.registerFormat({
  name: 'typescript/tokens',
  format: ({ dictionary }) => {
    return `export const tokens = ${JSON.stringify(dictionary.tokens, null, 2)} as const;\nexport type Tokens = typeof tokens;\n`;
  },
});

module.exports = {
  source: ['src/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [{ destination: 'tokens.css', format: 'css/variables' }],
    },
    ts: {
      transformGroup: 'js',
      buildPath: 'dist/',
      files: [{ destination: 'tokens.ts', format: 'typescript/tokens' }],
    },
  },
};
