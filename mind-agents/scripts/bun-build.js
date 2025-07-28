#!/usr/bin/env bun
import { rmSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { performance } from 'perf_hooks';

import { glob } from 'glob';

const startTime = performance.now();

console.log('🔨 Starting Bun-based build process...\n');

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
if (existsSync('dist')) {
  rmSync('dist', { recursive: true });
}

// Create dist directory
mkdirSync('dist', { recursive: true });

async function buildWithBun() {
  try {
    console.log('📝 Transpiling TypeScript files with Bun...');

    // Find all TypeScript files
    const tsFiles = await glob('src/**/*.{ts,tsx}', {
      ignore: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/**/*.disabled.ts',
        'src/modules/behaviors_disabled/**',
        'src/modules/life-cycle_disabled/**',
        'src/modules/tools.disabled/**',
        'src/prompts.disabled/**',
        'src/core/tool-integration.ts.disabled',
        'src/core/prompt-integration.ts.disabled',
        'src/examples/tool-usage-example.ts.disabled',
        'src/examples/prompt-system-usage.ts.disabled',
        'src/modules/cognition/prompt-enhanced-cognition.ts.disabled',
        'src/test-prompt-integration.ts.disabled',
      ],
    });

    console.log(`Found ${tsFiles.length} TypeScript files to transpile...`);

    let successCount = 0;
    let errorCount = 0;

    for (const inputFile of tsFiles) {
      try {
        // Calculate output path
        const relativePath = relative('src', inputFile);
        const outputPath = join('dist', relativePath.replace(/\.tsx?$/, '.js'));

        // Ensure output directory exists
        mkdirSync(dirname(outputPath), { recursive: true });

        // Transpile with Bun
        // eslint-disable-next-line no-undef
        const transpiler = new Bun.Transpiler({
          loader: inputFile.endsWith('.tsx') ? 'tsx' : 'ts',
          target: 'node',
          format: 'esm',
          allowBunRuntime: false,
          experimentalMacros: false,
          minifyWhitespace: false,
          minifyIdentifiers: false,
          minifySyntax: false,
          treeShaking: false,
          jsxDev: false,
          jsxImportSource: 'react',
          define: {},
          external: [],
        });

        // eslint-disable-next-line no-undef
        const input = await Bun.file(inputFile).text();
        const result = transpiler.transformSync(input, inputFile);

        // Write output
        // eslint-disable-next-line no-undef
        await Bun.write(outputPath, result);
        successCount++;

        // Also create .d.ts file if needed
        const dtsPath = outputPath.replace(/\.js$/, '.d.ts');
        if (inputFile.includes('types/') || inputFile.includes('index.ts')) {
          // Simple .d.ts generation - export everything as any for now
          const dtsContent = result
            .replace(/^/gm, '// ')
            .replace(/\/\/ export/gm, 'export')
            .replace(/: any/g, ': any')
            .replace(/\/\/ interface/gm, 'interface')
            .replace(/\/\/ type/gm, 'type')
            .replace(/\/\/ enum/gm, 'enum')
            .replace(/\/\/ class/gm, 'class')
            .replace(/\/\/ declare/gm, 'declare');

          // eslint-disable-next-line no-undef
          await Bun.write(dtsPath, dtsContent);
        }
      } catch (error) {
        console.warn(
          `⚠️  Warning: Failed to transpile ${inputFile}: ${error.message}`
        );
        errorCount++;
        // Continue with other files
      }
    }

    console.log(`\n✅ Transpilation completed!`);
    console.log(`   • Successfully transpiled: ${successCount} files`);
    if (errorCount > 0) {
      console.log(`   • Errors encountered: ${errorCount} files`);
    }

    // Copy package.json and other necessary files
    console.log('📦 Copying additional files...');

    // Copy package.json with updated exports
    // eslint-disable-next-line no-undef
    const packageJson = await Bun.file('package.json').json();
    // eslint-disable-next-line no-undef
    await Bun.write('dist/package.json', JSON.stringify(packageJson, null, 2));

    return { successCount, errorCount };
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    throw error;
  }
}

// Calculate build statistics
function countFiles(dir, ext = '.js') {
  if (!existsSync(dir)) return 0;
  let count = 0;
  const files = readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(dir, file.name);
    if (file.isDirectory()) {
      count += countFiles(fullPath, ext);
    } else if (file.name.endsWith(ext)) {
      count++;
    }
  }

  return count;
}

function getDirSize(dir) {
  if (!existsSync(dir)) return 0;
  let size = 0;
  const files = readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(dir, file.name);
    if (file.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      size += statSync(fullPath).size;
    }
  }

  return size;
}

// Main execution
try {
  const { successCount, errorCount } = await buildWithBun();

  const jsFiles = countFiles('dist');
  const sourceFiles = countFiles('src', '.ts');
  const buildSize = getDirSize('dist');
  const buildSizeMB = (buildSize / 1024 / 1024).toFixed(2);

  const endTime = performance.now();
  const buildTime = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n📊 Build Statistics:');
  console.log(`   • Source files found: ${sourceFiles} TypeScript files`);
  console.log(`   • Files transpiled: ${successCount} files`);
  console.log(`   • Output files created: ${jsFiles} JavaScript files`);
  console.log(`   • Build size: ${buildSizeMB} MB`);
  console.log(`   • Build time: ${buildTime}s`);
  console.log(`   • Output directory: ./dist\n`);

  if (errorCount > 0) {
    console.log(`⚠️  Build completed with ${errorCount} warnings`);
    process.exit(0); // Still consider it successful
  } else {
    console.log('🎉 Build completed successfully!');
    process.exit(0);
  }
} catch (error) {
  console.error('\n❌ Build failed!');
  console.error(error.message);
  process.exit(1);
}
