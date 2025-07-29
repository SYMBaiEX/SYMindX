// Performance test specific setup
import { performance } from 'perf_hooks';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  agentCreation: 100, // ms
  messageProcessing: 500, // ms
  memoryOperation: 50, // ms
  contextEnrichment: 200, // ms
  eventBusDispatch: 10, // ms
};

// Performance tracking
const performanceMetrics = new Map<string, number[]>();

// Performance test utilities
global.performanceTestUtils = {
  thresholds: PERFORMANCE_THRESHOLDS,
  
  // Start timing an operation
  startTimer: (label: string) => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      
      if (!performanceMetrics.has(label)) {
        performanceMetrics.set(label, []);
      }
      performanceMetrics.get(label)!.push(duration);
      
      return duration;
    };
  },
  
  // Measure async operation
  measureAsync: async <T>(label: string, operation: () => Promise<T>): Promise<[T, number]> => {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    
    if (!performanceMetrics.has(label)) {
      performanceMetrics.set(label, []);
    }
    performanceMetrics.get(label)!.push(duration);
    
    return [result, duration];
  },
  
  // Get metrics for a label
  getMetrics: (label: string) => {
    const values = performanceMetrics.get(label) || [];
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  },
  
  // Assert performance threshold
  assertPerformance: (label: string, threshold: number, percentile: 'mean' | 'p95' | 'p99' = 'p95') => {
    const metrics = global.performanceTestUtils.getMetrics(label);
    if (!metrics) {
      throw new Error(`No metrics found for label: ${label}`);
    }
    
    const value = metrics[percentile];
    if (value > threshold) {
      throw new Error(
        `Performance threshold exceeded for ${label}: ${value.toFixed(2)}ms > ${threshold}ms (${percentile})`
      );
    }
  },
  
  // Memory usage tracking
  getMemoryUsage: () => {
    if (global.gc) global.gc(); // Force garbage collection if available
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024), // MB
    };
  },
  
  // CPU usage tracking
  getCPUUsage: () => {
    const usage = process.cpuUsage();
    return {
      user: Math.round(usage.user / 1000), // ms
      system: Math.round(usage.system / 1000), // ms
    };
  },
  
  // Generate load
  generateLoad: async (config: {
    agents: number;
    messagesPerAgent: number;
    concurrency: number;
  }) => {
    const { agents, messagesPerAgent, concurrency } = config;
    const results = [];
    
    // Process in batches
    for (let i = 0; i < agents; i += concurrency) {
      const batch = Array.from({ length: Math.min(concurrency, agents - i) }, async (_, j) => {
        const agentId = `load-test-agent-${i + j}`;
        // Implementation depends on actual agent creation
        return { agentId, messages: messagesPerAgent };
      });
      
      results.push(...await Promise.all(batch));
    }
    
    return results;
  },
};

// Reset metrics after each test
afterEach(() => {
  performanceMetrics.clear();
});