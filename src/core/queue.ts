import * as fs from 'fs-extra';
import * as path from 'path';
import { QueueInterface, QueueItem, PackageManager, SyncResult } from '../types';
import { PackageManagerFactory } from '../managers';
import { Cache } from './cache';

/**
 * Queue system for managing package downloads with priority and retry logic.
 * Handles batch processing and error recovery for offline package caching.
 */
export class Queue implements QueueInterface {
  private queueFile: string;
  private cache: Cache;

  /**
   * Creates a new Queue instance.
   * @param cacheDir - Cache directory path
   * @param cache - Cache instance for storing packages
   */
  constructor(cacheDir: string, cache: Cache) {
    this.queueFile = path.join(cacheDir, 'queue.json');
    this.cache = cache;
  }

  /**
   * Initializes the queue system.
   */
  async initialize(): Promise<void> {
    await fs.ensureFile(this.queueFile);
    const queueData = await this.loadQueue();
    if (!queueData) {
      await this.saveQueue([]);
    }
  }

  /**
   * Adds a package to the download queue.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @param manager - Package manager to use
   * @param priority - Download priority (higher = more important)
   * @returns Unique queue item ID
   */
  async add(packageName: string, version: string, manager: PackageManager, priority: number = 0): Promise<string> {
    const id = this.generateId(packageName, version, manager);
    const queueItem: QueueItem = {
      id,
      packageName,
      version,
      manager,
      priority,
      queuedAt: new Date(),
      status: 'pending'
    };

    const queue = await this.loadQueue();
    
    const existing = queue.find(item => 
      item.packageName === packageName && 
      item.version === version && 
      item.manager === manager
    );
    
    if (existing) {
      throw new Error(`Package ${packageName}@${version} is already queued`);
    }

    queue.push(queueItem);
    await this.saveQueue(queue);
    return id;
  }

  /**
   * Removes a package from the queue.
   * @param id - Queue item ID
   * @returns True if package was removed, false if not found
   */
  async remove(id: string): Promise<boolean> {
    const queue = await this.loadQueue();
    const index = queue.findIndex(item => item.id === id);
    
    if (index === -1) {
      return false;
    }

    queue.splice(index, 1);
    await this.saveQueue(queue);
    return true;
  }

  /**
   * Lists all queued packages sorted by priority.
   * @returns Array of queue items
   */
  async list(): Promise<QueueItem[]> {
    const queue = await this.loadQueue();
    return queue.sort((a, b) => b.priority - a.priority || a.queuedAt.getTime() - b.queuedAt.getTime());
  }

  /**
   * Processes all pending items in the queue.
   * Downloads packages and stores them in the cache.
   * @returns Sync result with download statistics
   */
  async process(): Promise<SyncResult> {
    const queue = await this.loadQueue();
    const pendingItems = queue.filter(item => item.status === 'pending');
    
    const result: SyncResult = {
      success: true,
      downloaded: 0,
      failed: 0,
      errors: [],
      totalSize: 0
    };

    for (const item of pendingItems) {
      try {
        await this.processItem(item);
        result.downloaded++;
        
        item.status = 'completed';
        await this.saveQueue(queue);
        
      } catch (error) {
        console.error(`Failed to process ${item.packageName}@${item.version}:`, error);
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : String(error);
        result.failed++;
        result.errors.push(`${item.packageName}@${item.version}: ${item.error}`);
        await this.saveQueue(queue);
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  /**
   * Clears all items from the queue.
   */
  async clear(): Promise<void> {
    await this.saveQueue([]);
  }

  /**
   * Gets the current status of the queue.
   * @returns Queue status with counts for each state
   */
  async getStatus(): Promise<{ pending: number; downloading: number; completed: number; failed: number }> {
    const queue = await this.loadQueue();
    return {
      pending: queue.filter(item => item.status === 'pending').length,
      downloading: queue.filter(item => item.status === 'downloading').length,
      completed: queue.filter(item => item.status === 'completed').length,
      failed: queue.filter(item => item.status === 'failed').length
    };
  }

  /**
   * Processes a single queue item by downloading and caching the package.
   * @param item - Queue item to process
   */
  private async processItem(item: QueueItem): Promise<void> {
    item.status = 'downloading';
    await this.updateItem(item);

    try {
      const manager = PackageManagerFactory.getManager(item.manager);
      
      const packageInfo = await manager.getPackageInfo(item.packageName, item.version);
      const packagePath = await manager.downloadPackage(item.packageName, item.version);
      
      let docsPath: string | undefined;
      try {
        const docs = await manager.getDocumentation(item.packageName, item.version);
        if (docs) {
          docsPath = path.join(process.cwd(), 'temp', `${item.id}-docs.md`);
          await fs.ensureDir(path.dirname(docsPath));
          await fs.writeFile(docsPath, docs);
        }
      } catch (error) {
        console.warn(`Failed to get documentation for ${item.packageName}:`, error);
      }

      let examplesPath: string | undefined;
      try {
        const examples = await manager.getExamples(item.packageName, item.version);
        if (examples.length > 0) {
          examplesPath = path.join(process.cwd(), 'temp', `${item.id}-examples`);
          await fs.ensureDir(examplesPath);
          for (let i = 0; i < examples.length; i++) {
            await fs.writeFile(path.join(examplesPath, `example-${i}.md`), examples[i]);
          }
        }
      } catch (error) {
        console.warn(`Failed to get examples for ${item.packageName}:`, error);
      }

      await this.cache.add(packageInfo, packagePath, docsPath, examplesPath);
      
      await fs.remove(packagePath);
      if (docsPath) await fs.remove(docsPath);
      if (examplesPath) await fs.remove(examplesPath);
      
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : String(error);
      await this.updateItem(item);
      throw error;
    }
  }

  /**
   * Updates a queue item in the queue file.
   * @param item - Queue item to update
   */
  private async updateItem(item: QueueItem): Promise<void> {
    const queue = await this.loadQueue();
    const index = queue.findIndex(q => q.id === item.id);
    if (index !== -1) {
      queue[index] = item;
      await this.saveQueue(queue);
    }
  }

  /**
   * Loads the queue from the queue file.
   * @returns Array of queue items
   */
  private async loadQueue(): Promise<QueueItem[]> {
    try {
      const data = await fs.readFile(this.queueFile, 'utf8');
      const queue = JSON.parse(data);
      return queue.map((item: any) => ({
        ...item,
        queuedAt: new Date(item.queuedAt)
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Saves the queue to the queue file.
   * @param queue - Queue items to save
   */
  private async saveQueue(queue: QueueItem[]): Promise<void> {
    await fs.writeFile(this.queueFile, JSON.stringify(queue, null, 2));
  }

  /**
   * Generates a unique ID for a queue item.
   * @param packageName - Package name
   * @param version - Package version
   * @param manager - Package manager
   * @returns Unique queue item ID
   */
  private generateId(packageName: string, version: string, manager: PackageManager): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${manager}-${packageName}-${version}-${timestamp}-${random}`;
  }
}
