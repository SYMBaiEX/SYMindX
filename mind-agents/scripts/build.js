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
  execSync('tsc --skipLibCheck --noEmitOnError false', { stdio: 'pipe' });
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

// Copy configuration files
console.log('📁 Copying configuration files...');
const configSourceDir = 'src/core/config';
const configDestDir = 'dist/core/config';

// Ensure config directory exists in dist
if (!fs.existsSync(path.dirname(configDestDir))) {
  fs.mkdirSync(path.dirname(configDestDir), { recursive: true });
}
if (!fs.existsSync(configDestDir)) {
  fs.mkdirSync(configDestDir, { recursive: true });
}

// Copy all config files
if (fs.existsSync(configSourceDir)) {
  const configFiles = fs.readdirSync(configSourceDir);
  let copiedConfigFiles = 0;
  
  for (const file of configFiles) {
    if (file.endsWith('.json')) {
      const sourcePath = path.join(configSourceDir, file);
      const destPath = path.join(configDestDir, file);
      fs.copyFileSync(sourcePath, destPath);
      copiedConfigFiles++;
    }
  }
  
  console.log(`   • Copied ${copiedConfigFiles} configuration files`);
}

// Copy character files
console.log('👤 Copying character files...');
const charactersSourceDir = 'src/characters';
const charactersDestDir = 'dist/characters';

if (fs.existsSync(charactersSourceDir)) {
  // Remove existing characters directory in dist
  if (fs.existsSync(charactersDestDir)) {
    fs.rmSync(charactersDestDir, { recursive: true });
  }
  
  // Copy entire characters directory
  function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src, { withFileTypes: true });
    let fileCount = 0;
    
    for (const item of items) {
      const srcPath = path.join(src, item.name);
      const destPath = path.join(dest, item.name);
      
      if (item.isDirectory()) {
        fileCount += copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
        fileCount++;
      }
    }
    
    return fileCount;
  }
  
  const copiedFiles = copyDir(charactersSourceDir, charactersDestDir);
  console.log(`   • Copied ${copiedFiles} character files and assets`);
}

const endTime = performance.now();
const buildTime = ((endTime - startTime) / 1000).toFixed(2);

console.log('\n✅ Build completed successfully!\n');
console.log('📊 Build Statistics:');
console.log(`   • Source files compiled: ${sourceFiles} TypeScript files`);
console.log(`   • Output files created: ${jsFiles} JavaScript files`);
console.log(`   • Configuration files: Runtime config copied`);
console.log(`   • Character files: All agents copied`);
console.log(`   • Build size: ${buildSizeMB} MB`);
console.log(`   • Build time: ${buildTime}s`);
console.log(`   • Output directory: ./dist\n`);