/**
 * Tests for the standard error handling system
 */

import {
  SYMindXError,
  RuntimeError,
  PortalError,
  ExtensionError,
  ConfigurationError,
  createRuntimeError,
  createPortalError,
  safeAsync,
  safeSync,
  formatError,
  isSYMindXError,
  isErrorOfType,
} from './standard-errors.js';
import { ErrorCategory, ErrorSeverity } from './error-handler.js';

describe('Standard Errors', () => {
  describe('Error Creation', () => {
    test('should create runtime error with correct properties', () => {
      const error = createRuntimeError(
        'Test runtime error',
        'TEST_ERROR',
        { testContext: true },
        new Error('Original error')
      );

      expect(error).toBeInstanceOf(RuntimeError);
      expect(error).toBeInstanceOf(SYMindXError);
      expect(error.message).toBe('Test runtime error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.category).toBe(ErrorCategory.RUNTIME);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.context).toEqual({ testContext: true });
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    test('should create portal error with portal-specific properties', () => {
      const error = createPortalError(
        'Portal connection failed',
        'openai',
        'gpt-4',
        'PORTAL_CONNECTION_ERROR',
        { requestId: '123' }
      );

      expect(error).toBeInstanceOf(PortalError);
      expect(error.portalType).toBe('openai');
      expect(error.model).toBe('gpt-4');
      expect(error.category).toBe(ErrorCategory.SYSTEM);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('Error Utilities', () => {
    test('should format errors consistently', () => {
      const error = createRuntimeError('Test error', 'TEST_CODE');
      const formatted = formatError(error);

      expect(formatted).toContain('[TEST_CODE]');
      expect(formatted).toContain('Test error');
      expect(formatted).toContain('runtime:medium');
    });

    test('should identify SYMindX errors', () => {
      const symindxError = createRuntimeError('Test');
      const regularError = new Error('Regular');

      expect(isSYMindXError(symindxError)).toBe(true);
      expect(isSYMindXError(regularError)).toBe(false);
    });

    test('should identify error types', () => {
      const runtimeError = createRuntimeError('Test');
      const portalError = createPortalError('Test', 'openai');

      expect(isErrorOfType(runtimeError, RuntimeError)).toBe(true);
      expect(isErrorOfType(runtimeError, PortalError)).toBe(false);
      expect(isErrorOfType(portalError, PortalError)).toBe(true);
      expect(isErrorOfType(portalError, RuntimeError)).toBe(false);
    });
  });

  describe('Safe Operations', () => {
    test('should handle successful async operations', async () => {
      const { data, error } = await safeAsync(async () => {
        return 'success';
      });

      expect(data).toBe('success');
      expect(error).toBeUndefined();
    });

    test('should handle failed async operations', async () => {
      const { data, error } = await safeAsync(
        async () => {
          throw new Error('Test failure');
        },
        (err) =>
          createRuntimeError('Operation failed', 'OPERATION_ERROR', {}, err)
      );

      expect(data).toBeUndefined();
      expect(error).toBeInstanceOf(RuntimeError);
      expect(error?.message).toBe('Operation failed');
    });

    test('should handle successful sync operations', () => {
      const { data, error } = safeSync(() => {
        return 'sync success';
      });

      expect(data).toBe('sync success');
      expect(error).toBeUndefined();
    });

    test('should handle failed sync operations', () => {
      const { data, error } = safeSync(
        () => {
          throw new Error('Sync failure');
        },
        (err) =>
          createRuntimeError('Sync operation failed', 'SYNC_ERROR', {}, err)
      );

      expect(data).toBeUndefined();
      expect(error).toBeInstanceOf(RuntimeError);
      expect(error?.message).toBe('Sync operation failed');
    });
  });

  describe('Error Conversion', () => {
    test('should convert to ErrorInfo format', () => {
      const error = createRuntimeError('Test error', 'TEST_CODE', {
        test: true,
      });
      const errorInfo = error.toErrorInfo();

      expect(errorInfo.message).toBe('Test error');
      expect(errorInfo.code).toBe('TEST_CODE');
      expect(errorInfo.category).toBe(ErrorCategory.RUNTIME);
      expect(errorInfo.severity).toBe(ErrorSeverity.MEDIUM);
      expect(errorInfo.context).toEqual({ test: true });
    });

    test('should serialize to JSON', () => {
      const error = createRuntimeError('Test error', 'TEST_CODE', {
        test: true,
      });
      const json = error.toJSON();

      expect(json.name).toBe('RuntimeError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('TEST_CODE');
      expect(json.category).toBe(ErrorCategory.RUNTIME);
      expect(json.severity).toBe(ErrorSeverity.MEDIUM);
      expect(json.context).toEqual({ test: true });
      expect(typeof json.timestamp).toBe('string');
    });
  });

  describe('Error Chaining', () => {
    test('should properly chain errors', () => {
      const originalError = new Error('Original problem');
      const wrappedError = createRuntimeError(
        'Wrapped error',
        'WRAPPED_ERROR',
        { level: 2 },
        originalError
      );

      expect(wrappedError.cause).toBe(originalError);
      expect(wrappedError.stack).toBe(originalError.stack);
    });
  });
});

describe('Error Integration', () => {
  test('should work with try-catch blocks', () => {
    expect(() => {
      try {
        throw createRuntimeError('Test error');
      } catch (error) {
        expect(isSYMindXError(error)).toBe(true);
        if (isSYMindXError(error)) {
          expect(error.code).toBe('RUNTIME_ERROR');
        }
        throw error; // Re-throw for outer expect
      }
    }).toThrow(RuntimeError);
  });

  test('should maintain error hierarchy', () => {
    const error = createRuntimeError('Test');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof SYMindXError).toBe(true);
    expect(error instanceof RuntimeError).toBe(true);
  });
});
