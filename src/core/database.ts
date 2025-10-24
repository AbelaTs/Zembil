import * as sqlite3 from 'sqlite3';
// import * as path from 'path';
import { CachedPackage } from '../types';

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
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(`
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
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  /**
   * Saves a package to the database.
   * @param pkg - Cached package to save
   */
  async savePackage(pkg: CachedPackage): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO packages (
          id, name, version, manager, description, homepage, repository, license,
          dependencies, devDependencies, peerDependencies, cachedAt, size,
          checksum, localPath, documentationPath, examplesPath
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
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
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });

      stmt.finalize();
    });
  }

  /**
   * Retrieves a package by name and version.
   * @param name - Package name
   * @param version - Package version
   * @returns Cached package or null if not found
   */
  async getPackage(name: string, version: string): Promise<CachedPackage | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM packages WHERE name = ? AND version = ?',
        [name, version],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          if (!row) {
            resolve(null);
            return;
          }
          resolve(this.rowToPackage(row));
        }
      );
    });
  }

  /**
   * Lists all packages in the database.
   * @returns Array of cached packages
   */
  async listPackages(): Promise<CachedPackage[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM packages ORDER BY cachedAt DESC', (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows.map(row => this.rowToPackage(row)));
      });
    });
  }

  /**
   * Removes a package from the database.
   * @param name - Package name
   * @param version - Package version
   */
  async removePackage(name: string, version: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM packages WHERE name = ? AND version = ?',
        [name, version],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Searches packages by name or description.
   * @param query - Search query
   * @returns Array of matching packages
   */
  async searchPackages(query: string): Promise<CachedPackage[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM packages WHERE name LIKE ? OR description LIKE ? ORDER BY name',
        [`%${query}%`, `%${query}%`],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows.map(row => this.rowToPackage(row)));
        }
      );
    });
  }

  /**
   * Gets cache statistics.
   * @returns Cache statistics including total packages, size, and date range
   */
  async getStats(): Promise<{ totalPackages: number; totalSize: number; oldestCache: Date; newestCache: Date }> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(*) as totalPackages,
          SUM(size) as totalSize,
          MIN(cachedAt) as oldestCache,
          MAX(cachedAt) as newestCache
        FROM packages
      `, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          totalPackages: (row as any).totalPackages || 0,
          totalSize: (row as any).totalSize || 0,
          oldestCache: (row as any).oldestCache ? new Date((row as any).oldestCache) : new Date(),
          newestCache: (row as any).newestCache ? new Date((row as any).newestCache) : new Date()
        });
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

  /**
   * Closes the database connection.
   */
  close(): void {
    this.db.close();
  }
}
