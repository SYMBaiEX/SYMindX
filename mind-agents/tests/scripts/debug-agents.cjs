#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Debug Agent Loading ===\n');

// Check working directory
console.log('Current working directory:', process.cwd());
console.log('Script location:', __dirname);

// Check for runtime.json
const possibleConfigPaths = [
  path.join(process.cwd(), 'dist/core/config/runtime.json'),
  path.join(process.cwd(), 'src/core/config/runtime.json'),
  path.join(__dirname, 'dist/core/config/runtime.json'),
  path.join(__dirname, 'src/core/config/runtime.json'),
];

console.log('\n--- Checking for runtime.json ---');
let runtimeConfig = null;
for (const configPath of possibleConfigPaths) {
  try {
    if (fs.existsSync(configPath)) {
      console.log(`✓ Found: ${configPath}`);
      runtimeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('  agents config:', JSON.stringify(runtimeConfig.agents, null, 2));
      break;
    } else {
      console.log(`✗ Not found: ${configPath}`);
    }
  } catch (err) {
    console.log(`✗ Error reading ${configPath}: ${err.message}`);
  }
}

// Check for character files
console.log('\n--- Checking for character files ---');
const possibleCharPaths = [
  path.join(process.cwd(), 'characters'),
  path.join(process.cwd(), 'src/characters'),
  path.join(process.cwd(), 'dist/characters'),
  path.join(__dirname, 'characters'),
  path.join(__dirname, 'src/characters'),
  path.join(__dirname, 'dist/characters'),
];

if (runtimeConfig?.agents?.charactersPath) {
  // Add config path to the beginning
  possibleCharPaths.unshift(path.resolve(process.cwd(), runtimeConfig.agents.charactersPath));
}

for (const charPath of possibleCharPaths) {
  try {
    if (fs.existsSync(charPath) && fs.statSync(charPath).isDirectory()) {
      console.log(`✓ Found directory: ${charPath}`);
      const files = fs.readdirSync(charPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      console.log(`  JSON files: ${jsonFiles.join(', ') || 'none'}`);
      
      // Check each character file
      for (const file of jsonFiles) {
        const filePath = path.join(charPath, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          console.log(`  - ${file}: id=${content.id}, enabled=${content.enabled}, name=${content.name}`);
        } catch (err) {
          console.log(`  - ${file}: Error reading: ${err.message}`);
        }
      }
    } else {
      console.log(`✗ Not found: ${charPath}`);
    }
  } catch (err) {
    console.log(`✗ Error checking ${charPath}: ${err.message}`);
  }
}

// Check environment
console.log('\n--- Environment ---');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('LOG_LEVEL:', process.env.LOG_LEVEL || 'not set');

// Check if we're in the dist folder
console.log('\n--- Execution Context ---');
console.log('Running from dist?', __dirname.includes('dist'));
console.log('Package.json location:', fs.existsSync(path.join(process.cwd(), 'package.json')) ? 'found' : 'not found');