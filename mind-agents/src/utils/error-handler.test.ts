/**
 * @module error-handler.test
 * @description Error Handler Test Suite - Comprehensive tests for error handling and recovery
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import {
  ErrorHandler,
  ErrorSeverity,
  ErrorCategory,
  RecoveryStrategy,
  createValidationError,
  createNetworkError,
  createConfigurationError,
  createSystemError,
  handleErrors,
} from './error-handler.js';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance({
      retryAttempts: 2,
      retryDelay: 100,
      enableLogging: false, // Disable logging for tests
      enableMetrics: true,
    });
    errorHandler.resetMetrics();
  });

  describe('Error Creation', () => {
    it('should create structured error information', () => {
      const error = errorHandler.createError(
        'Test error',
        'TEST_ERROR',
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        { field: 'testField' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.id).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.context).toEqual({ field: 'testField' });
      expect(error.recoveryStrategy).toBe(RecoveryStrategy.NONE);
    });

    it('should include stack trace from cause error', () => {
      const causeError = new Error('Original error');
      const error = errorHandler.createError(
        'Wrapped error',
        'WRAPPED_ERROR',
        ErrorCategory.RUNTIME,
        ErrorSeverity.HIGH,
        {},
        causeError
      );

      expect(error.cause).toBe(causeError);
      expect(error.stack).toBe(causeError.stack);
    });

    it('should determine appropriate recovery strategy', () => {
      const networkError = errorHandler.createError(
        'Network failed',
        'NETWORK_ERROR',
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH
      );

      const configError = errorHandler.createError(
        'Config invalid',
        'CONFIG_ERROR',
        ErrorCategory.CONFIGURATION,
        ErrorSeverity.MEDIUM
      );

      const criticalError = errorHandler.createError(
        'Critical failure',
        'CRITICAL_ERROR',
        ErrorCategory.SYSTEM,
        ErrorSeverity.CRITICAL
      );

      expect(networkError.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(configError.recoveryStrategy).toBe(RecoveryStrategy.FALLBACK);
      expect(criticalError.recoveryStrategy).toBe(RecoveryStrategy.RESTART);
    });
  });

  describe('Error Handling with Recovery', () => {
    it('should handle successful operation without error', async () => {
      const successfulOperation = mock(async () => 'success');
      const error = errorHandler.createError(
        'Test error',
        'TEST_ERROR',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      );

      const result = await errorHandler.handleError(error, successfulOperation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(successfulOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry failed operations', async () => {
      let attemptCount = 0;
      const retryableOperation = mock(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Temporary failure');
        }
        return 'success after retry';
      });

      const error = errorHandler.createError(
        'Network error',
        'NETWORK_ERROR',
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH
      );

      const result = await errorHandler.handleError(error, retryableOperation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success after retry');
      expect(retryableOperation).toHaveBeenCalledTimes(2);
      expect(result.metadata?.recovery?.strategy).toBe(RecoveryStrategy.RETRY);
      expect(result.metadata?.recovery?.attempts).toBe(2);
    });

    it('should fail after exhausting retry attempts', async () => {
      const failingOperation = mock(async () => {
        throw new Error('Persistent failure');
      });

      const error = errorHandler.createError(
        'Network error',
        'NETWORK_ERROR',
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH
      );

      const result = await errorHandler.handleError(error, failingOperation);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Recovery failed');
      expect(failingOperation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should handle graceful degradation', async () => {
      const degradableOperation = mock(async () => {
        throw new Error('Service unavailable');
      });

      const error = errorHandler.createError(
        'Resource error',
        'RESOURCE_ERROR',
        ErrorCategory.RESOURCE,
        ErrorSeverity.MEDIUM
      );

      const result = await errorHandler.handleError(error, degradableOperation);

      expect(result.success).toBe(true); // Graceful degradation succeeds
      expect(result.metadata?.recovery?.strategy).toBe(RecoveryStrategy.GRACEFUL_DEGRADATION);
    });
  });

  describe('Function Wrapping', () => {
    it('should wrap function with error handling', async () => {
      const originalFunction = mock(async (value: number) => {
        if (value < 0) {
          throw new Error('Negative value not allowed');
        }
        return value * 2;
      });

      const wrappedFunction = errorHandler.wrap(originalFunction, { operation: 'multiply' });

      // Test successful call
      const result1 = await wrappedFunction(5);
      expect(result1).toBe(10);

      // Test error handling
      await expect(wrappedFunction(-1)).rejects.toThrow();
    });

    it('should preserve function signature when wrapping', async () => {
      const originalFunction = async (a: number, b: string, c: boolean) => {
        return { a, b, c };
      };

      const wrappedFunction = errorHandler.wrap(originalFunction);
      const result = await wrappedFunction(1, 'test', true);

      expect(result).toEqual({ a: 1, b: 'test', c: true });
    });
  });

  describe('Validation', () => {
    it('should validate configuration successfully', () => {
      const validConfig = {
        name: 'TestConfig',
        port: 8080,
        enabled: true,
        apiKeys: {
          openai: 'sk-test-key',
          groq: 'gsk-test-key',
        },
      };

      const result = errorHandler.validateConfig(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should detect configuration errors', () => {
      const invalidConfig = {
        // Missing name
        port: -1, // Invalid port
        enabled: 'yes', // Should be boolean
        timeout: 'fast', // Should be number
      };

      const result = errorHandler.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Configuration must have a valid name');
      expect(result.errors).toContain("Field 'port' must be a positive number");
      expect(result.errors).toContain("Field 'enabled' must be a boolean");
    });

    it('should detect warnings for empty API keys', () => {
      const configWithEmptyKeys = {
        name: 'TestConfig',
        apiKeys: {
          openai: '',
          groq: 'valid-key',
        },
      };

      const result = errorHandler.validateConfig(configWithEmptyKeys);

      expect(result.valid).toBe(true); // No errors, just warnings
      expect(result.warnings).toContain("API key 'openai' is empty or invalid");
      expect(result.warnings).not.toContain("API key 'groq' is empty or invalid");
    });
  });

  describe('Circuit Breaker', () => {
    it('should track failure count and open circuit', async () => {
      const failingOperation = mock(async () => {
        throw new Error('Service down');
      });

      const error = errorHandler.createError(
        'Service error',
        'SERVICE_ERROR',
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH
      );

      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await errorHandler.handleError(error, failingOperation);
      }

      const status = errorHandler.getCircuitBreakerStatus('test-operation');
      expect(status.failureCount).toBeGreaterThan(0);
    });

    it('should prevent execution when circuit is open', async () => {
      const operation = mock(async () => 'should not execute');

      // Simulate circuit breaker being open by creating handler with low threshold
      const testHandler = ErrorHandler.getInstance({
        circuitBreakerThreshold: 1,
        circuitBreakerTimeout: 1000,
      });

      const error = testHandler.createError(
        'Service error',
        'SERVICE_ERROR',
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH
      );

      // First failure should open the circuit
      await testHandler.handleError(error, async () => {
        throw new Error('Failure');
      });

      // Second attempt should be blocked
      const result = await testHandler.handleError(error, operation);
      expect(result.success).toBe(false);
      expect(result.metadata?.recovery?.strategy).toBe(RecoveryStrategy.CIRCUIT_BREAKER);
    });
  });

  describe('Metrics', () => {
    it('should collect error metrics', () => {
      errorHandler.createError(
        'Error 1',
        'ERROR_1',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      );

      errorHandler.createError(
        'Error 2',
        'ERROR_1',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      );

      errorHandler.createError(
        'Error 3',
        'ERROR_2',
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH
      );

      const metrics = errorHandler.getMetrics();

      expect(metrics['validation:ERROR_1'].count).toBe(2);
      expect(metrics['network:ERROR_2'].count).toBe(1);
      expect(metrics['validation:ERROR_1'].severity).toBe(ErrorSeverity.LOW);
      expect(metrics['network:ERROR_2'].severity).toBe(ErrorSeverity.HIGH);
    });

    it('should reset metrics', () => {
      errorHandler.createError(
        'Test error',
        'TEST_ERROR',
        ErrorCategory.SYSTEM,
        ErrorSeverity.MEDIUM
      );

      expect(Object.keys(errorHandler.getMetrics())).toHaveLength(1);

      errorHandler.resetMetrics();

      expect(Object.keys(errorHandler.getMetrics())).toHaveLength(0);
    });
  });

  describe('Convenience Functions', () => {
    it('should create validation error', () => {
      const error = createValidationError('Invalid input', { field: 'email' });

      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.message).toBe('Invalid input');
      expect(error.context).toEqual({ field: 'email' });
    });

    it('should create network error', () => {
      const error = createNetworkError('Connection timeout');

      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.message).toBe('Connection timeout');
    });

    it('should create configuration error', () => {
      const error = createConfigurationError('Missing API key');

      expect(error.category).toBe(ErrorCategory.CONFIGURATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.message).toBe('Missing API key');
    });

    it('should create system error', () => {
      const error = createSystemError('Database connection failed');

      expect(error.category).toBe(ErrorCategory.SYSTEM);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.message).toBe('Database connection failed');
    });
  });

  describe('Error Decorator', () => {
    class TestService {
      @handleErrors(ErrorCategory.VALIDATION, ErrorSeverity.LOW)
      async validateInput(input: string): Promise<string> {
        if (!input) {
          throw new Error('Input is required');
        }
        return input.toUpperCase();
      }

      @handleErrors()
      async processData(data: any): Promise<any> {
        if (data.shouldFail) {
          throw new Error('Processing failed');
        }
        return { processed: data };
      }
    }

    it('should handle errors in decorated methods', async () => {
      const service = new TestService();

      // Test successful call
      const result = await service.validateInput('test');
      expect(result).toBe('TEST');

      // Test error handling
      await expect(service.validateInput('')).rejects.toThrow();
    });

    it('should apply default error category and severity', async () => {
      const service = new TestService();

      await expect(service.processData({ shouldFail: true })).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle high error throughput', () => {
      const startTime = Date.now();

      // Create many errors rapidly
      for (let i = 0; i < 100; i++) {
        errorHandler.createError(
          `Error ${i}`,
          'BATCH_ERROR',
          ErrorCategory.RUNTIME,
          ErrorSeverity.LOW
        );
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(Object.keys(errorHandler.getMetrics())).toHaveLength(1);
      expect(errorHandler.getMetrics()['runtime:BATCH_ERROR'].count).toBe(100);
    });

    it('should handle concurrent error operations', async () => {
      const operations = [];

      for (let i = 0; i < 10; i++) {
        const operation = async () => {
          const error = errorHandler.createError(
            `Concurrent error ${i}`,
            'CONCURRENT_ERROR',
            ErrorCategory.RUNTIME,
            ErrorSeverity.LOW
          );

          return errorHandler.handleError(error, async () => `result-${i}`);
        };

        operations.push(operation());
      }

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.data).toBe(`result-${index}`);
      });
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with many errors', () => {
      const initialMetrics = Object.keys(errorHandler.getMetrics()).length;

      // Create many different error types
      for (let i = 0; i < 50; i++) {
        errorHandler.createError(
          `Memory test error ${i}`,
          `ERROR_${i}`,
          ErrorCategory.RUNTIME,
          ErrorSeverity.LOW
        );
      }

      const metrics = errorHandler.getMetrics();
      expect(Object.keys(metrics)).toHaveLength(initialMetrics + 50);

      // Reset should clear memory
      errorHandler.resetMetrics();
      expect(Object.keys(errorHandler.getMetrics())).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => {
        errorHandler.createError(
          null as any,
          'NULL_ERROR',
          ErrorCategory.VALIDATION,
          ErrorSeverity.LOW
        );
      }).not.toThrow();

      expect(() => {
        errorHandler.createError(
          'Test',
          undefined as any,
          ErrorCategory.VALIDATION,
          ErrorSeverity.LOW
        );
      }).not.toThrow();
    });

    it('should handle circular references in context', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => {
        errorHandler.createError(
          'Circular reference test',
          'CIRCULAR_ERROR',
          ErrorCategory.VALIDATION,
          ErrorSeverity.LOW,
          circularObj
        );
      }).not.toThrow();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);

      const error = errorHandler.createError(
        longMessage,
        'LONG_MESSAGE_ERROR',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      );

      expect(error.message).toHaveLength(10000);
      expect(error.id).toBeDefined();
    });
  });
});