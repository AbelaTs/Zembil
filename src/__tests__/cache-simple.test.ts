import { Cache } from '../core/cache';
import { PackageInfo } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('Cache - Simple Tests', () => {
  let cache: Cache;
  let tempDir: string;
  let testPackagePath: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), 'zembil-cache-simple-test');
    await fs.ensureDir(tempDir);
    
    // Create cache in a subdirectory
    const cacheDir = path.join(tempDir, 'cache');
    cache = new Cache(cacheDir);

    // Create a simple test package file
    testPackagePath = path.join(tempDir, 'test-package.tar.gz');
    await fs.writeFile(testPackagePath, 'test package content');

    await cache.initialize();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  test('should initialize cache directory structure', async () => {
    const cacheDir = path.join(tempDir, 'cache');
    expect(await fs.pathExists(path.join(cacheDir, 'packages'))).toBe(true);
    expect(await fs.pathExists(path.join(cacheDir, 'docs'))).toBe(true);
    expect(await fs.pathExists(path.join(cacheDir, 'examples'))).toBe(true);
    expect(await fs.pathExists(path.join(cacheDir, 'cache.db'))).toBe(true);
  });

  test('should add and retrieve a package', async () => {
    const packageInfo: PackageInfo = {
      name: 'test-package',
      version: '1.0.0',
      manager: 'npm',
      description: 'Test package'
    };

    const id = await cache.add(packageInfo, testPackagePath);
    expect(id).toBeDefined();
    
    const cached = await cache.get('test-package', '1.0.0');
    expect(cached).toBeDefined();
    expect(cached?.name).toBe('test-package');
    expect(cached?.version).toBe('1.0.0');
  });

  test('should return null for non-existent package', async () => {
    const result = await cache.get('non-existent', '1.0.0');
    expect(result).toBeNull();
  });

  test('should list packages', async () => {
    const packageInfo: PackageInfo = {
      name: 'test-package',
      version: '1.0.0',
      manager: 'npm',
      description: 'Test package'
    };

    await cache.add(packageInfo, testPackagePath);
    
    const packages = await cache.list();
    expect(packages).toHaveLength(1);
    expect(packages[0].name).toBe('test-package');
  });

  test('should check if package exists', async () => {
    const packageInfo: PackageInfo = {
      name: 'test-package',
      version: '1.0.0',
      manager: 'npm',
      description: 'Test package'
    };

    expect(await cache.exists('test-package', '1.0.0')).toBe(false);
    
    await cache.add(packageInfo, testPackagePath);
    
    expect(await cache.exists('test-package', '1.0.0')).toBe(true);
  });

  test('should remove package', async () => {
    const packageInfo: PackageInfo = {
      name: 'test-package',
      version: '1.0.0',
      manager: 'npm',
      description: 'Test package'
    };

    await cache.add(packageInfo, testPackagePath);
    expect(await cache.exists('test-package', '1.0.0')).toBe(true);
    
    const removed = await cache.remove('test-package', '1.0.0');
    expect(removed).toBe(true);
    expect(await cache.exists('test-package', '1.0.0')).toBe(false);
  });

  test('should return false when removing non-existent package', async () => {
    const removed = await cache.remove('non-existent', '1.0.0');
    expect(removed).toBe(false);
  });

  test('should calculate cache size', async () => {
    expect(await cache.getSize()).toBe(0);
    
    const packageInfo: PackageInfo = {
      name: 'test-package',
      version: '1.0.0',
      manager: 'npm',
      description: 'Test package'
    };

    await cache.add(packageInfo, testPackagePath);
    
    const size = await cache.getSize();
    expect(size).toBeGreaterThan(0);
  });

  test('should generate consistent IDs', async () => {
    const packageInfo: PackageInfo = {
      name: 'test-package',
      version: '1.0.0',
      manager: 'npm',
      description: 'Test package'
    };

    const id1 = await cache.add(packageInfo, testPackagePath);
    await cache.remove('test-package', '1.0.0');
    const id2 = await cache.add(packageInfo, testPackagePath);
    
    expect(id1).toBe(id2);
  });
});
