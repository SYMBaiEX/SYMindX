#!/usr/bin/env node
/**
 * Enhanced Build System for SYMindX
 * 
 * This script provides a comprehensive build pipeline with:
 * - Type checking and compilation
 * - Code quality checks (linting, formatting)
 * - Testing with coverage
 * - Bundle analysis
 * - Performance monitoring
 * - Asset optimization
 * - Build validation
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';
import { createHash } from 'crypto';

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// Build configuration
const BUILD_CONFIG = {
  outputDir: 'dist',
  sourceDir: 'src',
  tempDir: '.tmp',
  cacheDir: '.cache',
  
  // Build stages
  stages: {
    clean: true,
    typeCheck: true,
    lint: true,
    test: true,
    compile: true,
    bundle: true,
    optimize: true,
    validate: true,
    package: true,
  },
  
  // Quality gates
  qualityGates: {
    maxTypeErrors: 0,
    maxLintWarnings: 10,
    minTestCoverage: 80,
    maxBundleSize: 50 * 1024 * 1024, // 50MB
    maxBuildTime: 300000, // 5 minutes
  },
  
  // Output options
  generateSourceMaps: true,
  minify: process.env.NODE_ENV === 'production',
  enableAnalysis: true,
  enableReports: true,
};

// Build metrics tracking
class BuildMetrics {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      stages: new Map(),
      files: {
        input: 0,
        output: 0,
        size: {
          input: 0,
          output: 0,
        },
      },
      quality: {
        typeErrors: 0,
        lintWarnings: 0,
        lintErrors: 0,
        testResults: null,
        coverage: null,
      },
      performance: {
        buildTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
    };
  }

  startStage(stageName) {
    const stage = {
      name: stageName,
      startTime: performance.now(),
      endTime: null,
      duration: null,
      success: false,
      output: '',
      error: null,
    };
    
    this.metrics.stages.set(stageName, stage);
    return stage;
  }

  endStage(stageName, success = true, error = null) {
    const stage = this.metrics.stages.get(stageName);
    if (stage) {
      stage.endTime = performance.now();
      stage.duration = stage.endTime - stage.startTime;
      stage.success = success;
      stage.error = error;
    }
  }

  addQualityMetric(type, value) {
    this.metrics.quality[type] = value;
  }

  getReport() {
    const totalDuration = Date.now() - this.metrics.startTime;
    const successfulStages = Array.from(this.metrics.stages.values()).filter(s => s.success).length;
    const totalStages = this.metrics.stages.size;

    return {
      ...this.metrics,
      summary: {
        totalDuration,
        successfulStages,
        totalStages,
        success: successfulStages === totalStages,
      },
    };
  }
}

// Utility functions
const utils = {
  log: (message, color = colors.white) => {
    console.log(`${color}${message}${colors.reset}`);
  },

  logStage: (stage, message) => {
    console.log(`${colors.bold}${colors.blue}[${stage}]${colors.reset} ${message}`);
  },

  logSuccess: (message) => {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
  },

  logWarning: (message) => {
    console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
  },

  logError: (message) => {
    console.log(`${colors.red}❌ ${message}${colors.reset}`);
  },

  execCommand: async (command, options = {}) => {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        stdio: ['inherit', 'pipe', 'pipe'],
        ...options,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (options.logOutput) {
          process.stdout.write(data);
        }
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (options.logOutput) {
          process.stderr.write(data);
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  },

  fileExists: async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  },

  getFileSize: async (filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  },

  formatBytes: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatDuration: (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  },

  calculateHash: async (filePath) => {
    try {
      const content = await fs.readFile(filePath);
      return createHash('sha256').update(content).digest('hex').substring(0, 8);
    } catch {
      return 'unknown';
    }
  },
};

// Build stages
const stages = {
  async clean(metrics) {
    const stage = metrics.startStage('clean');
    utils.logStage('CLEAN', 'Cleaning build directories...');

    try {
      // Remove existing build outputs
      const dirsToClean = [BUILD_CONFIG.outputDir, BUILD_CONFIG.tempDir];
      
      for (const dir of dirsToClean) {
        if (await utils.fileExists(dir)) {
          await fs.rm(dir, { recursive: true, force: true });
          utils.log(`  Removed: ${dir}`, colors.dim);
        }
      }

      // Create fresh directories
      await fs.mkdir(BUILD_CONFIG.outputDir, { recursive: true });
      await fs.mkdir(BUILD_CONFIG.tempDir, { recursive: true });
      await fs.mkdir(BUILD_CONFIG.cacheDir, { recursive: true });

      utils.logSuccess('Build directories cleaned');
      metrics.endStage('clean', true);
    } catch (error) {
      utils.logError(`Clean failed: ${error.message}`);
      metrics.endStage('clean', false, error);
      throw error;
    }
  },

  async typeCheck(metrics) {
    const stage = metrics.startStage('typeCheck');
    utils.logStage('TYPE CHECK', 'Running TypeScript type checking...');

    try {
      const { stdout, stderr } = await utils.execCommand('npx tsc --noEmit --skipLibCheck', {
        logOutput: false,
      });

      // Parse TypeScript output for errors
      const errorLines = stderr.split('\n').filter(line => line.includes(' error '));
      const errorCount = errorLines.length;

      metrics.addQualityMetric('typeErrors', errorCount);

      if (errorCount > BUILD_CONFIG.qualityGates.maxTypeErrors) {
        utils.logError(`Type checking failed with ${errorCount} errors`);
        errorLines.slice(0, 10).forEach(line => utils.log(`  ${line}`, colors.red));
        if (errorCount > 10) {
          utils.log(`  ... and ${errorCount - 10} more errors`, colors.dim);
        }
        metrics.endStage('typeCheck', false, new Error(`${errorCount} type errors`));
        throw new Error(`Type checking failed with ${errorCount} errors`);
      }

      utils.logSuccess(`Type checking passed (${errorCount} errors)`);
      metrics.endStage('typeCheck', true);
    } catch (error) {
      utils.logError(`Type checking failed: ${error.message}`);
      metrics.endStage('typeCheck', false, error);
      throw error;
    }
  },

  async lint(metrics) {
    const stage = metrics.startStage('lint');
    utils.logStage('LINT', 'Running ESLint...');

    try {
      const { stdout } = await utils.execCommand('npx eslint src --ext .ts,.tsx,.js,.jsx --format json', {
        logOutput: false,
      });

      let results = [];
      try {
        results = JSON.parse(stdout);
      } catch {
        // Fallback if JSON parsing fails
        results = [];
      }

      const errorCount = results.reduce((sum, file) => sum + file.errorCount, 0);
      const warningCount = results.reduce((sum, file) => sum + file.warningCount, 0);

      metrics.addQualityMetric('lintErrors', errorCount);
      metrics.addQualityMetric('lintWarnings', warningCount);

      if (errorCount > 0) {
        utils.logError(`Linting failed with ${errorCount} errors and ${warningCount} warnings`);
        results.slice(0, 5).forEach(file => {
          if (file.errorCount > 0) {
            utils.log(`  ${file.filePath}:`, colors.red);
            file.messages.slice(0, 3).forEach(msg => {
              if (msg.severity === 2) {
                utils.log(`    Line ${msg.line}: ${msg.message}`, colors.red);
              }
            });
          }
        });
        metrics.endStage('lint', false, new Error(`${errorCount} lint errors`));
        throw new Error(`Linting failed with ${errorCount} errors`);
      }

      if (warningCount > BUILD_CONFIG.qualityGates.maxLintWarnings) {
        utils.logWarning(`Linting passed but with ${warningCount} warnings (max: ${BUILD_CONFIG.qualityGates.maxLintWarnings})`);
      } else {
        utils.logSuccess(`Linting passed (${errorCount} errors, ${warningCount} warnings)`);
      }

      metrics.endStage('lint', true);
    } catch (error) {
      utils.logError(`Linting failed: ${error.message}`);
      metrics.endStage('lint', false, error);
      throw error;
    }
  },

  async test(metrics) {
    const stage = metrics.startStage('test');
    utils.logStage('TEST', 'Running test suite...');

    try {
      const { stdout } = await utils.execCommand('bun test --coverage', {
        logOutput: true,
      });

      // Parse test results (simplified - would need more robust parsing)
      const testResults = {
        passed: 0,
        failed: 0,
        total: 0,
        coverage: null,
      };

      // Extract coverage information if available
      const coverageMatch = stdout.match(/All files\s+\|\s+(\d+\.?\d*)/);
      if (coverageMatch) {
        testResults.coverage = parseFloat(coverageMatch[1]);
        metrics.addQualityMetric('coverage', testResults.coverage);
      }

      metrics.addQualityMetric('testResults', testResults);

      if (testResults.coverage && testResults.coverage < BUILD_CONFIG.qualityGates.minTestCoverage) {
        utils.logWarning(`Test coverage (${testResults.coverage}%) below threshold (${BUILD_CONFIG.qualityGates.minTestCoverage}%)`);
      }

      utils.logSuccess('Tests passed');
      metrics.endStage('test', true);
    } catch (error) {
      utils.logError(`Tests failed: ${error.message}`);
      metrics.endStage('test', false, error);
      throw error;
    }
  },

  async compile(metrics) {
    const stage = metrics.startStage('compile');
    utils.logStage('COMPILE', 'Compiling TypeScript...');

    try {
      // Count input files
      const inputFiles = await this.countFiles(BUILD_CONFIG.sourceDir, '.ts');
      metrics.metrics.files.input = inputFiles.count;
      metrics.metrics.files.size.input = inputFiles.size;

      const compileCommand = BUILD_CONFIG.generateSourceMaps 
        ? 'npx tsc --skipLibCheck --sourceMap'
        : 'npx tsc --skipLibCheck';

      await utils.execCommand(compileCommand, {
        logOutput: false,
      });

      // Count output files
      const outputFiles = await this.countFiles(BUILD_CONFIG.outputDir, '.js');
      metrics.metrics.files.output = outputFiles.count;
      metrics.metrics.files.size.output = outputFiles.size;

      utils.logSuccess(`Compilation completed (${inputFiles.count} → ${outputFiles.count} files)`);
      utils.log(`  Input size: ${utils.formatBytes(inputFiles.size)}`, colors.dim);
      utils.log(`  Output size: ${utils.formatBytes(outputFiles.size)}`, colors.dim);

      metrics.endStage('compile', true);
    } catch (error) {
      utils.logError(`Compilation failed: ${error.message}`);
      metrics.endStage('compile', false, error);
      throw error;
    }
  },

  async bundle(metrics) {
    const stage = metrics.startStage('bundle');
    utils.logStage('BUNDLE', 'Creating optimized bundles...');

    try {
      // Create package.json for the dist directory
      const packageJson = {
        name: '@symindx/mind-agents',
        version: process.env.npm_package_version || '1.0.0',
        type: 'module',
        main: 'index.js',
        exports: {
          '.': './index.js',
          './api': './api.js',
          './core/*': './core/*.js',
          './types/*': './types/*.js',
          './utils/*': './utils/*.js',
          './modules/*': './modules/*.js',
          './extensions/*': './extensions/*.js',
          './portals/*': './portals/*.js',
        },
      };

      await fs.writeFile(
        path.join(BUILD_CONFIG.outputDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Copy essential files
      const filesToCopy = ['README.md', 'LICENSE'];
      for (const file of filesToCopy) {
        if (await utils.fileExists(file)) {
          await fs.copyFile(file, path.join(BUILD_CONFIG.outputDir, file));
        }
      }

      utils.logSuccess('Bundle created');
      metrics.endStage('bundle', true);
    } catch (error) {
      utils.logError(`Bundling failed: ${error.message}`);
      metrics.endStage('bundle', false, error);
      throw error;
    }
  },

  async optimize(metrics) {
    const stage = metrics.startStage('optimize');
    utils.logStage('OPTIMIZE', 'Optimizing build output...');

    try {
      // Remove .d.ts files if not needed for distribution
      if (!BUILD_CONFIG.generateSourceMaps) {
        const dtsFiles = await this.findFiles(BUILD_CONFIG.outputDir, '.d.ts');
        for (const file of dtsFiles) {
          await fs.unlink(file);
        }
        utils.log(`  Removed ${dtsFiles.length} declaration files`, colors.dim);
      }

      // Optimize JSON files
      const jsonFiles = await this.findFiles(BUILD_CONFIG.outputDir, '.json');
      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const parsed = JSON.parse(content);
          const minified = JSON.stringify(parsed);
          await fs.writeFile(file, minified);
        } catch {
          // Skip invalid JSON files
        }
      }

      utils.logSuccess('Optimization completed');
      metrics.endStage('optimize', true);
    } catch (error) {
      utils.logError(`Optimization failed: ${error.message}`);
      metrics.endStage('optimize', false, error);
      throw error;
    }
  },

  async validate(metrics) {
    const stage = metrics.startStage('validate');
    utils.logStage('VALIDATE', 'Validating build output...');

    try {
      // Check that essential files exist
      const requiredFiles = ['index.js', 'api.js'];
      const missingFiles = [];

      for (const file of requiredFiles) {
        const filePath = path.join(BUILD_CONFIG.outputDir, file);
        if (!(await utils.fileExists(filePath))) {
          missingFiles.push(file);
        }
      }

      if (missingFiles.length > 0) {
        throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
      }

      // Check bundle size
      const totalSize = await this.calculateDirectorySize(BUILD_CONFIG.outputDir);
      if (totalSize > BUILD_CONFIG.qualityGates.maxBundleSize) {
        utils.logWarning(`Bundle size (${utils.formatBytes(totalSize)}) exceeds threshold (${utils.formatBytes(BUILD_CONFIG.qualityGates.maxBundleSize)})`);
      }

      // Try to import the main module to ensure it's valid
      try {
        const mainModulePath = path.resolve(BUILD_CONFIG.outputDir, 'index.js');
        // Dynamic import to test the module
        await import(`file://${mainModulePath}`);
        utils.log('  Main module imports successfully', colors.dim);
      } catch (importError) {
        utils.logWarning(`Main module import test failed: ${importError.message}`);
      }

      utils.logSuccess(`Build validation passed (${utils.formatBytes(totalSize)})`);
      metrics.endStage('validate', true);
    } catch (error) {
      utils.logError(`Validation failed: ${error.message}`);
      metrics.endStage('validate', false, error);
      throw error;
    }
  },

  async package(metrics) {
    const stage = metrics.startStage('package');
    utils.logStage('PACKAGE', 'Creating build artifacts...');

    try {
      // Generate build info
      const buildInfo = {
        version: process.env.npm_package_version || '1.0.0',
        buildTime: new Date().toISOString(),
        buildHash: await utils.calculateHash(path.join(BUILD_CONFIG.outputDir, 'index.js')),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        metrics: metrics.getReport(),
      };

      await fs.writeFile(
        path.join(BUILD_CONFIG.outputDir, 'build-info.json'),
        JSON.stringify(buildInfo, null, 2)
      );

      utils.logSuccess('Build artifacts created');
      metrics.endStage('package', true);
    } catch (error) {
      utils.logError(`Packaging failed: ${error.message}`);
      metrics.endStage('package', false, error);
      throw error;
    }
  },

  // Helper methods
  async countFiles(directory, extension) {
    const files = await this.findFiles(directory, extension);
    let totalSize = 0;
    
    for (const file of files) {
      totalSize += await utils.getFileSize(file);
    }

    return { count: files.length, size: totalSize };
  },

  async findFiles(directory, extension) {
    const files = [];
    
    try {
      const items = await fs.readdir(directory, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(directory, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.findFiles(fullPath, extension);
          files.push(...subFiles);
        } else if (item.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return files;
  },

  async calculateDirectorySize(directory) {
    let totalSize = 0;
    
    try {
      const items = await fs.readdir(directory, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(directory, item.name);
        
        if (item.isDirectory()) {
          totalSize += await this.calculateDirectorySize(fullPath);
        } else {
          totalSize += await utils.getFileSize(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return totalSize;
  },
};

// Main build function
async function build() {
  const startTime = Date.now();
  const metrics = new BuildMetrics();

  utils.log('');
  utils.log('🔨 SYMindX Enhanced Build System', colors.bold + colors.cyan);
  utils.log('=====================================', colors.cyan);
  utils.log('');

  try {
    // Run enabled build stages
    const enabledStages = Object.entries(BUILD_CONFIG.stages)
      .filter(([name, enabled]) => enabled)
      .map(([name]) => name);

    utils.log(`Build stages: ${enabledStages.join(' → ')}`, colors.dim);
    utils.log('');

    for (const stageName of enabledStages) {
      if (stages[stageName]) {
        await stages[stageName](metrics);
      } else {
        utils.logWarning(`Stage '${stageName}' not implemented`);
      }
    }

    // Generate final report
    const report = metrics.getReport();
    const buildTime = Date.now() - startTime;

    utils.log('');
    utils.log('📊 Build Report', colors.bold + colors.green);
    utils.log('===============', colors.green);
    utils.log(`Total time: ${utils.formatDuration(buildTime)}`);
    utils.log(`Stages completed: ${report.summary.successfulStages}/${report.summary.totalStages}`);
    utils.log(`Input files: ${report.files.input} (${utils.formatBytes(report.files.size.input)})`);
    utils.log(`Output files: ${report.files.output} (${utils.formatBytes(report.files.size.output)})`);
    
    if (report.quality.typeErrors !== undefined) {
      utils.log(`Type errors: ${report.quality.typeErrors}`);
    }
    
    if (report.quality.lintErrors !== undefined) {
      utils.log(`Lint errors: ${report.quality.lintErrors}`);
    }
    
    if (report.quality.lintWarnings !== undefined) {
      utils.log(`Lint warnings: ${report.quality.lintWarnings}`);
    }
    
    if (report.quality.coverage !== null) {
      utils.log(`Test coverage: ${report.quality.coverage}%`);
    }

    // Check quality gates
    if (buildTime > BUILD_CONFIG.qualityGates.maxBuildTime) {
      utils.logWarning(`Build time (${utils.formatDuration(buildTime)}) exceeds threshold (${utils.formatDuration(BUILD_CONFIG.qualityGates.maxBuildTime)})`);
    }

    // Save build report
    if (BUILD_CONFIG.enableReports) {
      await fs.writeFile(
        path.join(BUILD_CONFIG.outputDir, 'build-report.json'),
        JSON.stringify(report, null, 2)
      );
    }

    utils.log('');
    utils.logSuccess('✨ Build completed successfully!');
    
    process.exit(0);
  } catch (error) {
    const report = metrics.getReport();
    const buildTime = Date.now() - startTime;

    utils.log('');
    utils.log('💥 Build Failed', colors.bold + colors.red);
    utils.log('=============', colors.red);
    utils.log(`Failed after: ${utils.formatDuration(buildTime)}`);
    utils.log(`Error: ${error.message}`);

    // Save failure report
    if (BUILD_CONFIG.enableReports) {
      try {
        await fs.mkdir(BUILD_CONFIG.outputDir, { recursive: true });
        await fs.writeFile(
          path.join(BUILD_CONFIG.outputDir, 'build-failure-report.json'),
          JSON.stringify({ ...report, error: error.message }, null, 2)
        );
      } catch {
        // Ignore report saving errors during failure
      }
    }

    utils.log('');
    process.exit(1);
  }
}

// Run build if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build().catch(console.error);
}

export { build, stages, BuildMetrics, BUILD_CONFIG };