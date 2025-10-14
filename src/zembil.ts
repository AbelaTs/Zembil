import * as fs from 'fs-extra';
import * as path from 'path';
import { Cache } from './core/cache';
import { Queue } from './core/queue';
import { Database } from './core/database';
import { PackageManagerFactory } from './managers';
import { CacheConfig, SyncResult, CachedPackage } from './types';

/**
 * Main Zembil class that orchestrates offline package caching.
 * Provides a unified interface for package management, caching, and offline access.
 */
export class Zembil {
  private cacheDir: string;
  private _cache: Cache;
  private _queue: Queue;
  private db: Database;
  private config: CacheConfig;

  /**
   * Creates a new Zembil instance.
   * @param cacheDir - Optional cache directory path (defaults to ~/.zembil)
   */
  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || path.join(require('os').homedir(), '.zembil');
    this._cache = new Cache(this.cacheDir);
    this._queue = new Queue(this.cacheDir, this._cache);
    this.db = new Database(path.join(this.cacheDir, 'cache.db'));
    this.config = this.getDefaultConfig();
  }

  /**
   * Initializes the Zembil system and all its components.
   * Creates necessary directories and loads configuration.
   */
  async initialize(): Promise<void> {
    await fs.ensureDir(this.cacheDir);
    await fs.ensureDir(path.join(this.cacheDir, 'packages'));
    await fs.ensureDir(path.join(this.cacheDir, 'docs'));
    await fs.ensureDir(path.join(this.cacheDir, 'examples'));
    await fs.ensureDir(path.join(this.cacheDir, 'temp'));

    await this._cache.initialize();
    await this._queue.initialize();
    await this.db.initialize();

    await this.loadConfig();
  }

  /**
   * Synchronizes queued packages by downloading and caching them.
   * @returns Sync result with download statistics
   */
  async sync(): Promise<SyncResult> {
    return await this._queue.process();
  }

  /**
   * Installs a package from the local cache.
   * @param packageName - Name of the package to install
   * @param targetDir - Directory to install the package
   */
  async install(packageName: string, targetDir: string): Promise<void> {
    const cached = await this.findCachedPackage(packageName);
    if (!cached) {
      throw new Error(`Package ${packageName} not found in cache. Run 'zembil sync' first.`);
    }

    const manager = PackageManagerFactory.getManager(cached.manager);
    await manager.install(cached.name, cached.version, targetDir);
  }

  /**
   * Retrieves package documentation from the cache.
   * @param packageName - Name of the package
   * @param version - Optional version (uses latest if not specified)
   * @returns Documentation content or null if not available
   */
  async getDocumentation(packageName: string, version?: string): Promise<string | null> {
    const cached = await this.findCachedPackage(packageName, version);
    if (!cached || !cached.documentationPath) {
      return null;
    }

    try {
      return await fs.readFile(cached.documentationPath, 'utf8');
    } catch (error) {
      return null;
    }
  }

  /**
   * Retrieves package examples from the cache.
   * @param packageName - Name of the package
   * @param version - Optional version (uses latest if not specified)
   * @returns Array of example content strings
   */
  async getExamples(packageName: string, version?: string): Promise<string[]> {
    const cached = await this.findCachedPackage(packageName, version);
    if (!cached || !cached.examplesPath) {
      return [];
    }

    try {
      const files = await fs.readdir(cached.examplesPath);
      const examples: string[] = [];
      
      for (const file of files) {
        const content = await fs.readFile(path.join(cached.examplesPath!, file), 'utf8');
        examples.push(content);
      }
      
      return examples;
    } catch (error) {
      return [];
    }
  }

  /**
   * Gets cache statistics and information.
   * @returns Cache statistics including package count, size, and date range
   */
  async getStats(): Promise<{
    totalPackages: number;
    totalSize: number;
    oldestCache: Date;
    newestCache: Date;
  }> {
    return await this.db.getStats();
  }

  /**
   * Gets the cache directory path.
   * @returns Cache directory path
   */
  getCacheDir(): string {
    return this.cacheDir;
  }

  /**
   * Gets the cache instance for direct access.
   * @returns Cache instance
   */
  get cache() {
    return this._cache;
  }

  /**
   * Gets the queue instance for direct access.
   * @returns Queue instance
   */
  get queue() {
    return this._queue;
  }

  /**
   * Finds a cached package by name and optional version.
   * @param packageName - Name of the package
   * @param version - Optional version (uses latest if not specified)
   * @returns Cached package or null if not found
   */
  private async findCachedPackage(packageName: string, version?: string): Promise<CachedPackage | null> {
    if (version) {
      return await this._cache.get(packageName, version);
    }

    const packages = await this._cache.list();
    const matching = packages.filter(pkg => pkg.name === packageName);
    
    if (matching.length === 0) {
      return null;
    }

    return matching.sort((a, b) => b.version.localeCompare(a.version))[0];
  }

  /**
   * Gets the default configuration for Zembil.
   * @returns Default configuration object
   */
  private getDefaultConfig(): CacheConfig {
    return {
      cacheDir: this.cacheDir,
      maxSize: 10 * 1024 * 1024 * 1024, // 10GB
      compressionLevel: 6,
      enableDocumentation: true,
      enableExamples: true,
      syncInterval: 60, // 1 hour
      offlineMode: false
    };
  }

  /**
   * Loads configuration from the config file.
   */
  private async loadConfig(): Promise<void> {
    const configPath = path.join(this.cacheDir, 'config.json');
    
    try {
      if (await fs.pathExists(configPath)) {
        const configData = await fs.readFile(configPath, 'utf8');
        const loadedConfig = JSON.parse(configData);
        this.config = { ...this.config, ...loadedConfig };
      }
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
    }
  }

  /**
   * Saves the current configuration to the config file.
   */
  async saveConfig(): Promise<void> {
    const configPath = path.join(this.cacheDir, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Sets the maximum cache size.
   * @param size - Maximum size in bytes
   */
  async setMaxSize(size: number): Promise<void> {
    this.config.maxSize = size;
    await this.saveConfig();
  }

  /**
   * Sets the offline mode.
   * @param enabled - Whether to enable offline mode
   */
  async setOfflineMode(enabled: boolean): Promise<void> {
    this.config.offlineMode = enabled;
    await this.saveConfig();
  }

  /**
   * Sets the sync interval.
   * @param minutes - Sync interval in minutes
   */
  async setSyncInterval(minutes: number): Promise<void> {
    this.config.syncInterval = minutes;
    await this.saveConfig();
  }

  /**
   * Gets the current configuration.
   * @returns Current configuration object
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }
}
