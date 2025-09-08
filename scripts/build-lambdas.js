#!/usr/bin/env node

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function buildLambda(inputFile, outputFile) {
  console.log(`Building Lambda: ${inputFile} -> ${outputFile}`);
  
  try {
    await esbuild.build({
      entryPoints: [inputFile],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: outputFile,
      external: ['@aws-sdk/*'], // Keep AWS SDK external
      alias: {
        '@atmos/proxy-constants': path.join(__dirname, '../packages/proxy-constants/index.js'),
        '@atmos/fetch-client': path.join(__dirname, '../packages/shared-utils/dist/index.js')
      },
      minify: true,
      sourcemap: false,
      resolveExtensions: ['.ts', '.js', '.mjs', '.json'],
      loader: {
        '.ts': 'ts',
        '.js': 'js',
      },
      // tsconfig: path.join(__dirname, '../tsconfig.json'), // Use default TypeScript settings
      banner: {
        js: '// AtmosInsight Lambda Bundle - Auto-generated'
      }
    });
    
    console.log(`✅ Successfully built ${outputFile}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to build ${outputFile}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Building AtmosInsight Lambda functions...\n');
  
  const builds = [
    {
      input: path.join(__dirname, '../tiling-services/proxy-api/index.ts'),
      output: path.join(__dirname, '../tiling-services/proxy-api/index.mjs')
    },
    {
      input: path.join(__dirname, '../tiling-services/catalog-api/index.ts'),  
      output: path.join(__dirname, '../tiling-services/catalog-api/index.mjs')
    }
  ];
  
  let success = true;
  
  for (const build of builds) {
    // Check if input file exists
    if (!fs.existsSync(build.input)) {
      console.error(`❌ Input file not found: ${build.input}`);
      success = false;
      continue;
    }
    
    const result = await buildLambda(build.input, build.output);
    if (!result) success = false;
  }
  
  if (success) {
    console.log('\n✅ All Lambda functions built successfully!');
    console.log('\nNext steps:');
    console.log('1. Review generated .mjs files');
    console.log('2. Run Terraform to deploy updated Lambdas');
    console.log('3. Test endpoints after deployment');
  } else {
    console.log('\n❌ Some builds failed. Please check the errors above.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Build script failed:', error);
    process.exit(1);
  });
}