#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

const startTime = performance.now();

console.log('🖥️  Building CLI Application...\n');

// Ensure we're in the right directory
const projectRoot = path.resolve(process.cwd());
const srcPath = path.join(projectRoot, 'src');
const distPath = path.join(projectRoot, 'dist');
const cliSrcPath = path.join(srcPath, 'cli');
const cliDistPath = path.join(distPath, 'cli');

// Clean CLI dist directory
console.log('🧹 Cleaning CLI dist directory...');
if (fs.existsSync(cliDistPath)) {
  fs.rmSync(cliDistPath, { recursive: true });
}

// Run TypeScript compiler for CLI
console.log('📝 Compiling CLI TypeScript files...');
try {
  // Compile with a specific tsconfig if available, otherwise use the main one
  const tsconfigPath = path.join(cliSrcPath, 'tsconfig.json');
  const tscCommand = fs.existsSync(tsconfigPath) 
    ? `tsc --project ${tsconfigPath}` 
    : 'tsc --skipLibCheck';
  
  execSync(tscCommand, { stdio: 'pipe' });
} catch (error) {
  console.error('❌ CLI compilation failed!');
  console.error(error.stdout?.toString() || error.message);
  process.exit(1);
}

// Count CLI files
function countFiles(dir, ext = '.js') {
  if (!fs.existsSync(dir)) return 0;
  
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

const cliJsFiles = countFiles(cliDistPath);
const cliSourceFiles = countFiles(cliSrcPath, '.ts') + countFiles(cliSrcPath, '.tsx');

// Create executable scripts
console.log('🔧 Creating executable scripts...');

// Create a simple wrapper script for the CLI
const cliWrapper = `#!/usr/bin/env bun
import('./index.js');
`;

const cliWrapperPath = path.join(cliDistPath, 'symindx-cli');
fs.writeFileSync(cliWrapperPath, cliWrapper);
fs.chmodSync(cliWrapperPath, '755');

const endTime = performance.now();
const buildTime = ((endTime - startTime) / 1000).toFixed(2);

console.log('\n✅ CLI build completed successfully!\n');
console.log('📊 Build Statistics:');
console.log(`   • Source files compiled: ${cliSourceFiles} TypeScript/TSX files`);
console.log(`   • Output files created: ${cliJsFiles} JavaScript files`);
console.log(`   • Build time: ${buildTime}s`);
console.log(`   • Output directory: ./dist/cli`);
console.log(`   • Executable: ./dist/cli/symindx-cli\n`);
console.log('💡 Run the CLI with: bun dist/cli/index.js');
console.log('   Or directly: ./dist/cli/symindx-cli\n');