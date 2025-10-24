# Testing Guide for Zembil

This guide explains how to test the Zembil package manager and cache system.

## Test Setup

Zembil uses Jest as the testing framework with TypeScript support. The test configuration is defined in `jest.config.js`.

### Prerequisites

Make sure you have all dependencies installed:

```bash
npm install
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Specific Test Files

```bash
npm test -- cache.test.ts
npm test -- zembil.test.ts
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Verbose Output

```bash
npm test -- --verbose
```

## Test Structure

### Test Files Location

All test files are located in `src/__tests__/`:

- `zembil.test.ts` - Main Zembil class tests
- `cache.test.ts` - Cache functionality tests
- `setup.ts` - Global test setup
- `test-utils.ts` - Test utilities and helpers

### Test Categories

#### 1. Unit Tests

- **Cache Tests**: Test individual cache operations (add, get, remove, list, cleanup)
- **Database Tests**: Test database operations and data persistence
- **Queue Tests**: Test package queue management
- **Manager Tests**: Test package manager integrations (npm, pip, maven)

#### 2. Integration Tests

- **End-to-End Tests**: Test complete workflows from package addition to retrieval
- **File System Tests**: Test file operations and directory structure
- **Network Tests**: Test online/offline functionality

#### 3. Performance Tests

- **Large File Tests**: Test with large packages and documentation
- **Concurrent Operations**: Test multiple simultaneous operations
- **Memory Usage**: Test memory efficiency with large datasets

## Writing Tests

### Basic Test Structure

```typescript
import { Cache } from '../core/cache';
import { TestUtils } from './test-utils';

describe('Cache', () => {
  let cache: Cache;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
    cache = new Cache(tempDir);
    await cache.initialize();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  test('should add package successfully', async () => {
    const packageInfo = TestUtils.createTestPackageInfo();
    const packagePath = await TestUtils.createTestPackage(tempDir);

    const id = await cache.add(packageInfo, packagePath);

    expect(id).toBeDefined();
    expect(await cache.exists('test-package', '1.0.0')).toBe(true);
  });
});
```

### Test Utilities

The `TestUtils` class provides helper methods for common test scenarios:

```typescript
// Create temporary directories
const tempDir = await TestUtils.createTempDir();

// Create test files
const packagePath = await TestUtils.createTestPackage(tempDir);
const docsPath = await TestUtils.createTestDocs(tempDir);
const examplesPath = await TestUtils.createTestExamples(tempDir);

// Create test package info
const packageInfo = TestUtils.createTestPackageInfo(
  'my-package',
  '2.0.0',
  'npm'
);

// Create large files for performance testing
await TestUtils.createLargeTestFile(filePath, 10); // 10MB file
```

## Test Scenarios

### Cache Functionality Tests

1. **Package Addition**
   - Add package without documentation
   - Add package with documentation
   - Add package with examples
   - Add package with both docs and examples
   - Handle non-existent paths gracefully

2. **Package Retrieval**
   - Get existing package
   - Handle non-existent package
   - Verify package metadata

3. **Package Removal**
   - Remove existing package
   - Handle non-existent package
   - Clean up associated files

4. **Cache Management**
   - List all packages
   - Calculate total size
   - Clean up orphaned files
   - Verify file integrity

### Integration Tests

1. **Complete Workflow**
   - Initialize cache
   - Add multiple packages
   - Retrieve packages
   - Remove packages
   - Clean up

2. **File System Operations**
   - Directory creation
   - File copying
   - File removal
   - Permission handling

3. **Database Operations**
   - Data persistence
   - Transaction handling
   - Concurrent access

## Performance Testing

### Large File Handling

```typescript
test('should handle large packages', async () => {
  const largePackagePath = path.join(tempDir, 'large-package.tar.gz');
  await TestUtils.createLargeTestFile(largePackagePath, 100); // 100MB

  const packageInfo = TestUtils.createTestPackageInfo();
  const id = await cache.add(packageInfo, largePackagePath);

  expect(id).toBeDefined();
  expect(await cache.getSize()).toBeGreaterThan(100 * 1024 * 1024);
});
```

### Concurrent Operations

```typescript
test('should handle concurrent operations', async () => {
  const operations = Array.from({ length: 10 }, (_, i) =>
    cache.add(
      TestUtils.createTestPackageInfo(`package-${i}`, '1.0.0'),
      testPackagePath
    )
  );

  const results = await Promise.all(operations);
  expect(results).toHaveLength(10);
  expect(await cache.list()).toHaveLength(10);
});
```

## Mocking and Stubbing

### Mock File System Operations

```typescript
jest.mock('fs-extra');
const mockFs = fs as jest.Mocked<typeof fs>;

test('should handle file system errors', async () => {
  mockFs.copy.mockRejectedValue(new Error('File system error'));

  await expect(cache.add(packageInfo, packagePath)).rejects.toThrow(
    'File system error'
  );
});
```

### Mock Network Operations

```typescript
jest.mock('../utils/network');
const mockNetwork = network as jest.Mocked<typeof network>;

test('should handle network failures', async () => {
  mockNetwork.fetchPackageInfo.mockRejectedValue(new Error('Network error'));

  await expect(manager.downloadPackage('package', '1.0.0')).rejects.toThrow(
    'Network error'
  );
});
```

## Debugging Tests

### Debug Mode

```bash
npm test -- --detectOpenHandles --forceExit
```

### Verbose Output

```bash
npm test -- --verbose --no-coverage
```

### Single Test File

```bash
npm test -- --testNamePattern="should add package" --verbose
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm test -- --coverage
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test files and directories
3. **Descriptive Names**: Use clear, descriptive test names
4. **Single Responsibility**: Each test should test one specific behavior
5. **Error Handling**: Test both success and failure scenarios
6. **Performance**: Include performance tests for critical operations
7. **Coverage**: Aim for high test coverage on critical paths

## Troubleshooting

### Common Issues

1. **File System Permissions**: Ensure test directories are writable
2. **Async Operations**: Use proper async/await patterns
3. **Memory Leaks**: Clean up resources in afterEach hooks
4. **Timeouts**: Increase timeout for slow operations
5. **Database Locks**: Ensure database connections are properly closed

### Debug Commands

```bash
# Run with debug output
npm test -- --verbose --detectOpenHandles

# Run specific test with debug
npm test -- --testNamePattern="cache" --verbose

# Check for memory leaks
npm test -- --detectLeaks --forceExit
```
