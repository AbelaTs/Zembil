import { Queue } from '../core/queue';
import { Cache } from '../core/cache';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('Queue Cancel', () => {
  let testCacheDir: string;
  let queue: Queue;
  let cache: Cache;

  beforeEach(async () => {
    testCacheDir = path.join(__dirname, 'test-cache-cancel');
    await fs.ensureDir(testCacheDir);
    
    // Create a mock database file
    const dbPath = path.join(testCacheDir, 'cache.db');
    await fs.ensureFile(dbPath);
    
    cache = new Cache(testCacheDir);
    await cache.initialize();
    queue = new Queue(testCacheDir, cache);
    await queue.initialize();
  });

  afterEach(async () => {
    await fs.remove(testCacheDir);
  });

  it('should cancel a package by name', async () => {
    await queue.add('test-package', '1.0.0', 'npm', 0);
    await queue.add('other-package', '2.0.0', 'npm', 0);
    await queue.add('test-package', '1.1.0', 'npm', 0);

    const cancelled = await queue.cancel('test-package');
    expect(cancelled).toBe(2);

    const items = await queue.list();
    expect(items).toHaveLength(1);
    expect(items[0].packageName).toBe('other-package');
  });

  it('should cancel a specific version', async () => {
    await queue.add('test-package', '1.0.0', 'npm', 0);
    await queue.add('test-package', '1.1.0', 'npm', 0);
    await queue.add('test-package', '2.0.0', 'npm', 0);

    const cancelled = await queue.cancel('test-package', '1.1.0');
    expect(cancelled).toBe(1);

    const items = await queue.list();
    expect(items).toHaveLength(2);
    expect(items.some(item => item.version === '1.1.0')).toBe(false);
  });

  it('should return 0 if package not found', async () => {
    await queue.add('test-package', '1.0.0', 'npm', 0);

    const cancelled = await queue.cancel('nonexistent', '1.0.0');
    expect(cancelled).toBe(0);

    const items = await queue.list();
    expect(items).toHaveLength(1);
  });

  it('should cancel all pending downloads', async () => {
    await queue.add('package1', '1.0.0', 'npm', 0);
    await queue.add('package2', '2.0.0', 'npm', 0);
    
    // Manually set status to completed for one item
    const items = await queue.list();
    items[0].status = 'completed';
    await (queue as any).db.saveQueueItem(items[0]);

    const cancelled = await queue.cancelAll();
    expect(cancelled).toBe(1); // Only pending items cancelled

    const remaining = await queue.list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].status).toBe('completed');
  });

  it('should cancel all pending and paused items', async () => {
    await queue.add('package1', '1.0.0', 'npm', 0);
    await queue.add('package2', '2.0.0', 'npm', 0);
    
    // Set different statuses
    const items = await queue.list();
    items[0].status = 'pending';
    items[1].status = 'paused';
    await (queue as any).db.saveQueueItem(items[0]);
    await (queue as any).db.saveQueueItem(items[1]);

    const cancelled = await queue.cancelAll();
    expect(cancelled).toBe(2);

    const remaining = await queue.list();
    expect(remaining).toHaveLength(0);
  });

  it('should preserve completed and failed items', async () => {
    await queue.add('package1', '1.0.0', 'npm', 0);
    await queue.add('package2', '2.0.0', 'npm', 0);
    
    // Set statuses
    const items = await queue.list();
    items[0].status = 'completed';
    items[1].status = 'failed';
    await (queue as any).db.saveQueueItem(items[0]);
    await (queue as any).db.saveQueueItem(items[1]);

    const cancelled = await queue.cancelAll();
    expect(cancelled).toBe(0); // No pending items to cancel

    const remaining = await queue.list();
    expect(remaining).toHaveLength(2);
  });
});

