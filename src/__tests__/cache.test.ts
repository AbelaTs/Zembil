import { Cache } from '../core/cache';
// import { Database } from '../core/database';
import { PackageInfo } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('Cache', () => {
  let cache: Cache;
  let tempDir: string;
  let testPackagePath: string;
  let testDocsPath: string;
  let testExamplesPath: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), 'zembil-cache-test');
    await fs.ensureDir(tempDir);
    
    // Create separate directories for test files to avoid circular copy issues
    const testFilesDir = path.join(tempDir, 'test-files');
    await fs.ensureDir(testFilesDir);
    
    cache = new Cache(path.join(tempDir, 'cache'));

    // Create test files in separate directory
    testPackagePath = path.join(testFilesDir, 'test-package.tar.gz');
    testDocsPath = path.join(testFilesDir, 'docs');
    testExamplesPath = path.join(testFilesDir, 'examples');

    await fs.writeFile(testPackagePath, 'test package content');
    await fs.ensureDir(testDocsPath);
    await fs.writeFile(path.join(testDocsPath, 'README.md'), 'test documentation');
    await fs.ensureDir(testExamplesPath);
    await fs.writeFile(path.join(testExamplesPath, 'example.js'), 'console.log("test");');

    await cache.initialize();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('initialization', () => {
    test('should create cache directory structure', async () => {
      const cacheDir = path.join(tempDir, 'cache');
      expect(await fs.pathExists(path.join(cacheDir, 'packages'))).toBe(true);
      expect(await fs.pathExists(path.join(cacheDir, 'docs'))).toBe(true);
      expect(await fs.pathExists(path.join(cacheDir, 'examples'))).toBe(true);
      expect(await fs.pathExists(path.join(cacheDir, 'cache.db'))).toBe(true);
    });
  });

  describe('add method', () => {
    test('should add package without docs and examples', async () => {
      const packageInfo: PackageInfo = {
        name: 'test-package',
        version: '1.0.0',
        manager: 'npm',
        description: 'Test package'
      };

      const id = await cache.add(packageInfo, testPackagePath);
      
      expect(id).toBeDefined();
      expect(await fs.pathExists(path.join(tempDir, 'packages', `${id}.tar.gz`))).toBe(true);
      
      const cached = await cache.get('test-package', '1.0.0');
      expect(cached).toBeDefined();
      expect(cached?.name).toBe('test-package');
      expect(cached?.version).toBe('1.0.0');
    });

    test('should add package with documentation', async () => {
      const packageInfo: PackageInfo = {
        name: 'test-package',
        version: '1.0.0',
        manager: 'npm',
        description: 'Test package'
      };

      const _id = await cache.add(packageInfo, testPackagePath, testDocsPath);
      
      const cached = await cache.get('test-package', '1.0.0');
      expect(cached?.documentationPath).toBeDefined();
      expect(await fs.pathExists(cached!.documentationPath!)).toBe(true);
    });

    test('should add package with examples', async () => {
      const packageInfo: PackageInfo = {
        name: 'test-package',
        version: '1.0.0',
        manager: 'npm',
        description: 'Test package'
      };

      const id = await cache.add(packageInfo, testPackagePath, undefined, testExamplesPath);
      
      const cached = await cache.get('test-package', '1.0.0');
      expect(cached?.examplesPath).toBeDefined();
      expect(await fs.pathExists(cached!.examplesPath!)).toBe(true);
    });

    test('should add package with both docs and examples', async () => {
      const packageInfo: PackageInfo = {
        name: 'test-package',
        version: '1.0.0',
        manager: 'npm',
        description: 'Test package'
      };

      const id = await cache.add(packageInfo, testPackagePath, testDocsPath, testExamplesPath);
      
      const cached = await cache.get('test-package', '1.0.0');
      expect(cached?.documentationPath).toBeDefined();
      expect(cached?.examplesPath).toBeDefined();
      expect(await fs.pathExists(cached!.documentationPath!)).toBe(true);
      expect(await fs.pathExists(cached!.examplesPath!)).toBe(true);
    });

    test('should handle non-existent docs path gracefully', async () => {
      const packageInfo: PackageInfo = {
        name: 'test-package',
        version: '1.0.0',
        manager: 'npm',
        description: 'Test package'
      };

      const id = await cache.add(packageInfo, testPackagePath, '/non/existent/path');
      
      const cached = await cache.get('test-package', '1.0.0');
      expect(cached?.documentationPath).toBeNull();
    });
  });

  describe('get method', () => {
    test('should return null for non-existent package', async () => {
      const result = await cache.get('non-existent', '1.0.0');
      expect(result).toBeNull();
    });

    test('should return cached package', async () => {
      const packageInfo: PackageInfo = {
        name: 'test-package',
        version: '1.0.0',
        manager: 'npm',
        description: 'Test package'
      };

      await cache.add(packageInfo, testPackagePath);
      const cached = await cache.get('test-package', '1.0.0');
      
      expect(cached).toBeDefined();
      expect(cached?.name).toBe('test-package');
      expect(cached?.version).toBe('1.0.0');
      expect(cached?.manager).toBe('npm');
      expect(cached?.cachedAt).toBeInstanceOf(Date);
      expect(cached?.size).toBeGreaterThan(0);
      expect(cached?.checksum).toBeDefined();
    });
  });

  describe('list method', () => {
    test('should return empty array for empty cache', async () => {
      const packages = await cache.list();
      expect(packages).toEqual([]);
    });

    test('should return all cached packages', async () => {
      const package1: PackageInfo = {
        name: 'package1',
        version: '1.0.0',
        manager: 'npm',
        description: 'Package 1'
      };

      const package2: PackageInfo = {
        name: 'package2',
        version: '2.0.0',
        manager: 'pip',
        description: 'Package 2'
      };

      await cache.add(package1, testPackagePath);
      await cache.add(package2, testPackagePath);

      const packages = await cache.list();
      expect(packages).toHaveLength(2);
      expect(packages.some(p => p.name === 'package1')).toBe(true);
      expect(packages.some(p => p.name === 'package2')).toBe(true);
    });
  });

  describe('remove method', () => {
    test('should return false for non-existent package', async () => {
      const result = await cache.remove('non-existent', '1.0.0');
      expect(result).toBe(false);
    });

    test('should remove package and files', async () => {
      const packageInfo: PackageInfo = {
        name: 'test-package',
        version: '1.0.0',
        manager: 'npm',
        description: 'Test package'
      };

      await cache.add(packageInfo, testPackagePath, testDocsPath, testExamplesPath);
      
      const cached = await cache.get('test-package', '1.0.0');
      expect(cached).toBeDefined();
      
      const result = await cache.remove('test-package', '1.0.0');
      expect(result).toBe(true);
      
      expect(await cache.get('test-package', '1.0.0')).toBeNull();
      expect(await fs.pathExists(cached!.localPath)).toBe(false);
      expect(await fs.pathExists(cached!.documentationPath!)).toBe(false);
      expect(await fs.pathExists(cached!.examplesPath!)).toBe(false);
    });
  });

  describe('exists method', () => {
    test('should return false for non-existent package', async () => {
      const result = await cache.exists('non-existent', '1.0.0');
      expect(result).toBe(false);
    });

    test('should return true for existing package', async () => {
      const packageInfo: PackageInfo = {
        name: 'test-package',
        version: '1.0.0',
        manager: 'npm',
        description: 'Test package'
      };

      await cache.add(packageInfo, testPackagePath);
      
      const result = await cache.exists('test-package', '1.0.0');
      expect(result).toBe(true);
    });

    test('should return false if package file is missing', async () => {
      const packageInfo: PackageInfo = {
        name: 'test-package',
        version: '1.0.0',
        manager: 'npm',
        description: 'Test package'
      };

      await cache.add(packageInfo, testPackagePath);
      const cached = await cache.get('test-package', '1.0.0');
      
      // Remove the file manually
      await fs.remove(cached!.localPath);
      
      const result = await cache.exists('test-package', '1.0.0');
      expect(result).toBe(false);
    });
  });

  describe('getSize method', () => {
    test('should return 0 for empty cache', async () => {
      const size = await cache.getSize();
      expect(size).toBe(0);
    });

    test('should return total size of all packages', async () => {
      const package1: PackageInfo = {
        name: 'package1',
        version: '1.0.0',
        manager: 'npm',
        description: 'Package 1'
      };

      const package2: PackageInfo = {
        name: 'package2',
        version: '2.0.0',
        manager: 'npm',
        description: 'Package 2'
      };

      await cache.add(package1, testPackagePath);
      await cache.add(package2, testPackagePath);

      const size = await cache.getSize();
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('cleanup method', () => {
    test('should remove orphaned files', async () => {
      // Create orphaned files manually
      const orphanedPackage = path.join(tempDir, 'packages', 'orphaned.tar.gz');
      const orphanedDocs = path.join(tempDir, 'docs', 'orphaned');
      const orphanedExamples = path.join(tempDir, 'examples', 'orphaned');

      await fs.writeFile(orphanedPackage, 'orphaned content');
      await fs.ensureDir(orphanedDocs);
      await fs.ensureDir(orphanedExamples);

      await cache.cleanup();

      expect(await fs.pathExists(orphanedPackage)).toBe(false);
      expect(await fs.pathExists(orphanedDocs)).toBe(false);
      expect(await fs.pathExists(orphanedExamples)).toBe(false);
    });

    test('should preserve valid package files', async () => {
      const packageInfo: PackageInfo = {
        name: 'test-package',
        version: '1.0.0',
        manager: 'npm',
        description: 'Test package'
      };

      await cache.add(packageInfo, testPackagePath, testDocsPath, testExamplesPath);
      
      const cached = await cache.get('test-package', '1.0.0');
      
      await cache.cleanup();

      expect(await fs.pathExists(cached!.localPath)).toBe(true);
      expect(await fs.pathExists(cached!.documentationPath!)).toBe(true);
      expect(await fs.pathExists(cached!.examplesPath!)).toBe(true);
    });
  });

  describe('ID generation', () => {
    test('should generate consistent IDs for same package', async () => {
      const packageInfo: PackageInfo = {
        name: 'test-package',
        version: '1.0.0',
        manager: 'npm',
        description: 'Test package'
      };

      const id1 = await cache.add(packageInfo, testPackagePath);
      
      // Remove the package to add it again
      await cache.remove('test-package', '1.0.0');
      
      const id2 = await cache.add(packageInfo, testPackagePath);
      
      expect(id1).toBe(id2);
    });

    test('should generate different IDs for different packages', async () => {
      const package1: PackageInfo = {
        name: 'package1',
        version: '1.0.0',
        manager: 'npm',
        description: 'Package 1'
      };

      const package2: PackageInfo = {
        name: 'package2',
        version: '1.0.0',
        manager: 'npm',
        description: 'Package 2'
      };

      const id1 = await cache.add(package1, testPackagePath);
      const id2 = await cache.add(package2, testPackagePath);
      
      expect(id1).not.toBe(id2);
    });
  });
});
