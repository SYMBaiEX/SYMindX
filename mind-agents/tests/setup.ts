// Global test setup
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';

// Mock timers for consistent testing
jest.useFakeTimers();

// Global test utilities
global.testUtils = {
  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Advance timers
  advanceTimers: (ms: number) => jest.advanceTimersByTime(ms),
  
  // Run all timers
  runAllTimers: () => jest.runAllTimers(),
  
  // Clear all timers
  clearAllTimers: () => jest.clearAllTimers(),
};

// Global mocks
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Increase test timeout for CI environments
if (process.env.CI) {
  jest.setTimeout(30000);
}

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () =>
        `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass,
    };
  },
  
  toHaveBeenCalledWithMatch(received: jest.Mock, expected: any) {
    const calls = received.mock.calls;
    const pass = calls.some(call => 
      JSON.stringify(call).includes(JSON.stringify(expected))
    );
    return {
      message: () =>
        `expected mock to have been called with matching ${JSON.stringify(expected)}`,
      pass,
    };
  },
});