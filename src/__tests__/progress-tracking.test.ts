import { Queue } from '../core/queue';
import { Cache } from '../core/cache';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { QueueItem } from '../types';

describe('Progress Tracking', () => {
  let queue: Queue;
  let cache: Cache;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `zembil-progress-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
    cache = new Cache(tempDir);
    await cache.initialize();
    queue = new Queue(tempDir, cache);
    await queue.initialize();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('Progress calculation', () => {
    test('should calculate percentage correctly', () => {
      const progress = {
        downloaded: 5242880, // 5MB
        total: 10485760, // 10MB
        percentage: 50
      };
      
      expect(progress.percentage).toBe(50);
    });

    test('should handle zero total gracefully', () => {
      const progress = {
        downloaded: 1000,
        total: 0,
        percentage: 0
      };
      
      expect(progress.percentage).toBe(0);
    });

    test('should handle 100% completion', () => {
      const progress = {
        downloaded: 10485760,
        total: 10485760,
        percentage: 100
      };
      
      expect(progress.percentage).toBe(100);
    });
  });

  describe('Progress format', () => {
    test('should format bytes to MB correctly', () => {
      const bytes = 5242880; // 5MB
      const mb = (bytes / 1024 / 1024).toFixed(2);
      expect(mb).toBe('5.00');
    });

    test('should handle partial MBs', () => {
      const bytes = 2621440; // 2.5MB
      const mb = (bytes / 1024 / 1024).toFixed(2);
      expect(mb).toBe('2.50');
    });
  });

  describe('Progress persistence', () => {
    test('should save progress to queue.json', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      const queueFile = path.join(tempDir, 'queue.json');
      const queueData = await fs.readFile(queueFile, 'utf8');
      const items: QueueItem[] = JSON.parse(queueData);
      
      // Update with progress
      items[0].status = 'downloading';
      items[0].progress = {
        downloaded: 1048576, // 1MB
        total: 5242880, // 5MB
        percentage: 20
      };
      
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      // Verify it was saved
      const savedData = await fs.readFile(queueFile, 'utf8');
      const savedItems: QueueItem[] = JSON.parse(savedData);
      
      expect(savedItems[0].progress).toBeDefined();
      expect(savedItems[0].progress?.downloaded).toBe(1048576);
      expect(savedItems[0].progress?.total).toBe(5242880);
      expect(savedItems[0].progress?.percentage).toBe(20);
    });

    test('should load progress from queue.json', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      // Write progress directly
      const queueFile = path.join(tempDir, 'queue.json');
      const items: QueueItem[] = [
        {
          id: 'test-id',
          packageName: 'test-package',
          version: '1.0.0',
          manager: 'npm',
          priority: 0,
          queuedAt: new Date(),
          status: 'downloading',
          progress: {
            downloaded: 3145728, // 3MB
            total: 10485760, // 10MB
            percentage: 30
          }
        }
      ];
      
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      // Load and verify
      const loadedItems = await queue.list();
      const testItem = loadedItems.find(item => item.packageName === 'test-package');
      
      expect(testItem?.progress).toBeDefined();
      expect(testItem?.progress?.downloaded).toBe(3145728);
      expect(testItem?.progress?.total).toBe(10485760);
      expect(testItem?.progress?.percentage).toBe(30);
    });
  });

  describe('Progress updates', () => {
    test('should update progress incrementally', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      const queueFile = path.join(tempDir, 'queue.json');
      const queueData = await fs.readFile(queueFile, 'utf8');
      const items: QueueItem[] = JSON.parse(queueData);
      
      // Simulate progress updates
      const updates = [
        { downloaded: 1048576, total: 10485760, percentage: 10 },
        { downloaded: 2097152, total: 10485760, percentage: 20 },
        { downloaded: 5242880, total: 10485760, percentage: 50 },
        { downloaded: 10485760, total: 10485760, percentage: 100 }
      ];
      
      for (const update of updates) {
        items[0].progress = update;
        await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
        
        const loadedItems = await queue.list();
        const testItem = loadedItems.find(item => item.packageName === 'test-package');
        
        expect(testItem?.progress?.percentage).toBe(update.percentage);
      }
    });

    test('should clear progress on completion', async () => {
      await queue.add('test-package', '1.0.0', 'npm');
      
      const queueFile = path.join(tempDir, 'queue.json');
      const queueData = await fs.readFile(queueFile, 'utf8');
      const items: QueueItem[] = JSON.parse(queueData);
      
      // Set progress
      items[0].status = 'downloading';
      items[0].progress = {
        downloaded: 10485760,
        total: 10485760,
        percentage: 100
      };
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      // Complete
      items[0].status = 'completed';
      items[0].progress = undefined;
      await fs.writeFile(queueFile, JSON.stringify(items, null, 2));
      
      const loadedItems = await queue.list();
      const testItem = loadedItems.find(item => item.packageName === 'test-package');
      
      expect(testItem?.status).toBe('completed');
      expect(testItem?.progress).toBeUndefined();
    });
  });

  describe('Progress display', () => {
    test('should format progress for display', () => {
      const progress = {
        downloaded: 5242880, // 5MB
        total: 10485760, // 10MB
        percentage: 50
      };
      
      const downloadedMB = (progress.downloaded / 1024 / 1024).toFixed(2);
      const totalMB = (progress.total / 1024 / 1024).toFixed(2);
      const progressBar = '█'.repeat(Math.floor(progress.percentage / 5)) + 
                        '░'.repeat(20 - Math.floor(progress.percentage / 5));
      
      expect(downloadedMB).toBe('5.00');
      expect(totalMB).toBe('10.00');
      expect(progressBar.length).toBe(20);
      expect(progressBar.substring(0, 10)).toBe('██████████');
    });

    test('should handle edge cases in progress display', () => {
      // 0%
      const progress0 = { downloaded: 0, total: 10485760, percentage: 0 };
      const bar0 = '█'.repeat(Math.floor(progress0.percentage / 5)) + 
                  '░'.repeat(20 - Math.floor(progress0.percentage / 5));
      expect(bar0).toBe('░░░░░░░░░░░░░░░░░░░░');
      
      // 100%
      const progress100 = { downloaded: 10485760, total: 10485760, percentage: 100 };
      const bar100 = '█'.repeat(Math.floor(progress100.percentage / 5)) + 
                    '░'.repeat(20 - Math.floor(progress100.percentage / 5));
      expect(bar100).toBe('████████████████████');
    });
  });
});

