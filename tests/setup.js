/**
 * Jest Global Setup
 * Runs once before all test suites
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-production';
process.env.TODOS_TABLE = 'test-todos-table';
process.env.USERS_TABLE = 'test-users-table';
process.env.FAMILIES_TABLE = 'test-families-table';
process.env.AWS_REGION = 'us-east-1';

// Mock console methods to reduce test output noise (optional)
global.console = {
  ...console,
  log: jest.fn(), // Suppress console.log in tests
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn, // Keep warnings
  error: console.error, // Keep errors
};

// Add custom Jest matchers if needed
expect.extend({
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
    };
  },
  toBeValidJWT(received) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    const pass = jwtRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid JWT`
          : `expected ${received} to be a valid JWT`,
    };
  },
});

// Global test timeout
jest.setTimeout(10000); // 10 seconds
