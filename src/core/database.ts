import * as sqlite3 from 'sqlite3';
import { CachedPackage, QueueItem } from '../types';

/**
 * Database layer for storing package metadata and cache information.
 * Uses SQLite for lightweight, embedded database functionality.
 */
export class Database {
  private db: sqlite3.Database;

  /**
   * Creates a new Database instance.
   * @param dbPath - Path to the SQLite database file
   */
  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
  }

  /**
   * Initializes the database schema.
   */
  async initialize(): Promise<void> {
    await this.run(`
      CREATE TABLE IF NOT EXISTS packages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        manager TEXT NOT NULL,
        description TEXT,
        homepage TEXT,
        repository TEXT,
        license TEXT,
        dependencies TEXT,
        devDependencies TEXT,
        peerDependencies TEXT,
        cachedAt TEXT NOT NULL,
        size INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        localPath TEXT NOT NULL,
        documentationPath TEXT,
        examplesPath TEXT,
        UNIQUE(name, version)
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS queue (
        id TEXT PRIMARY KEY,
        packageName TEXT NOT NULL,
        version TEXT NOT NULL,
        manager TEXT NOT NULL,
        priority INTEGER NOT NULL,
        queuedAt TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        progress TEXT
      )
    `);
  }

  /**
   * Saves a package to the database.
   * @param pkg - Cached package to save
   */
  async savePackage(pkg: CachedPackage): Promise<void> {
    const stmt = `
      INSERT OR REPLACE INTO packages (
        id, name, version, manager, description, homepage, repository, license,
        dependencies, devDependencies, peerDependencies, cachedAt, size,
        checksum, localPath, documentationPath, examplesPath
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.run(stmt, [
      pkg.id,
      pkg.name,
      pkg.version,
      pkg.manager,
      pkg.description || null,
      pkg.homepage || null,
      pkg.repository || null,
      pkg.license || null,
      pkg.dependencies ? JSON.stringify(pkg.dependencies) : null,
      pkg.devDependencies ? JSON.stringify(pkg.devDependencies) : null,
      pkg.peerDependencies ? JSON.stringify(pkg.peerDependencies) : null,
      pkg.cachedAt.toISOString(),
      pkg.size,
      pkg.checksum,
      pkg.localPath,
      pkg.documentationPath || null,
      pkg.examplesPath || null
    ]);
  }

  /**
   * Retrieves a package by name and version.
   * @param name - Package name
   * @param version - Package version
   * @returns Cached package or null if not found
   */
  async getPackage(name: string, version: string): Promise<CachedPackage | null> {
    const row = await this.get(
      'SELECT * FROM packages WHERE name = ? AND version = ?',
      [name, version]
    );
    return row ? this.rowToPackage(row) : null;
  }

  /**
   * Lists all packages in the database.
   * @returns Array of cached packages
   */
  async listPackages(): Promise<CachedPackage[]> {
    const rows = await this.all('SELECT * FROM packages ORDER BY cachedAt DESC');
    return rows.map(row => this.rowToPackage(row));
  }

  /**
   * Removes a package from the database.
   * @param name - Package name
   * @param version - Package version
   */
  async removePackage(name: string, version: string): Promise<void> {
    await this.run(
      'DELETE FROM packages WHERE name = ? AND version = ?',
      [name, version]
    );
  }

  /**
   * Searches packages by name or description.
   * @param query - Search query
   * @returns Array of matching packages
   */
  async searchPackages(query: string): Promise<CachedPackage[]> {
    const rows = await this.all(
      'SELECT * FROM packages WHERE name LIKE ? OR description LIKE ? ORDER BY name',
      [`%${query}%`, `%${query}%`]
    );
    return rows.map(row => this.rowToPackage(row));
  }

  /**
   * Gets cache statistics.
   * @returns Cache statistics including total packages, size, and date range
   */
  async getStats(): Promise<{ totalPackages: number; totalSize: number; oldestCache: Date; newestCache: Date }> {
    const row: any = await this.get(`
      SELECT 
        COUNT(*) as totalPackages,
        SUM(size) as totalSize,
        MIN(cachedAt) as oldestCache,
        MAX(cachedAt) as newestCache
      FROM packages
    `);

    return {
      totalPackages: row.totalPackages || 0,
      totalSize: row.totalSize || 0,
      oldestCache: row.oldestCache ? new Date(row.oldestCache) : new Date(),
      newestCache: row.newestCache ? new Date(row.newestCache) : new Date()
    };
  }

  // Queue Management Methods

  async saveQueueItem(item: QueueItem): Promise<void> {
    const stmt = `
      INSERT OR REPLACE INTO queue (
        id, packageName, version, manager, priority, queuedAt, status, error, progress
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.run(stmt, [
      item.id,
      item.packageName,
      item.version,
      item.manager,
      item.priority,
      item.queuedAt.toISOString(),
      item.status,
      item.error || null,
      item.progress ? JSON.stringify(item.progress) : null
    ]);
  }

  async getQueueItem(id: string): Promise<QueueItem | null> {
    const row = await this.get('SELECT * FROM queue WHERE id = ?', [id]);
    return row ? this.rowToQueueItem(row) : null;
  }

  async listQueueItems(): Promise<QueueItem[]> {
    const rows = await this.all('SELECT * FROM queue ORDER BY priority DESC, queuedAt ASC');
    return rows.map(row => this.rowToQueueItem(row));
  }

  async removeQueueItem(id: string): Promise<void> {
    await this.run('DELETE FROM queue WHERE id = ?', [id]);
  }

  async clearQueue(): Promise<void> {
    await this.run('DELETE FROM queue');
  }

  async clearQueueItemByPackage(packageName: string, version?: string): Promise<void> {
    if (version) {
      await this.run('DELETE FROM queue WHERE packageName = ? AND version = ?', [packageName, version]);
    } else {
      await this.run('DELETE FROM queue WHERE packageName = ?', [packageName]);
    }
  }

  // Helper Methods

  private run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Converts a database row to a CachedPackage object.
   * @param row - Database row
   * @returns CachedPackage object
   */
  private rowToPackage(row: any): CachedPackage {
    return {
      id: row.id,
      name: row.name,
      version: row.version,
      manager: row.manager,
      description: row.description,
      homepage: row.homepage,
      repository: row.repository,
      license: row.license,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : undefined,
      devDependencies: row.devDependencies ? JSON.parse(row.devDependencies) : undefined,
      peerDependencies: row.peerDependencies ? JSON.parse(row.peerDependencies) : undefined,
      cachedAt: new Date(row.cachedAt),
      size: row.size,
      checksum: row.checksum,
      localPath: row.localPath,
      documentationPath: row.documentationPath,
      examplesPath: row.examplesPath
    };
  }

  private rowToQueueItem(row: any): QueueItem {
    return {
      id: row.id,
      packageName: row.packageName,
      version: row.version,
      manager: row.manager,
      priority: row.priority,
      queuedAt: new Date(row.queuedAt),
      status: row.status,
      error: row.error || undefined,
      progress: row.progress ? JSON.parse(row.progress) : undefined
    };
  }

  /**
   * Closes the database connection.
   */
  close(): void {
    this.db.close();
  }
}
