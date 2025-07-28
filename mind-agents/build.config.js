// Build Configuration for SYMindX Mind-Agents
export const buildConfig = {
  // Compilation settings
  compiler: {
    // Use Bun's native TypeScript compilation
    useBunTranspiler: true,
    
    // TypeScript compiler options override
    tsConfigOverride: {
      compilerOptions: {
        // Performance optimizations
        incremental: true,
        tsBuildInfoFile: './dist/.tsbuildinfo',
        assumeChangesOnlyAffectDirectDependencies: true,
        
        // Skip expensive checks
        skipLibCheck: true,
        skipDefaultLibCheck: true,
        
        // Minimal type checking for speed
        strict: false,
        noEmitOnError: false,
        
        // Output optimizations
        removeComments: true,
        declaration: false,
        sourceMap: true,
        
        // Module settings
        module: 'esnext',
        target: 'es2022',
        moduleResolution: 'bundler'
      }
    }
  },
  
  // Build optimization settings
  optimization: {
    // Parallel compilation
    parallel: true,
    maxWorkers: 4,
    
    // Caching
    cache: {
      enabled: true,
      directory: './node_modules/.cache/build',
      compression: true
    },
    
    // Incremental builds
    incremental: {
      enabled: true,
      checksumAlgorithm: 'xxhash64', // Fast hashing
      granularity: 'file' // File-level incremental checks
    },
    
    // Memory optimization
    memory: {
      maxHeapSize: 4096, // 4GB max heap
      gcInterval: 100 // Aggressive GC for lower memory usage
    }
  },
  
  // File processing
  processing: {
    // Include patterns
    include: [
      'src/**/*.ts',
      'src/**/*.tsx',
      'src/**/*.js',
      'src/**/*.jsx'
    ],
    
    // Exclude patterns
    exclude: [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.d.ts',
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/*.disabled*',
      'src/modules/behaviors_disabled/**',
      'src/modules/life-cycle_disabled/**'
    ],
    
    // Fast file filtering
    useNativeGlob: true,
    followSymlinks: false
  },
  
  // Output configuration
  output: {
    directory: './dist',
    
    // Clean strategies
    clean: {
      // Only clean on full rebuilds
      beforeBuild: false,
      
      // Smart cleaning - keep .tsbuildinfo
      patterns: ['**/*', '!.tsbuildinfo', '!module-index.json']
    },
    
    // Source maps
    sourceMaps: {
      enabled: true,
      inline: false,
      sources: false // Don't include sources in maps
    }
  },
  
  // Performance monitoring
  performance: {
    // Timing
    measureCompilationTime: true,
    measureFileIOTime: true,
    
    // Thresholds
    targetBuildTime: 5000, // 5 seconds
    warnBuildTime: 10000, // 10 seconds
    
    // Reporting
    generateReport: true,
    reportPath: './dist/build-performance.json'
  },
  
  // Error handling
  errorHandling: {
    // Continue on errors
    continueOnError: true,
    maxErrors: 1000,
    
    // Error reporting
    suppressDuplicates: true,
    groupSimilarErrors: true,
    
    // Recovery strategies
    fallbackToBunTranspiler: true,
    fallbackToDirectCopy: false
  },
  
  // Bun-specific optimizations
  bun: {
    // Use Bun's fast transpiler
    transpiler: {
      target: 'bun',
      minify: false, // Don't minify for development
      treeShaking: false,
      
      // JSX settings
      jsx: {
        runtime: 'react-jsx',
        importSource: 'react',
        pragma: 'React.createElement',
        pragmaFrag: 'React.Fragment'
      }
    },
    
    // Native modules
    nativeModules: {
      // Use native Bun modules where possible
      preferNative: true,
      
      // Module replacements
      replacements: {
        'node:fs': 'bun:fs',
        'node:path': 'bun:path',
        'node:crypto': 'bun:crypto'
      }
    }
  },
  
  // Development mode optimizations
  development: {
    // Watch mode settings
    watch: {
      enabled: false, // Disabled for build command
      usePolling: false,
      interval: 100,
      aggregateTimeout: 200
    },
    
    // Hot reload
    hotReload: {
      enabled: false,
      port: 3001
    }
  },
  
  // Production optimizations
  production: {
    // Minification (disabled for faster builds)
    minify: false,
    
    // Tree shaking (disabled for faster builds)  
    treeShaking: false,
    
    // Compression
    compress: false,
    
    // Bundle splitting
    splitting: false
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
  buildConfig.production.minify = true;
  buildConfig.production.treeShaking = true;
  buildConfig.optimization.cache.enabled = false;
}

// CI/CD optimizations
if (process.env.CI) {
  buildConfig.optimization.maxWorkers = 2;
  buildConfig.optimization.memory.maxHeapSize = 2048;
  buildConfig.performance.generateReport = true;
}

export default buildConfig;