/**
 * Webpack Configuration for SYMindX Performance Optimization
 * Includes tree shaking, code splitting, and bundle optimization
 */

const path = require('path');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    target: 'node',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    entry: {
      // Main entry points
      index: './src/index.ts',
      runtime: './src/core/runtime.ts',
      api: './src/api.ts',
      
      // CLI entry points
      cli: './src/cli/index.ts',
      
      // Module entry points for code splitting
      modules: './src/modules/index.ts',
      extensions: './src/extensions/index.ts',
      portals: './src/portals/index.ts',
      
      // Utility chunks
      utils: './src/utils/index.ts',
      performance: [
        './src/utils/PerformanceMonitor.ts',
        './src/utils/MemoryManager.ts',
        './src/utils/AsyncQueue.ts',
        './src/utils/LRUCache.ts'
      ]
    },
    
    output: {
      path: path.resolve(__dirname, 'dist-optimized'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
      clean: true,
      library: {
        type: 'commonjs2'
      }
    },
    
    resolve: {
      extensions: ['.ts', '.js', '.json'],
      alias: {
        '@core': path.resolve(__dirname, 'src/core'),
        '@types': path.resolve(__dirname, 'src/types'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@modules': path.resolve(__dirname, 'src/modules'),
        '@extensions': path.resolve(__dirname, 'src/extensions'),
        '@portals': path.resolve(__dirname, 'src/portals')
      }
    },
    
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: !isProduction,
                compilerOptions: {
                  module: 'esnext',
                  moduleResolution: 'node',
                  target: 'es2020',
                  lib: ['es2020'],
                  skipLibCheck: true,
                  allowSyntheticDefaultImports: true,
                  esModuleInterop: true,
                  declaration: false,
                  sourceMap: true
                }
              }
            }
          ],
          exclude: /node_modules/
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: { node: '18' },
                  modules: false
                }]
              ]
            }
          }
        },
        {
          test: /\.json$/,
          type: 'json'
        }
      ]
    },
    
    optimization: {
      minimize: isProduction,
      sideEffects: false, // Enable tree shaking
      usedExports: true,
      providedExports: true,
      
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Vendor dependencies
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 20,
            chunks: 'all'
          },
          
          // Core runtime
          core: {
            test: /[\\/]src[\\/]core[\\/]/,
            name: 'core',
            priority: 15,
            chunks: 'all',
            minChunks: 2
          },
          
          // Performance utilities
          performance: {
            test: /[\\/]src[\\/]utils[\\/](PerformanceMonitor|MemoryManager|AsyncQueue|LRUCache)/,
            name: 'performance',
            priority: 18,
            chunks: 'all'
          },
          
          // Types (usually just interfaces, minimal runtime impact)
          types: {
            test: /[\\/]src[\\/]types[\\/]/,
            name: 'types',
            priority: 10,
            chunks: 'all',
            minChunks: 3
          },
          
          // Modules
          modules: {
            test: /[\\/]src[\\/]modules[\\/]/,
            name: 'modules',
            priority: 12,
            chunks: 'all',
            minChunks: 2
          },
          
          // Common utilities
          common: {
            test: /[\\/]src[\\/]utils[\\/]/,
            name: 'common',
            priority: 8,
            chunks: 'all',
            minChunks: 2
          }
        }
      },
      
      // Runtime chunk for webpack runtime code
      runtimeChunk: {
        name: 'runtime'
      }
    },
    
    plugins: [
      // Define environment variables
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.WEBPACK_BUILD': JSON.stringify(true),
        'process.env.BUILD_TIMESTAMP': JSON.stringify(Date.now())
      }),
      
      // Ignore moment.js locales (common optimization)
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/
      }),
      
      // Bundle analyzer (only in production)
      ...(isProduction && process.env.ANALYZE ? [
        new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'bundle-analysis.html'
        })
      ] : [])
    ],
    
    externals: {
      // Don't bundle these large dependencies
      'better-sqlite3': 'commonjs better-sqlite3',
      'pg': 'commonjs pg',
      'sharp': 'commonjs sharp',
      'canvas': 'commonjs canvas',
      'puppeteer': 'commonjs puppeteer',
      
      // Node.js built-ins
      'fs': 'commonjs fs',
      'path': 'commonjs path',
      'crypto': 'commonjs crypto',
      'http': 'commonjs http',
      'https': 'commonjs https',
      'url': 'commonjs url',
      'util': 'commonjs util',
      'events': 'commonjs events',
      'stream': 'commonjs stream',
      'buffer': 'commonjs buffer',
      'zlib': 'commonjs zlib'
    },
    
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 1024 * 1024, // 1MB
      maxAssetSize: 1024 * 1024 // 1MB
    },
    
    stats: {
      colors: true,
      modules: false,
      chunks: false,
      chunkModules: false,
      entrypoints: false,
      assets: true,
      assetsSort: 'size',
      builtAt: true,
      timings: true
    },
    
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename]
      }
    }
  };
};