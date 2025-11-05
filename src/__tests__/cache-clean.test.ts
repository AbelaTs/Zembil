import { Cache } from '../core/cache';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('Cache Clean', () => {
  let testCacheDir: string;
  let cache: Cache;

  beforeEach(async () => {
    testCacheDir = path.join(__dirname, 'test-cache-clean');
    await fs.ensureDir(testCacheDir);
    
    // Create a mock database file
    const dbPath = path.join(testCacheDir, 'cache.db');
    await fs.ensureFile(dbPath);
    
    cache = new Cache(testCacheDir);
    await cache.initialize();
  });

  afterEach(async () => {
    await fs.remove(testCacheDir);
  });

  it('should clean all packages from cache', async () => {
    // Create temporary package files
    const tempDir = path.join(testCacheDir, 'temp');
    await fs.ensureDir(tempDir);
    
    const packageFile1 = path.join(tempDir, 'package1.tar.gz');
    const packageFile2 = path.join(tempDir, 'package2.tar.gz');
    await fs.writeFile(packageFile1, 'test1');
    await fs.writeFile(packageFile2, 'test2');

    // Add packages to cache (cache.add will copy them to the right location)
    await cache.add(
      { name: 'package1', version: '1.0.0', manager: 'npm' },
      packageFile1
    );
    await cache.add(
      { name: 'package2', version: '2.0.0', manager: 'npm' },
      packageFile2
    );

    const count = await cache.cleanAll();
    expect(count).toBe(2);

    const packages = await cache.list();
    expect(packages).toHaveLength(0);
  });

  it('should clean specific package from cache', async () => {
    // Create temporary package files
    const tempDir = path.join(testCacheDir, 'temp');
    await fs.ensureDir(tempDir);
    
    const packageFile1 = path.join(tempDir, 'test-package-1.0.0.tar.gz');
    const packageFile2 = path.join(tempDir, 'test-package-1.1.0.tar.gz');
    const packageFile3 = path.join(tempDir, 'other-package-2.0.0.tar.gz');
    await fs.writeFile(packageFile1, 'test1');
    await fs.writeFile(packageFile2, 'test2');
    await fs.writeFile(packageFile3, 'test3');

    // Add packages to cache
    await cache.add(
      { name: 'test-package', version: '1.0.0', manager: 'npm' },
      packageFile1
    );
    await cache.add(
      { name: 'test-package', version: '1.1.0', manager: 'npm' },
      packageFile2
    );
    await cache.add(
      { name: 'other-package', version: '2.0.0', manager: 'npm' },
      packageFile3
    );

    const count = await cache.cleanPackage('test-package');
    expect(count).toBe(2);

    const packages = await cache.list();
    expect(packages).toHaveLength(1);
    expect(packages[0].name).toBe('other-package');
  });

  it('should return 0 if package not found', async () => {
    const count = await cache.cleanPackage('nonexistent');
    expect(count).toBe(0);
  });

  it('should clean all versions of a package', async () => {
    // Create temporary package files with multiple versions
    const tempDir = path.join(testCacheDir, 'temp');
    await fs.ensureDir(tempDir);
    const versions = ['1.0.0', '1.1.0', '2.0.0', '2.1.0'];
    
    for (let i = 0; i < versions.length; i++) {
      const packageFile = path.join(tempDir, `multi-version-${versions[i]}.tar.gz`);
      await fs.writeFile(packageFile, `test${i}`);
      
      await cache.add(
        { name: 'multi-version', version: versions[i], manager: 'npm' },
        packageFile
      );
    }

    const count = await cache.cleanPackage('multi-version');
    expect(count).toBe(4);

    const packages = await cache.list();
    expect(packages).toHaveLength(0);
  });
});

