import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { CachedPackage, CacheInterface, PackageInfo } from '../types';
import { Database } from './database';

/**
 * Cache implementation for storing packages, documentation, and examples locally.
 * Provides offline access to packages and their associated resources.
 */
export class Cache implements CacheInterface {
  private db: Database;
  private cacheDir: string;

  /**
   * Creates a new Cache instance.
   * @param cacheDir - Directory path for cache storage
   */
  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.db = new Database(path.join(cacheDir, 'cache.db'));
  }

  /**
   * Initializes the cache directory structure and database.
   */
  async initialize(): Promise<void> {
    await fs.ensureDir(this.cacheDir);
    await fs.ensureDir(path.join(this.cacheDir, 'packages'));
    await fs.ensureDir(path.join(this.cacheDir, 'docs'));
    await fs.ensureDir(path.join(this.cacheDir, 'examples'));
    await this.db.initialize();
  }

  /**
   * Adds a package to the cache with optional documentation and examples.
   * @param packageInfo - Package metadata
   * @param packagePath - Path to the package file
   * @param docsPath - Optional path to documentation
   * @param examplesPath - Optional path to examples
   * @returns Unique cache ID for the package
   */
  async add(
    packageInfo: PackageInfo,
    packagePath: string,
    docsPath?: string,
    examplesPath?: string
  ): Promise<string> {
    const id = this.generateId(packageInfo.name, packageInfo.version);
    const packageHash = await this.calculateHash(packagePath);
    const size = await this.getFileSize(packagePath);

    const cachedPackagePath = path.join(this.cacheDir, 'packages', `${id}.tar.gz`);
    await fs.copy(packagePath, cachedPackagePath);

    let documentationPath: string | undefined;
    if (docsPath && await fs.pathExists(docsPath)) {
      documentationPath = path.join(this.cacheDir, 'docs', `${id}`);
      await fs.copy(docsPath, documentationPath);
    }

    let examplesPathCached: string | undefined;
    if (examplesPath && await fs.pathExists(examplesPath)) {
      examplesPathCached = path.join(this.cacheDir, 'examples', `${id}`);
      await fs.copy(examplesPath, examplesPathCached);
    }

    const cachedPackage: CachedPackage = {
      ...packageInfo,
      id,
      cachedAt: new Date(),
      size,
      checksum: packageHash,
      localPath: cachedPackagePath,
      documentationPath,
      examplesPath: examplesPathCached
    };

    await this.db.savePackage(cachedPackage);
    return id;
  }

  /**
   * Retrieves a cached package by name and version.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @returns Cached package or null if not found
   */
  async get(packageName: string, version: string): Promise<CachedPackage | null> {
    return await this.db.getPackage(packageName, version);
  }

  /**
   * Lists all cached packages.
   * @returns Array of cached packages
   */
  async list(): Promise<CachedPackage[]> {
    return await this.db.listPackages();
  }

  /**
   * Removes a package from the cache.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @returns True if package was removed, false if not found
   */
  async remove(packageName: string, version: string): Promise<boolean> {
    const cached = await this.get(packageName, version);
    if (!cached) return false; 

    await fs.remove(cached.localPath);
    if (cached.documentationPath) {
      await fs.remove(cached.documentationPath);
    }
    if (cached.examplesPath) {
      await fs.remove(cached.examplesPath);
    }

    await this.db.removePackage(packageName, version);
    return true;
  }

  /**
   * Checks if a package exists in the cache.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @returns True if package exists and files are intact
   */
  async exists(packageName: string, version: string): Promise<boolean> {
    const cached = await this.get(packageName, version);
    return cached !== null && await fs.pathExists(cached.localPath);
  }

  /**
   * Gets the total size of all cached packages.
   * @returns Total size in bytes
   */
  async getSize(): Promise<number> {
    const packages = await this.list();
    return packages.reduce((total, pkg) => total + pkg.size, 0);
  }

  /**
   * Cleans up orphaned files and optimizes cache storage.
   */
  async cleanup(): Promise<void> {
    const packages = await this.list();
    const packageFiles = await fs.readdir(path.join(this.cacheDir, 'packages'));
    
    for (const file of packageFiles) {
      const id = path.basename(file, '.tar.gz');
      const exists = packages.some(pkg => pkg.id === id);
      if (!exists) {
        await fs.remove(path.join(this.cacheDir, 'packages', file));
      }
    }

    await this.cleanupDirectory(path.join(this.cacheDir, 'docs'), packages);
    await this.cleanupDirectory(path.join(this.cacheDir, 'examples'), packages);
  }

  /**
   * Cleans up orphaned files in a specific directory.
   * @param dirPath - Directory path to clean
   * @param packages - List of valid packages
   */
  private async cleanupDirectory(dirPath: string, packages: CachedPackage[]): Promise<void> {
    if (!await fs.pathExists(dirPath)) return;

    const dirs = await fs.readdir(dirPath);
    for (const dir of dirs) {
      const exists = packages.some(pkg => pkg.id === dir);
      if (!exists) {
        await fs.remove(path.join(dirPath, dir));
      }
    }
  }

  /**
   * Generates a unique ID for a package.
   * @param name - Package name
   * @param version - Package version
   * @returns MD5 hash of package identifier
   */
  private generateId(name: string, version: string): string {
    return crypto.createHash('md5').update(`${name}@${version}`).digest('hex');
  }

  /**
   * Calculates SHA256 hash of a file.
   * @param filePath - Path to the file
   * @returns SHA256 hash string
   */
  private async calculateHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Gets the size of a file in bytes.
   * @param filePath - Path to the file
   * @returns File size in bytes
   */
  private async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }
}
