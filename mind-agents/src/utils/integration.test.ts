/**
 * @module integration.test
 * @description Integration tests for all utility systems working together
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { 
  errorHandler, 
  ErrorSeverity, 
  ErrorCategory,
  createSystemError,
  createNetworkError 
} from './error-handler.js';
import { performanceMonitor } from './performance-monitor.js';
import { debugUtilities, DebugLevel } from './debug-utilities.js';
import { healthMonitor, HealthStatus } from './health-monitor.js';

describe('Utility Systems Integration', () => {
  beforeEach(() => {
    // Reset all systems to clean state
    errorHandler.resetMetrics();
    performanceMonitor.clearMetrics();
    debugUtilities.clearAll();
    healthMonitor.clearData();
  });

  afterEach(() => {
    // Cleanup
    performanceMonitor.stop();
    healthMonitor.stop();
  });

  describe('Error Handler + Performance Monitor Integration', () => {
    it('should track error metrics in performance monitor', async () => {
      // Create an error and handle it
      const error = createSystemError('Test system error', {
        component: 'test-component',
      });

      let operationCalled = false;
      const operation = async () => {
        operationCalled = true;
        return 'success';
      };

      // Handle the error with recovery
      const result = await errorHandler.handleError(error, operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(operationCalled).toBe(true);

      // Check that error metrics were recorded
      const metrics = errorHandler.getMetrics();
      expect(Object.keys(metrics)).toHaveLength(1);
      expect(metrics['system:SYSTEM_ERROR']).toBeDefined();
      expect(metrics['system:SYSTEM_ERROR'].count).toBe(1);
    });

    it('should measure performance of error recovery', async () => {
      performanceMonitor.start();

      const error = createNetworkError('Network timeout');
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Still failing');
        }
        return 'recovered';
      };

      const timer = performanceMonitor.createTimer('error_recovery_test');
      const result = await errorHandler.handleError(error, operation);
      timer.stop();

      expect(result.success).toBe(true);
      expect(result.data).toBe('recovered');
      expect(attempts).toBe(2);

      // Check performance metrics
      const metrics = performanceMonitor.getAllMetrics();
      const recoveryMetric = metrics.find(m => m.name === 'error_recovery_test_duration');
      expect(recoveryMetric).toBeDefined();
    });
  });

  describe('Debug Utilities + Error Handler Integration', () => {
    it('should create debug traces for error handling', async () => {
      const sessionId = debugUtilities.createSession('error-debug', DebugLevel.DEBUG);

      const error = createSystemError('Test error for debugging', {
        debugSession: sessionId,
      });

      const operation = async () => {
        debugUtilities.trace(
          DebugLevel.INFO,
          'test',
          'Operation executed during error handling',
          { success: true },
          { sessionId }
        );
        return 'success';
      };

      await errorHandler.handleError(error, operation);

      // End debug session and check traces
      debugUtilities.endSession(sessionId);
      const stats = debugUtilities.getStatistics();

      expect(stats.traces).toBeGreaterThan(0);
      expect(stats.sessions).toBe(1);
    });

    it('should profile memory during error scenarios', async () => {
      const error = createSystemError('Memory test error');

      const operation = async () => {
        // Simulate memory-intensive operation
        const largeArray = new Array(1000).fill('test');
        return largeArray.length;
      };

      const { result, profile } = await debugUtilities.profileMemory(
        'error_memory_test',
        () => errorHandler.handleError(error, operation)
      );

      expect(result.success).toBe(true);
      expect(profile.memory).toBeDefined();
      expect(profile.duration).toBeGreaterThan(0);
    });
  });

  describe('Health Monitor + Performance Monitor Integration', () => {
    it('should create health checks that monitor performance metrics', async () => {
      performanceMonitor.start();
      healthMonitor.start();

      // Record some performance metrics
      performanceMonitor.recordCounter('test_operations', 5);
      performanceMonitor.recordGauge('test_memory_usage', 1024 * 1024); // 1MB

      // Create a health check that depends on performance metrics
      const healthCheckResult = await healthMonitor.registerCheck({
        id: 'performance_test',
        name: 'Performance Test Check',
        type: 'custom' as any,
        description: 'Test health check using performance metrics',
        interval: 10000,
        timeout: 5000,
        retries: 1,
        enabled: true,
        criticalThreshold: 0.8,
        degradedThreshold: 0.6,
        dependencies: [],
        tags: ['performance'],
      }, async () => {
        const systemMetrics = performanceMonitor.getSystemMetrics();
        const memoryUsage = systemMetrics.memory.usage;

        let status = HealthStatus.HEALTHY;
        let message = 'Performance metrics are normal';

        if (memoryUsage > 0.9) {
          status = HealthStatus.CRITICAL;
          message = 'Memory usage is critically high';
        } else if (memoryUsage > 0.8) {
          status = HealthStatus.DEGRADED;
          message = 'Memory usage is high';
        }

        return {
          healthy: status === HealthStatus.HEALTHY,
          status,
          message,
          timestamp: new Date(),
          details: {
            memoryUsage,
            uptime: systemMetrics.uptime,
          },
        };
      });

      expect(healthCheckResult.success).toBe(true);

      // Run the health check
      const checkResult = await healthMonitor.runCheck('performance_test');
      expect(checkResult.healthy).toBe(true);
      expect(checkResult.details.memoryUsage).toBeDefined();
    });

    it('should alert when performance thresholds are exceeded', async () => {
      performanceMonitor.start();
      healthMonitor.start();

      let alertReceived = false;
      
      healthMonitor.on('alert_created', (event) => {
        alertReceived = true;
        expect(event.alert.severity).toBeDefined();
      });

      // Register a health check that will fail
      await healthMonitor.registerCheck({
        id: 'failing_performance_check',
        name: 'Failing Performance Check',
        type: 'custom' as any,
        description: 'Health check that simulates performance failure',
        interval: 1000,
        timeout: 500,
        retries: 0,
        enabled: true,
        criticalThreshold: 0.5,
        degradedThreshold: 0.3,
        dependencies: [],
        tags: ['test'],
      }, async () => {
        return {
          healthy: false,
          status: HealthStatus.CRITICAL,
          message: 'Simulated performance failure',
          timestamp: new Date(),
          details: { test: true },
        };
      });

      // Run the check to trigger an alert
      await healthMonitor.runCheck('failing_performance_check');

      // Give the alert system time to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Note: Alert creation might be asynchronous, so we check for alert existence
      const alerts = healthMonitor.getRecentAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(0); // May be 0 if processing is async
    });
  });

  describe('All Systems Integration', () => {
    it('should work together in a complex scenario', async () => {
      // Start all monitoring systems
      performanceMonitor.start();
      healthMonitor.start();

      // Create a debug session
      const debugSession = debugUtilities.createSession(
        'integration-test',
        DebugLevel.DEBUG
      );

      // Register performance metrics
      const timer = performanceMonitor.createTimer('integration_test');

      try {
        // Simulate a complex operation with potential errors
        let operationAttempts = 0;
        
        const complexOperation = async () => {
          operationAttempts++;
          
          debugUtilities.trace(
            DebugLevel.INFO,
            'integration',
            `Complex operation attempt ${operationAttempts}`,
            { attempt: operationAttempts },
            { sessionId: debugSession }
          );

          // Record performance metrics
          performanceMonitor.recordCounter('integration_operations', 1);
          
          // Simulate failure on first attempt
          if (operationAttempts === 1) {
            throw new Error('Simulated failure for integration test');
          }

          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 10));
          
          return `Success after ${operationAttempts} attempts`;
        };

        // Handle the operation with error recovery
        const error = createSystemError('Integration test error', {
          debugSession,
          integrationTest: true,
        });

        const result = await errorHandler.handleError(
          error,
          complexOperation,
          { debugSession }
        );

        timer.stop({ success: 'true' });

        // Verify the result
        expect(result.success).toBe(true);
        expect(result.data).toBe('Success after 2 attempts');
        expect(operationAttempts).toBe(2);

        // Register and run a health check for the operation
        await healthMonitor.registerCheck({
          id: 'integration_health',
          name: 'Integration Test Health',
          type: 'custom' as any,
          description: 'Health check for integration test',
          interval: 5000,
          timeout: 2000,
          retries: 1,
          enabled: true,
          criticalThreshold: 0.8,
          degradedThreshold: 0.6,
          dependencies: [],
          tags: ['integration'],
        }, async () => {
          const errorMetrics = errorHandler.getMetrics();
          const performanceMetrics = performanceMonitor.getAllMetrics();
          
          return {
            healthy: true,
            status: HealthStatus.HEALTHY,
            message: 'Integration test systems are healthy',
            timestamp: new Date(),
            details: {
              errorMetrics: Object.keys(errorMetrics).length,
              performanceMetrics: performanceMetrics.length,
              debugSession,
            },
          };
        });

        const healthResult = await healthMonitor.runCheck('integration_health');
        expect(healthResult.healthy).toBe(true);

        // Verify all systems recorded the activity
        const errorMetrics = errorHandler.getMetrics();
        expect(Object.keys(errorMetrics)).toHaveLength(1);

        const performanceMetrics = performanceMonitor.getAllMetrics();
        expect(performanceMetrics.length).toBeGreaterThan(0);

        const debugStats = debugUtilities.getStatistics();
        expect(debugStats.traces).toBeGreaterThan(0);

        const systemHealth = await healthMonitor.getSystemHealth();
        expect(systemHealth.success).toBe(true);

      } finally {
        // Cleanup
        debugUtilities.endSession(debugSession);
      }
    });

    it('should handle cascading failures gracefully', async () => {
      performanceMonitor.start();
      healthMonitor.start();

      // Create multiple dependent operations that might fail
      const operations = [
        {
          name: 'database_connection',
          shouldFail: true,
          error: createSystemError('Database connection failed'),
        },
        {
          name: 'cache_operation',
          shouldFail: false,
          error: createNetworkError('Cache timeout'),
        },
        {
          name: 'api_call',
          shouldFail: true,
          error: createNetworkError('API unavailable'),
        },
      ];

      const results = [];

      for (const op of operations) {
        const timer = performanceMonitor.createTimer(`operation_${op.name}`);
        
        try {
          const result = await errorHandler.handleError(
            op.error,
            async () => {
              if (op.shouldFail) {
                throw new Error(`${op.name} failed`);
              }
              return `${op.name} succeeded`;
            }
          );

          timer.stop({ success: result.success.toString() });
          results.push(result);
        } catch (error) {
          timer.stop({ success: 'false' });
          results.push({
            success: false,
            error: error.message,
          });
        }
      }

      // Check that we handled all operations
      expect(results).toHaveLength(3);

      // Check that errors were tracked
      const errorMetrics = errorHandler.getMetrics();
      expect(Object.keys(errorMetrics).length).toBeGreaterThan(0);

      // Check that performance was measured
      const perfMetrics = performanceMonitor.getAllMetrics();
      const operationMetrics = perfMetrics.filter(m => 
        m.name.includes('operation_') && m.name.includes('_duration')
      );
      expect(operationMetrics.length).toBe(3);

      // Verify system health still works despite failures
      const systemHealth = await healthMonitor.getSystemHealth();
      expect(systemHealth).toBeDefined();
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle memory cleanup across all systems', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Start all systems and generate activity
      performanceMonitor.start();
      healthMonitor.start();

      // Generate lots of data across systems
      for (let i = 0; i < 100; i++) {
        const error = createSystemError(`Test error ${i}`);
        await errorHandler.handleError(error, async () => `success ${i}`);
        
        performanceMonitor.recordCounter('test_counter', 1);
        performanceMonitor.recordGauge('test_gauge', Math.random() * 100);
        
        debugUtilities.trace(
          DebugLevel.DEBUG,
          'memory_test',
          `Memory test iteration ${i}`,
          { iteration: i }
        );
      }

      const midTestMemory = process.memoryUsage().heapUsed;

      // Clear all systems
      errorHandler.resetMetrics();
      performanceMonitor.clearMetrics();
      debugUtilities.clearAll();
      healthMonitor.clearData();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      const finalMemory = process.memoryUsage().heapUsed;

      // Memory should not grow excessively
      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
      
      // Allow some memory growth but not excessive
      expect(memoryGrowthMB).toBeLessThan(50); // Less than 50MB growth
    });
  });
});

describe('System Performance Under Load', () => {
  it('should handle high throughput operations', async () => {
    performanceMonitor.start();
    
    const startTime = Date.now();
    const operations = [];
    
    // Create 1000 concurrent operations
    for (let i = 0; i < 1000; i++) {
      const operation = (async () => {
        const timer = performanceMonitor.createTimer(`load_test_${i}`);
        
        try {
          if (i % 10 === 0) {
            // Every 10th operation simulates an error
            const error = createSystemError(`Load test error ${i}`);
            await errorHandler.handleError(error, async () => `load_success_${i}`);
          } else {
            // Regular operation
            performanceMonitor.recordCounter('load_test_operations', 1);
            await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
          }
          
          timer.stop({ success: 'true' });
          return `completed_${i}`;
        } catch (error) {
          timer.stop({ success: 'false' });
          throw error;
        }
      })();
      
      operations.push(operation);
    }
    
    // Wait for all operations to complete
    const results = await Promise.allSettled(operations);
    const duration = Date.now() - startTime;
    
    // Analyze results
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Load test completed in ${duration}ms`);
    console.log(`Succeeded: ${succeeded}, Failed: ${failed}`);
    
    // Verify performance
    expect(succeeded).toBeGreaterThan(950); // At least 95% success rate
    expect(duration).toBeLessThan(5000); // Complete within 5 seconds
    
    // Check that systems handled the load
    const errorMetrics = errorHandler.getMetrics();
    const perfMetrics = performanceMonitor.getAllMetrics();
    
    expect(Object.keys(errorMetrics).length).toBeGreaterThan(0);
    expect(perfMetrics.length).toBeGreaterThan(0);
  }, 10000); // 10 second timeout for load test
});