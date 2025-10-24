import { Zembil } from '../zembil';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('Zembil', () => {
  let zembil: Zembil;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), 'zembil-test');
    await fs.ensureDir(tempDir);
    zembil = new Zembil(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  test('should initialize successfully', async () => {
    await expect(zembil.initialize()).resolves.not.toThrow();
  });

  test('should create cache directory structure', async () => {
    await zembil.initialize();
    
    expect(await fs.pathExists(path.join(tempDir, 'packages'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, 'docs'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, 'examples'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, 'cache.db'))).toBe(true);
  });

  test('should add package to queue', async () => {
    await zembil.initialize();
    
    const id = await zembil.queue.add('react', '18.2.0', 'npm', 1);
    expect(id).toBeDefined();
    
    const items = await zembil.queue.list();
    expect(items).toHaveLength(1);
    expect(items[0].packageName).toBe('react');
    expect(items[0].version).toBe('18.2.0');
    expect(items[0].manager).toBe('npm');
  });

  test('should remove package from queue', async () => {
    await zembil.initialize();
    
    const id = await zembil.queue.add('react', '18.2.0', 'npm');
    const removed = await zembil.queue.remove(id);
    
    expect(removed).toBe(true);
    
    const items = await zembil.queue.list();
    expect(items).toHaveLength(0);
  });

  test('should get queue status', async () => {
    await zembil.initialize();
    
    await zembil.queue.add('react', '18.2.0', 'npm');
    const status = await zembil.queue.getStatus();
    
    expect(status.pending).toBe(1);
    expect(status.downloading).toBe(0);
    expect(status.completed).toBe(0);
    expect(status.failed).toBe(0);
  });

  test('should clear queue', async () => {
    await zembil.initialize();
    
    await zembil.queue.add('react', '18.2.0', 'npm');
    await zembil.queue.add('express', '4.18.0', 'npm');
    
    await zembil.queue.clear();
    
    const items = await zembil.queue.list();
    expect(items).toHaveLength(0);
  });

  test('should get cache directory', () => {
    expect(zembil.getCacheDir()).toBe(tempDir);
  });

  test('should get default configuration', () => {
    const config = zembil.getConfig();
    
    expect(config.cacheDir).toBe(tempDir);
    expect(config.maxSize).toBeGreaterThan(0);
    expect(config.enableDocumentation).toBe(true);
    expect(config.enableExamples).toBe(true);
  });

  test('should update configuration', async () => {
    await zembil.initialize();
    
    await zembil.setMaxSize(1024 * 1024 * 1024); // 1GB
    await zembil.setOfflineMode(true);
    await zembil.setSyncInterval(30);
    
    const config = zembil.getConfig();
    expect(config.maxSize).toBe(1024 * 1024 * 1024);
    expect(config.offlineMode).toBe(true);
    expect(config.syncInterval).toBe(30);
  });
});
