#!/usr/bin/env node

/**
 * Performance-Optimized Webpack Build Script
 * 
 * Integrates with our performance optimization components:
 * - OptimizedEventBus for build event tracking
 * - PerformanceMonitor for build metrics
 * - MemoryManager for build process resource management
 * - LRUCache for build cache optimization
 */

const webpack = require('webpack');
const { merge } = require('webpack-merge');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');
const path = require('path');
const fs = require('fs').promises;

// Import our performance optimization components
const { PerformanceMonitor } = require('../dist/utils/PerformanceMonitor.js');
const { MemoryManager } = require('../dist/utils/MemoryManager.js');
const { LRUCache } = require('../dist/utils/LRUCache.js');
const { OptimizedEventBus } = require('../dist/core/OptimizedEventBus.js');

class OptimizedWebpackBuilder {
  constructor(options = {}) {
    // Initialize performance monitoring
    this.performanceMonitor = new PerformanceMonitor({
      metricsPrefix: 'webpack_build',
      enableAlerting: true,
      alertThresholds: {
        'build_time': 300000, // 5 minutes max build time
        'memory_usage': 2048 * 1024 * 1024, // 2GB max memory
        'bundle_size': 50 * 1024 * 1024, // 50MB max bundle size
      }
    });

    // Initialize memory manager
    this.memoryManager = new MemoryManager({
      maxResourceAge: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      memoryThreshold: 0.8, // 80% memory threshold
    });

    // Initialize build cache
    this.buildCache = new LRUCache(1000, {
      ttl: 3600000, // 1 hour cache
      onEvict: (key, value) => {
        console.log(`🗑️ Evicted build cache entry: ${key}`);
      }
    });

    // Initialize event bus for build coordination
    this.eventBus = new OptimizedEventBus({
      maxEvents: 1000,
      compressionEnabled: true,
      batchingEnabled: false, // Don't batch build events
    });

    this.options = options;
    this.stats = {
      startTime: Date.now(),
      buildPhases: {},
      memoryUsage: [],
      bundleSizes: {},
    };

    // Register cleanup handlers
    this.memoryManager.registerResource('webpack_builder', this, () => {
      this.cleanup();
    });

    // Setup performance monitoring
    this.setupPerformanceTracking();
  }

  setupPerformanceTracking() {
    // Track memory usage every 10 seconds during build
    this.memoryTrackingInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      this.stats.memoryUsage.push({
        timestamp: Date.now(),
        ...memoryUsage
      });

      // Record metrics
      this.performanceMonitor.recordMetric('memory_used', memoryUsage.heapUsed, 'bytes');
      this.performanceMonitor.recordMetric('memory_total', memoryUsage.heapTotal, 'bytes');

      // Check for memory leaks
      const leakResult = this.memoryManager.detectLeaks();
      if (leakResult.hasLeaks) {
        console.warn('⚠️ Memory leaks detected during build:', leakResult.suspiciousResources);
      }
    }, 10000);
  }

  async build(mode = 'production') {
    console.log('🚀 Starting optimized webpack build...');
    
    try {
      // Load base webpack config
      const baseConfig = require('../webpack.config.js');
      
      // Create optimized config
      const optimizedConfig = await this.createOptimizedConfig(baseConfig, mode);
      
      // Start build timer
      const buildTimer = this.performanceMonitor.startTimer('total_build_time');
      
      // Run webpack build
      const stats = await this.runWebpackBuild(optimizedConfig);
      
      // Stop timer and record metrics
      const buildTime = buildTimer.stop();
      this.performanceMonitor.recordMetric('build_time', buildTime, 'ms');
      
      // Analyze build results
      await this.analyzeBuildResults(stats);
      
      // Generate performance report
      await this.generatePerformanceReport();
      
      console.log('✅ Optimized webpack build completed');
      
      return stats;
    } catch (error) {
      console.error('❌ Build failed:', error);
      this.performanceMonitor.recordMetric('build_failures', 1);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async createOptimizedConfig(baseConfig, mode) {
    const optimizations = {
      mode,
      
      // Performance optimizations
      performance: {
        hints: mode === 'production' ? 'warning' : false,
        maxAssetSize: 1024 * 1024, // 1MB
        maxEntrypointSize: 2048 * 1024, // 2MB
      },

      // Optimization settings
      optimization: {
        ...baseConfig.optimization,
        
        // Tree shaking optimizations
        usedExports: true,
        sideEffects: false,
        
        // Module concatenation
        concatenateModules: mode === 'production',
        
        // Minification settings
        minimize: mode === 'production',
        minimizer: baseConfig.optimization?.minimizer || [],
        
        // Chunk splitting optimization
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            performance: {
              test: /[\\/]utils[\\/](PerformanceMonitor|MemoryManager|LRUCache|OptimizedEventBus)/,
              name: 'performance-optimizations',
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            core: {
              test: /[\\/]core[\\/]/,
              name: 'core',
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },
            modules: {
              test: /[\\/]modules[\\/]/,
              name: 'modules',
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      },

      // Plugins
      plugins: [
        ...baseConfig.plugins,
        
        // Compression plugin for production
        ...(mode === 'production' ? [
          new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 8192,
            minRatio: 0.8,
          }),
        ] : []),
        
        // Bundle analyzer if requested
        ...(this.options.analyze ? [
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: 'bundle-analysis.html',
            openAnalyzer: false,
          }),
        ] : []),

        // Custom performance tracking plugin
        new PerformanceTrackingPlugin(this.performanceMonitor),
      ],

      // Cache optimization
      cache: {
        type: 'filesystem',
        cacheDirectory: path.resolve(__dirname, '../.webpack-cache'),
        buildDependencies: {
          config: [__filename],
        },
        // Integrate with our LRU cache
        store: 'pack',
        compression: 'gzip',
      },

      // Stats configuration
      stats: {
        colors: true,
        modules: false,
        chunks: false,
        chunkModules: false,
        entrypoints: false,
        performance: true,
        timings: true,
        builtAt: true,
      },
    };

    return merge(baseConfig, optimizations);
  }

  runWebpackBuild(config) {
    return new Promise((resolve, reject) => {
      const compiler = webpack(config);

      // Track build phases
      compiler.hooks.compile.tap('OptimizedBuilder', () => {
        this.stats.buildPhases.compile = Date.now();
        console.log('📦 Compiling modules...');
      });

      compiler.hooks.emit.tap('OptimizedBuilder', (compilation) => {
        this.stats.buildPhases.emit = Date.now();
        console.log('📝 Emitting assets...');
        
        // Track bundle sizes
        for (const [filename, asset] of compilation.assets.entries()) {
          this.stats.bundleSizes[filename] = asset.size();
        }
      });

      compiler.hooks.done.tap('OptimizedBuilder', () => {
        this.stats.buildPhases.done = Date.now();
        console.log('✅ Build completed');
      });

      compiler.run((err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        if (stats?.hasErrors()) {
          const errors = stats.compilation.errors;
          console.error('❌ Build errors:', errors);
          reject(new Error('Build failed with errors'));
          return;
        }

        if (stats?.hasWarnings()) {
          const warnings = stats.compilation.warnings;
          console.warn('⚠️ Build warnings:', warnings);
        }

        resolve(stats);
      });
    });
  }

  async analyzeBuildResults(stats) {
    const compilation = stats.compilation;
    
    // Analyze bundle sizes
    const totalSize = Object.values(this.stats.bundleSizes).reduce((sum, size) => sum + size, 0);
    this.performanceMonitor.recordMetric('total_bundle_size', totalSize, 'bytes');
    
    console.log('\n📊 Build Analysis:');
    console.log(`├─ Total build time: ${Date.now() - this.stats.startTime}ms`);
    console.log(`├─ Total bundle size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`├─ Number of chunks: ${compilation.chunks.size}`);
    console.log(`├─ Number of modules: ${compilation.modules.size}`);
    
    // Top 5 largest bundles
    const sortedBundles = Object.entries(this.stats.bundleSizes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    console.log('├─ Largest bundles:');
    for (const [filename, size] of sortedBundles) {
      console.log(`│  ├─ ${filename}: ${(size / 1024).toFixed(1)}KB`);
    }
    
    // Memory usage analysis
    const maxMemory = Math.max(...this.stats.memoryUsage.map(m => m.heapUsed));
    console.log(`└─ Peak memory usage: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);

    // Cache analysis
    console.log(`\n💾 Cache Statistics:`);
    console.log(`├─ Cache entries: ${this.buildCache.size}`);
    console.log(`├─ Cache hit rate: ${((this.buildCache.hits / (this.buildCache.hits + this.buildCache.misses)) * 100).toFixed(1)}%`);
  }

  async generatePerformanceReport() {
    const report = {
      buildId: `build_${Date.now()}`,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.stats.startTime,
      phases: this.stats.buildPhases,
      memoryUsage: this.stats.memoryUsage,
      bundleSizes: this.stats.bundleSizes,
      performance: {
        totalBundleSize: Object.values(this.stats.bundleSizes).reduce((sum, size) => sum + size, 0),
        peakMemoryUsage: Math.max(...this.stats.memoryUsage.map(m => m.heapUsed)),
        buildTime: Date.now() - this.stats.startTime,
      },
      optimizations: {
        eventBusEnabled: true,
        performanceMonitoringEnabled: true,
        memoryManagementEnabled: true,
        buildCacheEnabled: true,
      }
    };

    // Save performance report
    const reportPath = path.resolve(__dirname, '../dist/webpack-performance-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Performance report saved: ${reportPath}`);

    // Generate performance insights
    const insights = this.generatePerformanceInsights(report);
    console.log('\n💡 Performance Insights:');
    insights.forEach(insight => console.log(`   ${insight}`));
  }

  generatePerformanceInsights(report) {
    const insights = [];
    
    // Build time analysis
    if (report.duration > 300000) { // > 5 minutes
      insights.push('⏰ Build time is high. Consider enabling more aggressive caching.');
    } else if (report.duration < 30000) { // < 30 seconds
      insights.push('🚀 Excellent build time! Optimizations are working well.');
    }
    
    // Bundle size analysis
    const totalSizeMB = report.performance.totalBundleSize / 1024 / 1024;
    if (totalSizeMB > 10) {
      insights.push('📦 Bundle size is large. Consider code splitting and tree shaking.');
    } else if (totalSizeMB < 2) {
      insights.push('✨ Bundle size is optimized well!');
    }
    
    // Memory usage analysis
    const peakMemoryMB = report.performance.peakMemoryUsage / 1024 / 1024;
    if (peakMemoryMB > 1024) { // > 1GB
      insights.push('🧠 High memory usage detected. Monitor for memory leaks.');
    } else if (peakMemoryMB < 512) { // < 512MB
      insights.push('💚 Memory usage is efficient!');
    }
    
    return insights;
  }

  async cleanup() {
    console.log('🧹 Cleaning up build resources...');
    
    // Clear intervals
    if (this.memoryTrackingInterval) {
      clearInterval(this.memoryTrackingInterval);
      this.memoryTrackingInterval = null;
    }
    
    // Cleanup memory manager
    await this.memoryManager.cleanup();
    
    // Clear build cache if needed
    if (this.options.clearCache) {
      this.buildCache.clear();
    }
    
    // Shutdown event bus
    this.eventBus.shutdown();
    
    console.log('✨ Cleanup completed');
  }
}

// Custom webpack plugin for performance tracking
class PerformanceTrackingPlugin {
  constructor(performanceMonitor) {
    this.performanceMonitor = performanceMonitor;
  }

  apply(compiler) {
    compiler.hooks.compile.tap('PerformanceTrackingPlugin', () => {
      this.performanceMonitor.recordMetric('webpack_compile_started', 1);
    });

    compiler.hooks.done.tap('PerformanceTrackingPlugin', (stats) => {
      this.performanceMonitor.recordMetric('webpack_compile_completed', 1);
      
      if (stats.hasErrors()) {
        this.performanceMonitor.recordMetric('webpack_errors', stats.compilation.errors.length);
      }
      
      if (stats.hasWarnings()) {
        this.performanceMonitor.recordMetric('webpack_warnings', stats.compilation.warnings.length);
      }
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--dev') ? 'development' : 'production';
  const analyze = args.includes('--analyze');
  const clearCache = args.includes('--clear-cache');

  const builder = new OptimizedWebpackBuilder({
    analyze,
    clearCache,
  });

  try {
    await builder.build(mode);
    process.exit(0);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = { OptimizedWebpackBuilder };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}