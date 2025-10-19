module.exports = {
  testEnvironment: 'node',

  // Coverage configuration
  collectCoverage: false, // Enable with --coverage flag
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/lambda/**/*.js', // Lambda tested separately
    '!src/views/**/*.js',  // View controllers are simple
    '!**/node_modules/**',
  ],

  // Coverage thresholds (enforced in CI)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.integration.test.js',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Test timeout
  testTimeout: 10000, // 10 seconds

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.serverless/',
  ],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,
};
