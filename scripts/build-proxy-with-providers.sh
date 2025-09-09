#!/usr/bin/env bash
set -euo pipefail

echo "Building Lambda with embedded providers data..."

# Read the providers.json file and create a TypeScript file with embedded data
node -e "
const fs = require('fs');
const providers = JSON.parse(fs.readFileSync('packages/providers/providers.json', 'utf8'));
const tsContent = \`// Auto-generated embedded providers data
export const EMBEDDED_PROVIDERS = \${JSON.stringify(providers.providers, null, 2)};
\`;
fs.writeFileSync('tiling-services/proxy-api/embedded-providers.ts', tsContent);
console.log('Generated embedded providers data');
"

# Build with esbuild
npx esbuild tiling-services/proxy-api/index.ts \
  --bundle --platform=node --format=esm \
  --outfile=tiling-services/proxy-api/index.mjs \
  --packages=bundle

echo "✓ Built tiling-services/proxy-api/index.mjs with embedded providers data"

# Clean up the temporary file
rm -f tiling-services/proxy-api/embedded-providers.ts
