/**
 * Performance Configuration for SYMindX Edge Deployment
 * Tunable parameters for achieving sub-10ms latency
 */

export interface PerformanceConfig {
  // Target metrics
  targets: {
    maxLatency: number; // milliseconds
    maxMemory: number; // MB
    maxCPU: number; // percentage
    maxGPU: number; // percentage
    minThroughput: number; // requests/second
  };

  // WASM optimization
  wasm: {
    enabled: boolean;
    memoryPages: number; // 64KB per page
    enableSIMD: boolean;
    enableThreads: boolean;
    enableBulkMemory: boolean;
    optimizationLevel: 'O0' | 'O1' | 'O2' | 'O3' | 'Os' | 'Oz';
    gcStrategy: 'conservative' | 'aggressive' | 'adaptive';
  };

  // Model quantization
  quantization: {
    enabled: boolean;
    defaultLevel: 'fp32' | 'fp16' | 'int8' | 'int4' | 'mixed';
    dynamicQuantization: boolean;
    accuracyThreshold: number; // minimum acceptable accuracy (0-1)
    compressionTarget: number; // target compression ratio
  };

  // Network optimization
  network: {
    slice: {
      type: 'urllc' | 'embb' | 'mmtc' | 'ai_slice';
      priority: number;
      maxLatency: number;
      minBandwidth: number;
      reliability: number;
      adaptiveBitrate: boolean;
    };
    mec: {
      enabled: boolean;
      maxNodes: number;
      loadBalancing:
        | 'round-robin'
        | 'least-latency'
        | 'least-load'
        | 'carbon-aware';
      cacheStrategy: 'lru' | 'lfu' | 'predictive';
    };
    protocols: {
      http3: boolean;
      quic: boolean;
      webrtc: boolean;
      grpc: boolean;
    };
  };

  // Caching strategy
  cache: {
    enabled: boolean;
    maxSize: number; // MB
    ttl: number; // seconds
    strategy: 'lru' | 'lfu' | 'arc' | 'tinylfu';
    compression: boolean;
    distributed: boolean;
  };

  // Carbon optimization
  carbon: {
    enabled: boolean;
    maxEmissions: number; // gCO2/hour
    minRenewable: number; // percentage
    offsetAutomatic: boolean;
    adaptiveScaling: boolean;
    schedulingStrategy: 'immediate' | 'renewable-aware' | 'cost-optimized';
  };

  // Monitoring and profiling
  monitoring: {
    enabled: boolean;
    sampleRate: number; // samples per second
    retention: number; // hours
    exportFormat: 'json' | 'prometheus' | 'opentelemetry';
    alertThresholds: {
      latency: number;
      memory: number;
      cpu: number;
      errors: number;
    };
  };

  // Advanced optimizations
  optimizations: {
    // Precompilation
    precompile: {
      enabled: boolean;
      targets: string[]; // agent IDs to precompile
      warmupRequests: number;
    };

    // Request batching
    batching: {
      enabled: boolean;
      maxBatchSize: number;
      maxWaitTime: number; // milliseconds
    };

    // Connection pooling
    connectionPool: {
      minConnections: number;
      maxConnections: number;
      idleTimeout: number; // seconds
    };

    // GPU acceleration
    gpu: {
      enabled: boolean;
      framework: 'webgpu' | 'webgl' | 'cuda' | 'metal';
      memoryLimit: number; // MB
      kernelOptimization: boolean;
    };
  };

  // Failover and reliability
  reliability: {
    redundancy: number; // number of backup nodes
    healthCheckInterval: number; // seconds
    failoverThreshold: number; // consecutive failures
    circuitBreaker: {
      enabled: boolean;
      threshold: number; // error percentage
      timeout: number; // seconds
      halfOpenRequests: number;
    };
  };
}

// Default configuration for sub-10ms latency
export const defaultPerformanceConfig: PerformanceConfig = {
  targets: {
    maxLatency: 10,
    maxMemory: 50,
    maxCPU: 70,
    maxGPU: 80,
    minThroughput: 1000,
  },

  wasm: {
    enabled: true,
    memoryPages: 256, // 16MB initial
    enableSIMD: true,
    enableThreads: true,
    enableBulkMemory: true,
    optimizationLevel: 'O3',
    gcStrategy: 'adaptive',
  },

  quantization: {
    enabled: true,
    defaultLevel: 'int8',
    dynamicQuantization: true,
    accuracyThreshold: 0.97,
    compressionTarget: 4,
  },

  network: {
    slice: {
      type: 'urllc',
      priority: 10,
      maxLatency: 1,
      minBandwidth: 1000,
      reliability: 99.999,
      adaptiveBitrate: true,
    },
    mec: {
      enabled: true,
      maxNodes: 5,
      loadBalancing: 'least-latency',
      cacheStrategy: 'predictive',
    },
    protocols: {
      http3: true,
      quic: true,
      webrtc: false,
      grpc: true,
    },
  },

  cache: {
    enabled: true,
    maxSize: 100,
    ttl: 3600,
    strategy: 'tinylfu',
    compression: true,
    distributed: true,
  },

  carbon: {
    enabled: true,
    maxEmissions: 50,
    minRenewable: 80,
    offsetAutomatic: true,
    adaptiveScaling: true,
    schedulingStrategy: 'renewable-aware',
  },

  monitoring: {
    enabled: true,
    sampleRate: 100,
    retention: 24,
    exportFormat: 'opentelemetry',
    alertThresholds: {
      latency: 15,
      memory: 45,
      cpu: 80,
      errors: 1,
    },
  },

  optimizations: {
    precompile: {
      enabled: true,
      targets: [],
      warmupRequests: 10,
    },
    batching: {
      enabled: true,
      maxBatchSize: 10,
      maxWaitTime: 5,
    },
    connectionPool: {
      minConnections: 5,
      maxConnections: 50,
      idleTimeout: 300,
    },
    gpu: {
      enabled: true,
      framework: 'webgpu',
      memoryLimit: 2048,
      kernelOptimization: true,
    },
  },

  reliability: {
    redundancy: 3,
    healthCheckInterval: 5,
    failoverThreshold: 3,
    circuitBreaker: {
      enabled: true,
      threshold: 50,
      timeout: 30,
      halfOpenRequests: 5,
    },
  },
};

// Preset configurations for different scenarios
export const performancePresets = {
  // Ultra-low latency for critical applications
  ultraLowLatency: {
    ...defaultPerformanceConfig,
    targets: {
      ...defaultPerformanceConfig.targets,
      maxLatency: 5,
    },
    network: {
      ...defaultPerformanceConfig.network,
      slice: {
        ...defaultPerformanceConfig.network.slice,
        maxLatency: 0.5,
        minBandwidth: 10000,
      },
    },
  },

  // Maximum energy efficiency
  greenComputing: {
    ...defaultPerformanceConfig,
    carbon: {
      ...defaultPerformanceConfig.carbon,
      maxEmissions: 20,
      minRenewable: 95,
      schedulingStrategy: 'renewable-aware',
    },
    optimizations: {
      ...defaultPerformanceConfig.optimizations,
      gpu: {
        ...defaultPerformanceConfig.optimizations.gpu,
        enabled: false, // Disable GPU to save power
      },
    },
  },

  // High throughput for batch processing
  highThroughput: {
    ...defaultPerformanceConfig,
    targets: {
      ...defaultPerformanceConfig.targets,
      maxLatency: 50,
      minThroughput: 10000,
    },
    optimizations: {
      ...defaultPerformanceConfig.optimizations,
      batching: {
        enabled: true,
        maxBatchSize: 100,
        maxWaitTime: 20,
      },
    },
  },

  // Minimal footprint for IoT devices
  edgeIoT: {
    ...defaultPerformanceConfig,
    targets: {
      ...defaultPerformanceConfig.targets,
      maxMemory: 10,
    },
    quantization: {
      ...defaultPerformanceConfig.quantization,
      defaultLevel: 'int4',
      compressionTarget: 8,
    },
    cache: {
      ...defaultPerformanceConfig.cache,
      maxSize: 5,
    },
  },
};

// Performance tuning recommendations based on metrics
export function getPerformanceTuning(metrics: {
  avgLatency: number;
  memoryUsage: number;
  cpuUsage: number;
  cacheHitRate: number;
}): Partial<PerformanceConfig> {
  const tuning: Partial<PerformanceConfig> = {};

  // Tune based on latency
  if (metrics.avgLatency > 10) {
    tuning.quantization = {
      ...defaultPerformanceConfig.quantization,
      defaultLevel: 'int4', // More aggressive quantization
    };
    tuning.network = {
      ...defaultPerformanceConfig.network,
      mec: {
        ...defaultPerformanceConfig.network.mec,
        loadBalancing: 'least-latency',
      },
    };
  }

  // Tune based on memory
  if (metrics.memoryUsage > 40) {
    tuning.cache = {
      ...defaultPerformanceConfig.cache,
      maxSize: 50, // Reduce cache size
      strategy: 'lru', // Simpler strategy
    };
    tuning.wasm = {
      ...defaultPerformanceConfig.wasm,
      gcStrategy: 'aggressive',
    };
  }

  // Tune based on CPU
  if (metrics.cpuUsage > 70) {
    tuning.optimizations = {
      ...defaultPerformanceConfig.optimizations,
      batching: {
        enabled: true,
        maxBatchSize: 20,
        maxWaitTime: 10,
      },
    };
  }

  // Tune based on cache performance
  if (metrics.cacheHitRate < 0.5) {
    tuning.cache = {
      ...defaultPerformanceConfig.cache,
      strategy: 'predictive',
      maxSize: 200, // Increase cache
    };
  }

  return tuning;
}

// Export configuration loader
export function loadPerformanceConfig(
  preset?: keyof typeof performancePresets,
  overrides?: Partial<PerformanceConfig>
): PerformanceConfig {
  const base = preset ? performancePresets[preset] : defaultPerformanceConfig;

  return {
    ...base,
    ...overrides,
    targets: { ...base.targets, ...overrides?.targets },
    wasm: { ...base.wasm, ...overrides?.wasm },
    quantization: { ...base.quantization, ...overrides?.quantization },
    network: {
      ...base.network,
      ...overrides?.network,
      slice: { ...base.network.slice, ...overrides?.network?.slice },
      mec: { ...base.network.mec, ...overrides?.network?.mec },
      protocols: {
        ...base.network.protocols,
        ...overrides?.network?.protocols,
      },
    },
    cache: { ...base.cache, ...overrides?.cache },
    carbon: { ...base.carbon, ...overrides?.carbon },
    monitoring: {
      ...base.monitoring,
      ...overrides?.monitoring,
      alertThresholds: {
        ...base.monitoring.alertThresholds,
        ...overrides?.monitoring?.alertThresholds,
      },
    },
    optimizations: {
      ...base.optimizations,
      ...overrides?.optimizations,
      precompile: {
        ...base.optimizations.precompile,
        ...overrides?.optimizations?.precompile,
      },
      batching: {
        ...base.optimizations.batching,
        ...overrides?.optimizations?.batching,
      },
      connectionPool: {
        ...base.optimizations.connectionPool,
        ...overrides?.optimizations?.connectionPool,
      },
      gpu: { ...base.optimizations.gpu, ...overrides?.optimizations?.gpu },
    },
    reliability: {
      ...base.reliability,
      ...overrides?.reliability,
      circuitBreaker: {
        ...base.reliability.circuitBreaker,
        ...overrides?.reliability?.circuitBreaker,
      },
    },
  };
}
