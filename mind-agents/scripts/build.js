#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

const startTime = performance.now();

console.log('🔨 Starting build process...\n');

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}

// Run TypeScript compiler
console.log('📝 Compiling TypeScript files...');
try {
  execSync('tsc --skipLibCheck', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ TypeScript compilation failed!');
  console.error(error.stdout?.toString() || error.message);
  process.exit(1);
}

// Count compiled files
function countFiles(dir, ext = '.js') {
  let count = 0;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      count += countFiles(fullPath, ext);
    } else if (file.name.endsWith(ext)) {
      count++;
    }
  }
  
  return count;
}

const jsFiles = countFiles('dist');
const sourceFiles = countFiles('src', '.ts');

// Calculate build size
function getDirSize(dir) {
  let size = 0;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      size += fs.statSync(fullPath).size;
    }
  }
  
  return size;
}

const buildSize = getDirSize('dist');
const buildSizeMB = (buildSize / 1024 / 1024).toFixed(2);

const endTime = performance.now();
const buildTime = ((endTime - startTime) / 1000).toFixed(2);

console.log('\n✅ Build completed successfully!\n');
console.log('📊 Build Statistics:');
console.log(`   • Source files compiled: ${sourceFiles} TypeScript files`);
console.log(`   • Output files created: ${jsFiles} JavaScript files`);
console.log(`   • Build size: ${buildSizeMB} MB`);
console.log(`   • Build time: ${buildTime}s`);
console.log(`   • Output directory: ./dist\n`);