#!/usr/bin/env node
/**
 * Migration script to replace native fetch calls with fetchWithRetry
 * Usage: node migrate-fetch.js
 */

const fs = require('fs');
const path = require('path');

// List of providers to migrate (excluding nws.ts which already uses fetchWithRetry)
const PROVIDERS_TO_MIGRATE = [
  'airnow', 'cmr-stac', 'dwd', 'earth-search', 'eccc', 'erddap', 'firms',
  'fmi', 'gibs', 'goes', 'google-air', 'himawari8', 'iem', 'meteomatics',
  'metno', 'mrms', 'msc', 'nexrad', 'noaa-coops', 'noaa-ndbc', 'nwm',
  'nws-alerts', 'nws-radar-tiles', 'openaq', 'openmeteo', 'openweather',
  'openweather-air', 'planetary-computer', 'rainviewer', 'smhi', 'tomorrowio',
  'ukmet', 'usgs', 'visualcrossing', 'waqi', 'weatherbit', 'weatherkit',
  'wfigs', 'xweather'
];

const PROVIDERS_DIR = path.join(__dirname, 'packages', 'providers');

/**
 * Add import for fetchWithRetry if not present
 */
function addFetchWithRetryImport(content) {
  if (content.includes("import { fetchWithRetry } from '@atmos/fetch-client';")) {
    return content;
  }

  // Find the first import or export line
  const lines = content.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith('export ')) {
      insertIndex = i;
      break;
    }
  }

  // Insert the import after other imports but before exports
  const importLine = "import { fetchWithRetry } from '@atmos/fetch-client';";
  
  // Check if there are existing imports
  if (lines[insertIndex].startsWith('import ')) {
    // Find the end of imports
    while (insertIndex < lines.length && lines[insertIndex].startsWith('import ')) {
      insertIndex++;
    }
    lines.splice(insertIndex, 0, importLine);
  } else {
    // Insert at the top
    lines.splice(0, 0, importLine);
  }

  return lines.join('\n');
}

/**
 * Replace fetch calls with fetchWithRetry
 */
function replaceFetchCalls(content) {
  // Replace various fetch patterns
  const replacements = [
    // Standard fetch calls
    { from: /await fetch\(/g, to: 'await fetchWithRetry(' },
    { from: /await globalThis\.fetch\(/g, to: 'await fetchWithRetry(' },
    
    // Handle cases where fetch is assigned to a variable first
    { from: /const res = fetch\(/g, to: 'const res = fetchWithRetry(' },
    { from: /let res = fetch\(/g, to: 'let res = fetchWithRetry(' },
    { from: /= fetch\(/g, to: '= fetchWithRetry(' }
  ];

  let updatedContent = content;
  replacements.forEach(({ from, to }) => {
    updatedContent = updatedContent.replace(from, to);
  });

  return updatedContent;
}

/**
 * Process a single provider file
 */
function migrateProvider(providerName) {
  const tsPath = path.join(PROVIDERS_DIR, `${providerName}.ts`);
  const jsPath = path.join(PROVIDERS_DIR, `${providerName}.js`);
  
  console.log(`\n📦 Migrating ${providerName}...`);
  
  // Migrate TypeScript file
  if (fs.existsSync(tsPath)) {
    console.log(`  ✏️  Processing ${providerName}.ts`);
    let content = fs.readFileSync(tsPath, 'utf8');
    
    // Check if already uses fetchWithRetry
    if (content.includes('fetchWithRetry')) {
      console.log(`  ⏭️  ${providerName}.ts already migrated`);
    } else {
      content = addFetchWithRetryImport(content);
      content = replaceFetchCalls(content);
      
      // Create backup
      fs.writeFileSync(`${tsPath}.backup`, fs.readFileSync(tsPath));
      fs.writeFileSync(tsPath, content);
      console.log(`  ✅ ${providerName}.ts migrated (backup created)`);
    }
  }
  
  // Migrate JavaScript file (compiled output)
  if (fs.existsSync(jsPath)) {
    console.log(`  ✏️  Processing ${providerName}.js`);
    let content = fs.readFileSync(jsPath, 'utf8');
    
    if (content.includes('fetchWithRetry')) {
      console.log(`  ⏭️  ${providerName}.js already migrated`);
    } else {
      content = addFetchWithRetryImport(content);
      content = replaceFetchCalls(content);
      
      // Create backup
      fs.writeFileSync(`${jsPath}.backup`, fs.readFileSync(jsPath));
      fs.writeFileSync(jsPath, content);
      console.log(`  ✅ ${providerName}.js migrated (backup created)`);
    }
  }
}

/**
 * Verify migration completed successfully
 */
function verifyMigration(providerName) {
  const tsPath = path.join(PROVIDERS_DIR, `${providerName}.ts`);
  
  if (fs.existsSync(tsPath)) {
    const content = fs.readFileSync(tsPath, 'utf8');
    const hasFetchWithRetry = content.includes('fetchWithRetry');
    const hasNativeFetch = content.match(/\bfetch\(/g) !== null;
    
    if (hasFetchWithRetry && !hasNativeFetch) {
      return { status: 'success', provider: providerName };
    } else if (hasFetchWithRetry && hasNativeFetch) {
      return { status: 'partial', provider: providerName };
    } else {
      return { status: 'failed', provider: providerName };
    }
  }
  
  return { status: 'missing', provider: providerName };
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting fetch → fetchWithRetry migration...\n');
  
  if (!fs.existsSync(PROVIDERS_DIR)) {
    console.error(`❌ Providers directory not found: ${PROVIDERS_DIR}`);
    process.exit(1);
  }

  // Process each provider
  PROVIDERS_TO_MIGRATE.forEach(migrateProvider);

  // Verification
  console.log('\n🔍 Verifying migration...');
  const results = PROVIDERS_TO_MIGRATE.map(verifyMigration);
  
  const successful = results.filter(r => r.status === 'success');
  const partial = results.filter(r => r.status === 'partial');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`✅ Successfully migrated: ${successful.length}`);
  if (successful.length > 0) {
    successful.forEach(r => console.log(`   • ${r.provider}`));
  }
  
  if (partial.length > 0) {
    console.log(`⚠️  Partially migrated: ${partial.length}`);
    partial.forEach(r => console.log(`   • ${r.provider} (manual review needed)`));
  }
  
  if (failed.length > 0) {
    console.log(`❌ Failed to migrate: ${failed.length}`);
    failed.forEach(r => console.log(`   • ${r.provider}`));
  }

  console.log('\n🔧 Next steps:');
  console.log('1. Run `npm run build` to compile TypeScript files');
  console.log('2. Run `npm test` to verify all providers work correctly');
  console.log('3. Review any partially migrated files manually');
  console.log('4. Remove .backup files once migration is confirmed working');
  
  if (partial.length > 0 || failed.length > 0) {
    console.log('\n⚠️  Some providers need manual review - check the console output above');
  }
}

if (require.main === module) {
  main();
}