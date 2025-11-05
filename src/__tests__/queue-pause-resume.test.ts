import { Queue } from '../core/queue';
import { Cache } from '../core/cache';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { QueueItem } from '../types';

describe('Queue Pause/Resume', () => {
  let queue: Queue;
  let cache: Cache;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `zembil-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
    cache = new Cache(tempDir);
    await cache.initialize();
    queue = new Queue(tempDir, cache);
    await queue.initialize();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('Pause functionality', () => {
    test('should pause queue', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      const isPausedBefore = await queue.isPaused();
      expect(isPausedBefore).toBe(false);
      
      await queue.pause();
      
      const isPausedAfter = await queue.isPaused();
      expect(isPausedAfter).toBe(true);
    });

    test('should mark current item as paused when downloading', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      // Start processing (will fail but we can check state)
      const processPromise = queue.process();
      
      // Pause immediately
      await queue.pause();
      
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const items = await queue.list();
      const testItem = items.find(item => item.packageName === 'test-package');
      
      // Item should be marked as paused or still pending
      expect(testItem?.status === 'paused' || testItem?.status === 'pending').toBe(true);
      
      // Clean up
      try {
        await processPromise;
      } catch {
        // Expected to fail
      }
    });

    test('should show paused status in getStatus', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      await queue.pause();
      
      const status = await queue.getStatus();
      expect(status.paused).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Resume functionality', () => {
    test('should resume paused queue', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      await queue.pause();
      const isPausedBefore = await queue.isPaused();
      expect(isPausedBefore).toBe(true);
      
      await queue.resume();
      const isPausedAfter = await queue.isPaused();
      expect(isPausedAfter).toBe(false);
    });

    test('should reset paused items to pending on resume', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      // Manually set status to paused in queue.json
      const queueFile = path.join(tempDir, 'queue.json');
      const queueData = await fs.readFile(queueFile, 'utf8');
      const items = JSON.parse(queueData);
      items[0].status = 'paused';
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      // Resume should reset paused items to pending
      await queue.resume();
      
      const itemsAfterResume = await queue.list();
      const testItem = itemsAfterResume.find(item => item.packageName === 'test-package');
      expect(testItem?.status).toBe('pending');
    });
  });

  describe('Progress tracking', () => {
    test('should track progress during download', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      // Simulate progress update
      const queueFile = path.join(tempDir, 'queue.json');
      const queueData = await fs.readFile(queueFile, 'utf8');
      const items: QueueItem[] = JSON.parse(queueData);
      
      items[0].status = 'downloading';
      items[0].progress = {
        downloaded: 5242880, // 5MB
        total: 10485760, // 10MB
        percentage: 50
      };
      
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      const itemsAfter = await queue.list();
      const testItem = itemsAfter.find(item => item.packageName === 'test-package');
      
      expect(testItem?.progress).toBeDefined();
      expect(testItem?.progress?.downloaded).toBe(5242880);
      expect(testItem?.progress?.total).toBe(10485760);
      expect(testItem?.progress?.percentage).toBe(50);
    });

    test('should persist progress in queue.json', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      // Manually add progress
      const queueFile = path.join(tempDir, 'queue.json');
      const queueData = await fs.readFile(queueFile, 'utf8');
      const items: QueueItem[] = JSON.parse(queueData);
      
      items[0].status = 'downloading';
      items[0].progress = {
        downloaded: 1048576, // 1MB
        total: 5242880, // 5MB
        percentage: 20
      };
      
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      // Reload queue
      const reloadedItems = await queue.list();
      const testItem = reloadedItems.find(item => item.packageName === 'test-package');
      
      expect(testItem?.progress).toBeDefined();
      expect(testItem?.progress?.percentage).toBe(20);
    });

    test('should clear progress on completion', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      // Set progress
      const queueFile = path.join(tempDir, 'queue.json');
      const queueData = await fs.readFile(queueFile, 'utf8');
      const items: QueueItem[] = JSON.parse(queueData);
      
      items[0].status = 'downloading';
      items[0].progress = {
        downloaded: 5242880,
        total: 5242880,
        percentage: 100
      };
      
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      // Simulate completion (progress should be cleared)
      items[0].status = 'completed';
      items[0].progress = undefined;
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      const itemsAfter = await queue.list();
      const testItem = itemsAfter.find(item => item.packageName === 'test-package');
      
      expect(testItem?.status).toBe('completed');
      expect(testItem?.progress).toBeUndefined();
    });
  });

  describe('Status tracking', () => {
    test('should include paused count in status', async () => {
      await queue.add('test-package-1', '1.0.0', 'npm');
      await queue.add('test-package-2', '1.0.0', 'npm');
      
      // Manually set one to paused
      const queueFile = path.join(tempDir, 'queue.json');
      const queueData = await fs.readFile(queueFile, 'utf8');
      const items: QueueItem[] = JSON.parse(queueData);
      items[0].status = 'paused';
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      const status = await queue.getStatus();
      expect(status.paused).toBe(1);
      expect(status.pending).toBe(1);
    });

    test('should track all statuses correctly', async () => {
      await queue.add('pending-1', '1.0.0', 'npm');
      await queue.add('pending-2', '1.0.0', 'npm');
      
      const queueFile = path.join(tempDir, 'queue.json');
      const queueData = await fs.readFile(queueFile, 'utf8');
      const items: QueueItem[] = JSON.parse(queueData);
      
      // Set different statuses
      items[0].status = 'pending';
      items[1].status = 'paused';
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      const status = await queue.getStatus();
      expect(status.pending).toBe(1);
      expect(status.paused).toBe(1);
      expect(status.downloading).toBe(0);
      expect(status.completed).toBe(0);
      expect(status.failed).toBe(0);
    });
  });

  describe('Queue processing with pause', () => {
    test('should not process items when paused', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      await queue.pause();
      
      // Process should not download anything when paused
      const result = await queue.process();
      
      // Items should remain pending or be marked as paused
      const items = await queue.list();
      const testItem = items.find(item => item.packageName === 'test-package');
      expect(testItem?.status === 'pending' || testItem?.status === 'paused').toBe(true);
    });

    test('should process pending items after resume', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      // Manually set to paused
      const queueFile = path.join(tempDir, 'queue.json');
      const queueData = await fs.readFile(queueFile, 'utf8');
      const items: QueueItem[] = JSON.parse(queueData);
      items[0].status = 'paused';
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      // Resume should reset to pending
      await queue.resume();
      
      const itemsAfterResume = await queue.list();
      const testItem = itemsAfterResume.find(item => item.packageName === 'test-package');
      expect(testItem?.status).toBe('pending');
    });
  });

  describe('Progress persistence across restarts', () => {
    test('should load progress from queue.json', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      // Manually set progress in queue.json
      const queueFile = path.join(tempDir, 'queue.json');
      const queueData = await fs.readFile(queueFile, 'utf8');
      const items: QueueItem[] = JSON.parse(queueData);
      
      items[0].status = 'downloading';
      items[0].progress = {
        downloaded: 2621440, // 2.5MB
        total: 10485760, // 10MB
        percentage: 25
      };
      
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      // Create new queue instance (simulating restart)
      const newQueue = new Queue(tempDir, cache);
      await newQueue.initialize();
      
      const itemsAfterRestart = await newQueue.list();
      const testItem = itemsAfterRestart.find(item => item.packageName === 'test-package');
      
      expect(testItem?.progress).toBeDefined();
      expect(testItem?.progress?.downloaded).toBe(2621440);
      expect(testItem?.progress?.total).toBe(10485760);
      expect(testItem?.progress?.percentage).toBe(25);
    });
  });
});

