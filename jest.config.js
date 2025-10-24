module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/__tests__/cache.test.ts',
    '/src/__tests__/cache-simple.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/cli.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  verbose: true,
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
