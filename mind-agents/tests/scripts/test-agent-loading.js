#!/usr/bin/env node

import { readFile, access } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testConfigLoading() {
  console.log('=== Testing Config and Agent Loading ===\n');
  console.log('Current directory:', process.cwd());
  console.log('Script directory:', __dirname);
  
  // Test runtime.json loading
  console.log('\n--- Testing runtime.json paths ---');
  const configPaths = [
    join(__dirname, 'dist', 'core', 'config', 'runtime.json'),
    join(__dirname, 'src', 'core', 'config', 'runtime.json'),
  ];
  
  for (const path of configPaths) {
    try {
      await access(path);
      const content = await readFile(path, 'utf-8');
      const config = JSON.parse(content);
      console.log(`✓ Found config at: ${path}`);
      console.log(`  agents.enabled: ${config.agents?.enabled}`);
      console.log(`  agents.charactersPath: ${config.agents?.charactersPath}`);
    } catch (err) {
      console.log(`✗ Not found: ${path}`);
    }
  }
  
  // Test character loading
  console.log('\n--- Testing character paths ---');
  const charPaths = [
    join(__dirname, 'characters'),
    join(__dirname, 'src', 'characters'),
    join(__dirname, 'dist', 'characters'),
  ];
  
  for (const path of charPaths) {
    try {
      await access(path);
      console.log(`✓ Found characters directory: ${path}`);
      
      const { readdir } = await import('fs/promises');
      const files = await readdir(path);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of jsonFiles) {
        const content = await readFile(join(path, file), 'utf-8');
        const char = JSON.parse(content);
        console.log(`  - ${file}: enabled=${char.enabled}, name=${char.name}`);
      }
    } catch (err) {
      console.log(`✗ Not found: ${path}`);
    }
  }
}

// Run the test
testConfigLoading().catch(console.error);