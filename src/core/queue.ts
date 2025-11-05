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
  private isPausedFlag: boolean = false;
  private currentItem: QueueItem | null = null;

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
   * Supports pause/resume functionality.
   * @returns Sync result with download statistics
   */
  async process(): Promise<SyncResult> {
    // Resume paused items if any
    await this.resumePausedItems();
    
    const queue = await this.loadQueue();
    const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'paused');
    
    const result: SyncResult = {
      success: true,
      downloaded: 0,
      failed: 0,
      errors: [],
      totalSize: 0
    };

    for (const item of pendingItems) {
      // Check if paused
      if (this.isPausedFlag) {
        item.status = 'paused';
        await this.updateItem(item);
        continue;
      }

      this.currentItem = item;
      try {
        await this.processItem(item);
        result.downloaded++;
        
        item.status = 'completed';
        item.progress = undefined; // Clear progress on completion
        await this.saveQueue(queue);
        
      } catch (error) {
        // If paused during download, mark as paused instead of failed
        if (this.isPausedFlag) {
          item.status = 'paused';
          await this.updateItem(item);
          continue;
        }
        
        console.error(`Failed to process ${item.packageName}@${item.version}:`, error);
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : String(error);
        item.progress = undefined;
        result.failed++;
        result.errors.push(`${item.packageName}@${item.version}: ${item.error}`);
        await this.saveQueue(queue);
      }
    }

    this.currentItem = null;
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
  async getStatus(): Promise<{ pending: number; downloading: number; completed: number; failed: number; paused: number }> {
    const queue = await this.loadQueue();
    return {
      pending: queue.filter(item => item.status === 'pending').length,
      downloading: queue.filter(item => item.status === 'downloading').length,
      completed: queue.filter(item => item.status === 'completed').length,
      failed: queue.filter(item => item.status === 'failed').length,
      paused: queue.filter(item => item.status === 'paused').length
    };
  }

  /**
   * Pauses the queue processing.
   * Current download will be marked as paused and can be resumed later.
   */
  async pause(): Promise<void> {
    this.isPausedFlag = true;
    
    // Mark current item as paused if downloading
    if (this.currentItem && this.currentItem.status === 'downloading') {
      this.currentItem.status = 'paused';
      await this.updateItem(this.currentItem);
    }
  }

  /**
   * Resumes the queue processing.
   * Paused items will be reset to pending status.
   */
  async resume(): Promise<void> {
    this.isPausedFlag = false;
    await this.resumePausedItems();
  }

  /**
   * Checks if the queue is currently paused.
   * @returns True if paused, false otherwise
   */
  async isPaused(): Promise<boolean> {
    return this.isPausedFlag;
  }

  /**
   * Resumes all paused items by resetting them to pending.
   */
  private async resumePausedItems(): Promise<void> {
    const queue = await this.loadQueue();
    let updated = false;
    
    for (const item of queue) {
      if (item.status === 'paused') {
        item.status = 'pending';
        // Keep progress information for display
        updated = true;
      }
    }
    
    if (updated) {
      await this.saveQueue(queue);
    }
  }

  /**
   * Processes a single queue item by downloading and caching the package.
   * @param item - Queue item to process
   */
  private async processItem(item: QueueItem): Promise<void> {
    item.status = 'downloading';
    item.progress = { downloaded: 0, total: 0, percentage: 0 };
    await this.updateItem(item);

    try {
      const manager = PackageManagerFactory.getManager(item.manager);
      
      const packageInfo = await manager.getPackageInfo(item.packageName, item.version);
      
      // Download with progress tracking
      const progressCallback = (downloaded: number, total: number) => {
        if (!this.isPausedFlag) {
          item.progress = {
            downloaded,
            total,
            percentage: total > 0 ? Math.round((downloaded / total) * 100) : 0
          };
          // Update progress periodically (every 5% or 1MB)
          if (item.progress.percentage % 5 === 0 || downloaded % (1024 * 1024) === 0) {
            this.updateItem(item).catch(() => {
              // Ignore update errors
            });
          }
        }
      };
      
      const packagePath = await manager.downloadPackage(item.packageName, item.version, progressCallback);
      
      // Check if paused during download
      if (this.isPausedFlag) {
        throw new Error('Download paused by user');
      }
      
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
      // Don't mark as failed if it was paused
      if (!this.isPausedFlag) {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : String(error);
        item.progress = undefined;
        await this.updateItem(item);
      }
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
        queuedAt: new Date(item.queuedAt),
        progress: item.progress ? {
          downloaded: item.progress.downloaded || 0,
          total: item.progress.total || 0,
          percentage: item.progress.percentage || 0
        } : undefined
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
