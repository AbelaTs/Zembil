module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/dist'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'dist/**/*.js',
    '!dist/**/*.d.ts',
    '!dist/__tests__/**',
    '!dist/cli.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/dist/__tests__/setup.js'],
  testTimeout: 30000,
  verbose: true
};
