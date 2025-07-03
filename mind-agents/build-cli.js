#!/usr/bin/env node

/**
 * Simple CLI build script
 * Builds only the CLI files needed for operation
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

console.log('🔨 Building SYMindX CLI...');

try {
  // Build TypeScript files 
  console.log('📦 Compiling TypeScript...');
  execSync('npx tsc --skipLibCheck --outDir dist --rootDir src src/cli/**/*.ts src/cli/**/*.tsx', { 
    stdio: 'inherit' 
  });
  
  // Copy CLI entry point to expected location
  console.log('📄 Setting up CLI entry point...');
  execSync('cp dist/cli/ink-cli.js dist/cli/index.js', { stdio: 'inherit' });
  
  // Make CLI executable
  execSync('chmod +x dist/cli/ink-cli.js', { stdio: 'inherit' });
  execSync('chmod +x dist/cli/index.js', { stdio: 'inherit' });
  
  console.log('✅ CLI built successfully!');
  console.log('');
  console.log('📋 Available commands:');
  console.log('  npm run cli dashboard  - Show runtime dashboard');
  console.log('  npm run cli agents     - List all agents');
  console.log('  npm run cli status     - Show system status');
  console.log('');
  console.log('🧪 Test the CLI:');
  console.log('  node dist/cli/ink-cli.js dashboard');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}