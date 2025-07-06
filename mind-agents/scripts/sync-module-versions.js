#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read main package.json version
const mainPackageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const mainVersion = mainPackageJson.version;

console.log(`Syncing module versions to ${mainVersion}...`);

// Define module directories
const modulePaths = [
  'src/modules/emotion',
  'src/modules/memory',
  'src/modules/cognition',
  'src/modules/memory/providers/sqlite',
  'src/modules/memory/providers/postgres',
  'src/modules/memory/providers/supabase',
  'src/modules/memory/providers/neon'
];

// Update each module's package.json
modulePaths.forEach(modulePath => {
  const packageJsonPath = join(rootDir, modulePath, 'package.json');
  
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    if (packageJson.version !== mainVersion) {
      packageJson.version = mainVersion;
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log(`  ✓ Updated ${packageJson.name} to version ${mainVersion}`);
    } else {
      console.log(`  - ${packageJson.name} already at version ${mainVersion}`);
    }
  } catch (error) {
    console.error(`  ✗ Error updating ${modulePath}: ${error.message}`);
  }
});

console.log('\nVersion sync complete!');