import * as fs from 'fs-extra';
import * as path from 'path';
import { QueueInterface, QueueItem, PackageManager, SyncResult } from '../types';
import { PackageManagerFactory } from '../managers';
import { Cache } from './cache';
import { Database } from './database';

/**
 * Queue system for managing package downloads with priority and retry logic.
 * Handles batch processing and error recovery for offline package caching.
 */
export class Queue implements QueueInterface {
  private cache: Cache;
  private db: Database;
  private isPausedFlag: boolean = false;
  private activeItems: QueueItem[] = [];

  /**
   * Creates a new Queue instance.
   * @param cacheDir - Cache directory path
   * @param cache - Cache instance for storing packages
   * @param db - Database instance
   */
  constructor(cacheDir: string, cache: Cache, db?: Database) {
    this.cache = cache;
    this.db = db || new Database(path.join(cacheDir, 'cache.db'));
  }

  /**
   * Initializes the queue system.
   */
  async initialize(): Promise<void> {
    // Database initialization handles table creation
    await this.db.initialize();
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

    const queue = await this.db.listQueueItems();
    
    const existing = queue.find(item => 
      item.packageName === packageName && 
      item.version === version && 
      item.manager === manager
    );
    
    if (existing) {
      throw new Error(`Package ${packageName}@${version} is already queued`);
    }

    await this.db.saveQueueItem(queueItem);
    return id;
  }

  /**
   * Removes a package from the queue.
   * @param id - Queue item ID
   * @returns True if package was removed, false if not found
   */
  async remove(id: string): Promise<boolean> {
    const item = await this.db.getQueueItem(id);
    if (!item) {
      return false;
    }

    await this.db.removeQueueItem(id);
    return true;
  }

  /**
   * Cancels a package from the queue by name.
   * @param packageName - Name of the package to cancel
   * @param version - Optional version (cancels all versions if not specified)
   * @returns Number of packages cancelled
   */
  async cancel(packageName: string, version?: string): Promise<number> {
    const queue = await this.db.listQueueItems();
    
    const toRemove = queue.filter(item => {
      if (item.packageName !== packageName) return false;
      if (version && item.version !== version) return false;
      return true; // Cancel this item
    });

    for (const item of toRemove) {
        await this.db.removeQueueItem(item.id);
    }

    return toRemove.length;
  }

  /**
   * Cancels all pending/interrupted downloads.
   * @returns Number of packages cancelled
   */
  async cancelAll(): Promise<number> {
    const queue = await this.db.listQueueItems();
    
    // Keep only completed and failed items
    const toRemove = queue.filter(item => 
      item.status !== 'completed' && item.status !== 'failed'
    );

    for (const item of toRemove) {
        await this.db.removeQueueItem(item.id);
    }

    return toRemove.length;
  }

  /**
   * Lists all queued packages sorted by priority.
   * @returns Array of queue items
   */
  async list(): Promise<QueueItem[]> {
    return await this.db.listQueueItems();
  }

  /**
   * Processes all pending items in the queue.
   * Downloads packages and stores them in the cache.
   * Supports pause/resume functionality.
   * @param concurrency - Number of concurrent downloads (default: 3)
   * @returns Sync result with download statistics
   */
  async process(concurrency: number = 3): Promise<SyncResult> {
    const queue = await this.db.listQueueItems();
    const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'paused');
    
    const result: SyncResult = {
      success: true,
      downloaded: 0,
      failed: 0,
      errors: [],
      totalSize: 0
    };

    // Don't reset pause flag if already paused - allows pause() before process()
    // Only reset if not paused
    if (this.isPausedFlag) {
      // Check if items are already paused in queue
      const pausedItems = queue.filter(item => item.status === 'paused');
      if (pausedItems.length > 0) {
        // Items already paused, just return
        return result;
      }
    } else {
      this.isPausedFlag = false;
    }

    const processSingleItem = async (item: QueueItem) => {
        // Double-check item status in saved queue
        const currentItem = await this.db.getQueueItem(item.id);
        if (currentItem && currentItem.status === 'paused') {
            return;
        }

        this.activeItems.push(item);
        
        try {
            await this.processItem(item);
            result.downloaded++;
            
            item.status = 'completed';
            item.progress = undefined; // Clear progress on completion
            await this.db.saveQueueItem(item);
            
        } catch (error) {
            // Check if paused during processing
            if (this.isPausedFlag || (error instanceof Error && error.message === 'Paused')) {
                item.status = 'paused';
                await this.updateItem(item);
                return;
            }
            
            // If interrupted (network error, user cancellation, etc.), automatically track it
            // Progress is already saved, so we keep it for resume
            const isNetworkError = error instanceof Error && (
                error.message.includes('network') || 
                error.message.includes('fetch') ||
                error.message.includes('ECONNREFUSED') ||
                error.message.includes('ETIMEDOUT') ||
                error.message.includes('aborted') ||
                error.message.includes('ECONNRESET')
            );
            
            // If it's a network error or interruption, keep progress and mark as pending for retry
            if (isNetworkError || item.progress) {
                // Progress is preserved - will retry on next sync automatically
                item.status = 'pending';
                item.error = error instanceof Error ? error.message : String(error);
                await this.updateItem(item);
                return;
            }
            
            // Real failures (not interruptions) - mark as failed
            console.error(`Failed to process ${item.packageName}@${item.version}:`, error);
            item.status = 'failed';
            item.error = error instanceof Error ? error.message : String(error);
            item.progress = undefined;
            result.failed++;
            result.errors.push(`${item.packageName}@${item.version}: ${item.error}`);
            await this.db.saveQueueItem(item);
        } finally {
            this.activeItems = this.activeItems.filter(i => i.id !== item.id);
        }
    };

    // Process in batches
    for (let i = 0; i < pendingItems.length; i += concurrency) {
        if (this.isPausedFlag) break;
        const batch = pendingItems.slice(i, i + concurrency);
        await Promise.all(batch.map(item => processSingleItem(item)));
    }

    result.success = result.failed === 0;
    return result;
  }

  /**
   * Clears all items from the queue.
   */
  async clear(): Promise<void> {
    await this.db.clearQueue();
  }

  /**
   * Gets the current status of the queue.
   * @returns Queue status with counts for each state
   */
  async getStatus(): Promise<{ pending: number; downloading: number; completed: number; failed: number; paused: number }> {
    const queue = await this.db.listQueueItems();
    return {
      pending: queue.filter(item => item.status === 'pending').length,
      downloading: queue.filter(item => item.status === 'downloading').length,
      completed: queue.filter(item => item.status === 'completed').length,
      failed: queue.filter(item => item.status === 'failed').length,
      paused: queue.filter(item => item.status === 'paused').length
    };
  }

  /**
   * Retries interrupted/failed items.
   * Resets interrupted items to pending so they can be retried.
   */
  async resume(): Promise<void> {
    this.isPausedFlag = false;
    const queue = await this.db.listQueueItems();
    
    for (const item of queue) {
      // Retry interrupted items (they have progress saved)
      if (item.status === 'paused' || (item.status === 'failed' && item.progress)) {
        item.status = 'pending';
        // Keep progress for resume
        await this.db.saveQueueItem(item);
      }
    }
  }
  
  /**
   * @deprecated Manual pause is not needed - interruptions are automatically tracked.
   * Use Ctrl+C to interrupt, progress is saved automatically.
   */
  async pause(): Promise<void> {
    this.isPausedFlag = true;
    
    // Mark current downloading items as paused
    for (const item of this.activeItems) {
        if (item.status === 'downloading' || item.status === 'pending') {
            item.status = 'paused';
            await this.updateItem(item);
        }
    }
    
    // Also mark pending and downloading items as paused in queue
    const queue = await this.db.listQueueItems();
    for (const item of queue) {
      if (item.status === 'pending' || item.status === 'downloading') {
        item.status = 'paused';
        await this.db.saveQueueItem(item);
      }
    }
  }

  /**
   * Checks if the queue is currently paused.
   * @returns True if paused, false otherwise
   */
  async isPaused(): Promise<boolean> {
    return this.isPausedFlag;
  }


  /**
   * Processes a single queue item by downloading and caching the package.
   * @param item - Queue item to process
   */
  private async processItem(item: QueueItem): Promise<void> {
    // Check if paused before starting
    if (this.isPausedFlag) {
      item.status = 'paused';
      await this.updateItem(item);
      throw new Error('Paused');
    }
    
    // Check again after update (pause might have been called)
    if (this.isPausedFlag) {
      item.status = 'paused';
      await this.updateItem(item);
      throw new Error('Paused');
    }
    
    item.status = 'downloading';
    item.progress = { downloaded: 0, total: 0, percentage: 0 };
    await this.updateItem(item);

    // Check once more before starting download
    if (this.isPausedFlag) {
      item.status = 'paused';
      await this.updateItem(item);
      throw new Error('Paused');
    }

    const manager = PackageManagerFactory.getManager(item.manager);
    
    const packageInfo = await manager.getPackageInfo(item.packageName, item.version);
    
    // Download with progress tracking - automatically saves progress
    const progressCallback = (downloaded: number, total: number) => {
      item.progress = {
        downloaded,
        total,
        percentage: total > 0 ? Math.round((downloaded / total) * 100) : 0
      };
      // Update progress periodically (every 5% or 1MB) - automatically saved
      if (item.progress.percentage % 5 === 0 || downloaded % (1024 * 1024) === 0) {
        this.updateItem(item).catch(() => {
          // Ignore update errors - progress will be saved on interruption
        });
      }
    };
    
    const packagePath = await manager.downloadPackage(item.packageName, item.version, progressCallback);
    
    // Progress is automatically saved during download
    // If interrupted, it will be caught and progress preserved
    
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
  }

  /**
   * Updates a queue item in the database.
   * @param item - Queue item to update
   */
  private async updateItem(item: QueueItem): Promise<void> {
    await this.db.saveQueueItem(item);
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
