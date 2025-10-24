import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Global test setup
beforeAll(async () => {
  // Ensure test environment is clean
  const testDir = path.join(os.tmpdir(), 'zembil-tests');
  await fs.remove(testDir);
});

afterAll(async () => {
  // Cleanup after all tests
  const testDir = path.join(os.tmpdir(), 'zembil-tests');
  await fs.remove(testDir);
});

// Increase timeout for file operations
jest.setTimeout(30000);
