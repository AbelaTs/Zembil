# Zembil Developer Guide

This guide explains how to use Zembil as a library in your applications and how to extend it with custom functionality.

## Table of Contents

1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [API Reference](#api-reference)
4. [Advanced Usage](#advanced-usage)
5. [Extending Zembil](#extending-zembil)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Installation

### As a Library

```bash
npm install zembil
```

### TypeScript Support

```bash
npm install zembil
npm install -D @types/node
```

## Basic Usage

### Import and Initialize

```typescript
import { Zembil } from 'zembil';
import * as path from 'path';
import * as os from 'os';

// Initialize Zembil with custom cache directory
const cacheDir = path.join(os.homedir(), '.zembil');
const zembil = new Zembil(cacheDir);

// Initialize the cache system
await zembil.initialize();
```

### Queue Packages

```typescript
// Queue packages for download
const queueId1 = await zembil.queue.add('react', '18.2.0', 'npm', 10); // High priority
const queueId2 = await zembil.queue.add('express', '4.18.0', 'npm', 5); // Medium priority
const queueId3 = await zembil.queue.add('lodash', '4.17.21', 'npm', 1); // Low priority

console.log('Queued packages:', await zembil.queue.list());
```

### Download and Cache Packages

```typescript
// Download all queued packages
await zembil.sync();

// Check cache status
const status = await zembil.queue.getStatus();
console.log(`Downloaded: ${status.completed}, Failed: ${status.failed}`);
```

### Install from Cache

```typescript
// Install packages from cache (works offline!)
await zembil.install(['react', 'express', 'lodash'], {
  targetDir: './node_modules',
  manager: 'npm',
});
```

## API Reference

### Zembil Class

#### Constructor

```typescript
constructor(cacheDir: string, options?: ZembilOptions)
```

**Parameters:**

- `cacheDir`: Directory path for cache storage
- `options`: Optional configuration object

#### Methods

##### `initialize(): Promise<void>`

Initializes the cache system and creates necessary directories.

##### `sync(): Promise<void>`

Downloads all queued packages and their documentation.

##### `install(packages: string[], options?: InstallOptions): Promise<void>`

Installs packages from cache.

**Parameters:**

- `packages`: Array of package names to install
- `options`: Installation options

```typescript
interface InstallOptions {
  targetDir?: string; // Installation directory
  manager?: string; // Package manager to use
  includeDocs?: boolean; // Include documentation
  includeExamples?: boolean; // Include examples
}
```

### Queue System

#### `zembil.queue.add(name: string, version: string, manager: string, priority?: number): Promise<string>`

Adds a package to the download queue.

#### `zembil.queue.remove(id: string): Promise<boolean>`

Removes a package from the queue.

#### `zembil.queue.list(): Promise<QueueItem[]>`

Lists all queued packages.

#### `zembil.queue.getStatus(): Promise<QueueStatus>`

Gets queue status information including paused count.

```typescript
const status = await zembil.queue.getStatus();
console.log(`Pending: ${status.pending}`);
console.log(`Paused: ${status.paused}`);
console.log(`Downloading: ${status.downloading}`);
console.log(`Completed: ${status.completed}`);
console.log(`Failed: ${status.failed}`);
```

#### `zembil.queue.resume(): Promise<void>`

Retries interrupted downloads. Interruptions are automatically tracked - use this to explicitly mark interrupted items for retry.

```typescript
await zembil.queue.resume();
console.log('Interrupted downloads ready to retry');
```

**Note:** Interruptions (network errors, Ctrl+C, etc.) are automatically tracked. Progress is saved automatically. You can just run `sync()` again to retry, or use `resume()` to explicitly mark items for retry.

#### `zembil.queue.cancel(packageName: string, version?: string): Promise<number>`

Cancels a package from the queue by name. Returns the number of packages cancelled.

```typescript
// Cancel all versions of a package
const count = await zembil.queue.cancel('react');
console.log(`Cancelled ${count} package(s)`);

// Cancel specific version
const count = await zembil.queue.cancel('react', '18.2.0');
console.log(`Cancelled ${count} package(s)`);
```

#### `zembil.queue.cancelAll(): Promise<number>`

Cancels all pending/interrupted downloads. Preserves completed and failed items. Returns the number of packages cancelled.

```typescript
const count = await zembil.queue.cancelAll();
console.log(`Cancelled ${count} pending package(s)`);
```

```typescript
interface QueueStatus {
  pending: number;
  downloading: number;
  completed: number;
  failed: number;
  paused: number;
}
```

### Cache System

#### `zembil.cache.get(name: string, version: string): Promise<CachedPackage | null>`

Retrieves a cached package.

#### `zembil.cache.list(): Promise<CachedPackage[]>`

Lists all cached packages.

#### `zembil.cache.remove(name: string, version: string): Promise<boolean>`

Removes a package from cache.

#### `zembil.cache.exists(name: string, version: string): Promise<boolean>`

Checks if a package exists in cache.

#### `zembil.cache.getSize(): Promise<number>`

Gets total cache size in bytes.

#### `zembil.cache.cleanup(): Promise<void>`

Cleans up orphaned files.

#### `zembil.cache.cleanAll(): Promise<number>`

Removes all packages from cache. Returns the number of packages removed.

```typescript
const count = await zembil.cache.cleanAll();
console.log(`Cleaned ${count} package(s) from cache`);
```

#### `zembil.cache.cleanPackage(packageName: string): Promise<number>`

Removes all versions of a specific package from cache. Returns the number of versions removed.

```typescript
const count = await zembil.cache.cleanPackage('react');
console.log(`Cleaned ${count} version(s) of react from cache`);
```

### Configuration

#### `zembil.getConfig(): ZembilConfig`

Gets current configuration.

#### `zembil.setMaxSize(size: number): Promise<void>`

Sets maximum cache size.

#### `zembil.setOfflineMode(enabled: boolean): Promise<void>`

Enables/disables offline mode.

#### `zembil.setSyncInterval(interval: number): Promise<void>`

Sets sync interval in minutes.

## Advanced Usage

### Custom Package Managers

```typescript
import { PackageManager } from 'zembil';

class CustomPackageManager implements PackageManager {
  async downloadPackage(name: string, version: string): Promise<string> {
    // Custom download logic
    return packagePath;
  }

  async installPackage(packagePath: string, targetDir: string): Promise<void> {
    // Custom installation logic
  }

  async getPackageInfo(name: string, version: string): Promise<PackageInfo> {
    // Custom package info retrieval
    return packageInfo;
  }
}

// Register custom manager
zembil.registerManager('custom', new CustomPackageManager());
```

### Automatic Interruption Tracking

```typescript
// Start downloading - interruptions are tracked automatically
await zembil.sync();

// If interrupted (network error, Ctrl+C), progress is automatically saved!
// Check what was interrupted
const items = await zembil.queue.list();
items.forEach(item => {
  if (item.progress && item.status === 'pending') {
    console.log(`${item.packageName}: ${item.progress.percentage}% (interrupted)`);
  }
});

// Resume interrupted downloads (optional - sync will also retry them)
await zembil.queue.resume();
await zembil.sync(); // Continues automatically
```

### Progress Tracking

```typescript
// Get queue items with progress
const items = await zembil.queue.list();
items.forEach(item => {
  if (item.progress) {
    console.log(`${item.packageName}: ${item.progress.percentage}%`);
    console.log(`  Downloaded: ${item.progress.downloaded} bytes`);
    console.log(`  Total: ${item.progress.total} bytes`);
  }
});

// Check status including paused items
const status = await zembil.queue.getStatus();
console.log(`Paused: ${status.paused}`);
console.log(`Downloading: ${status.downloading}`);
```

### Event Handling

```typescript
// Listen to download progress
zembil.on('download:start', (packageName: string) => {
  console.log(`Starting download: ${packageName}`);
});

zembil.on('download:progress', (packageName: string, progress: number) => {
  console.log(`${packageName}: ${progress}%`);
});

zembil.on('download:complete', (packageName: string) => {
  console.log(`Downloaded: ${packageName}`);
});

zembil.on('download:error', (packageName: string, error: Error) => {
  console.error(`Failed to download ${packageName}:`, error.message);
});
```

### Batch Operations

```typescript
// Queue multiple packages at once
const packages = [
  { name: 'react', version: '18.2.0', manager: 'npm', priority: 10 },
  { name: 'express', version: '4.18.0', manager: 'npm', priority: 8 },
  { name: 'lodash', version: '4.17.21', manager: 'npm', priority: 5 },
];

for (const pkg of packages) {
  await zembil.queue.add(pkg.name, pkg.version, pkg.manager, pkg.priority);
}

// Download all at once
await zembil.sync();
```

### Cache Management

```typescript
// Get detailed cache information
const cacheInfo = await zembil.cache.getStats();
console.log(`Total packages: ${cacheInfo.totalPackages}`);
console.log(`Total size: ${(cacheInfo.totalSize / 1024 / 1024).toFixed(2)} MB`);

// Clean up old packages
const packages = await zembil.cache.list();
const oldPackages = packages.filter((pkg) => {
  const daysSinceCached =
    (Date.now() - pkg.cachedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCached > 30; // Older than 30 days
});

for (const pkg of oldPackages) {
  await zembil.cache.remove(pkg.name, pkg.version);
}
```

## Extending Zembil

### Custom Cache Backend

```typescript
import { CacheInterface } from 'zembil';

class CloudCache implements CacheInterface {
  async add(packageInfo: PackageInfo, packagePath: string): Promise<string> {
    // Upload to cloud storage
    const cloudPath = await this.uploadToCloud(packagePath);
    return cloudPath;
  }

  async get(name: string, version: string): Promise<CachedPackage | null> {
    // Download from cloud storage
    return await this.downloadFromCloud(name, version);
  }

  // Implement other methods...
}

// Use custom cache
const zembil = new Zembil(cacheDir, {
  cache: new CloudCache(),
});
```

### Custom Documentation Sources

```typescript
class GitHubDocsProvider {
  async getDocumentation(name: string, version: string): Promise<string> {
    // Fetch documentation from GitHub
    const repoUrl = `https://github.com/${name}/${name}`;
    const docsUrl = `${repoUrl}/blob/v${version}/README.md`;
    return await this.fetchDocumentation(docsUrl);
  }
}
```

### Plugin System

```typescript
interface ZembilPlugin {
  name: string;
  version: string;
  install(zembil: Zembil): void;
  uninstall(): void;
}

class AnalyticsPlugin implements ZembilPlugin {
  name = 'analytics';
  version = '1.0.0';

  install(zembil: Zembil): void {
    zembil.on('download:complete', this.trackDownload);
    zembil.on('install:complete', this.trackInstall);
  }

  private trackDownload(packageName: string): void {
    // Send analytics data
  }

  private trackInstall(packageName: string): void {
    // Send analytics data
  }

  uninstall(): void {
    // Cleanup
  }
}

// Register plugin
zembil.use(new AnalyticsPlugin());
```

## Best Practices

### 1. Error Handling

```typescript
try {
  await zembil.sync();
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    console.log('Network error, will retry later');
    // Queue for retry
  } else if (error.code === 'STORAGE_FULL') {
    console.log('Cache full, cleaning up...');
    await zembil.cache.cleanup();
    // Retry
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### 2. Resource Management

```typescript
// Set appropriate limits
await zembil.setMaxSize(5 * 1024 * 1024 * 1024); // 5GB
await zembil.setSyncInterval(30); // 30 minutes

// Monitor cache usage
const stats = await zembil.cache.getStats();
if (stats.totalSize > 4 * 1024 * 1024 * 1024) {
  // 4GB
  console.log('Cache approaching limit, cleaning up...');
  await zembil.cache.cleanup();
}
```

### 3. Offline-First Design

```typescript
// Check if package is available offline first
if (await zembil.cache.exists('react', '18.2.0')) {
  // Install from cache
  await zembil.install('react', './node_modules');
} else {
  // Queue for download when online
  await zembil.queue.add('react', '18.2.0', 'npm');
  console.log('Package queued for download when online');
}
```

### 4. Automatic Interruption Tracking

```typescript
// Start downloading - interruptions tracked automatically
const syncPromise = zembil.sync();

// Monitor progress
const interval = setInterval(async () => {
  const items = await zembil.queue.list();
  const downloading = items.find(item => item.status === 'downloading');
  if (downloading?.progress) {
    console.log(`${downloading.packageName}: ${downloading.progress.percentage}%`);
  }
}, 1000);

// If interrupted (network error, Ctrl+C), progress is automatically saved!
// Just check status and retry when ready
try {
  await syncPromise;
} catch (error) {
  // Interruption detected - progress already saved
  console.log('Download interrupted, progress saved');
}

// Resume when ready (just run sync again)
await zembil.sync(); // Automatically continues from where it left off
```

### 5. Batch Operations

```typescript
// Queue multiple packages efficiently
const packages = ['react@18.2.0', 'express@4.18.0', 'lodash@4.17.21'];

const queuePromises = packages.map((pkg) => {
  const [name, version] = pkg.split('@');
  return zembil.queue.add(name, version, 'npm');
});

await Promise.all(queuePromises);
```

## Troubleshooting

### Common Issues

#### 1. Cache Directory Permissions

```typescript
// Check if cache directory is writable
try {
  await fs.access(cacheDir, fs.constants.W_OK);
} catch (error) {
  console.error('Cache directory is not writable:', cacheDir);
  // Try alternative directory
  const altCacheDir = path.join(os.tmpdir(), 'zembil-cache');
  zembil = new Zembil(altCacheDir);
}
```

#### 2. Network Connectivity

```typescript
// Check network status before syncing
const isOnline = await zembil.network.isOnline();
if (!isOnline) {
  console.log('Offline mode, using cached packages only');
  return;
}

await zembil.sync();
```

#### 3. Storage Space

```typescript
// Check available disk space
const stats = await fs.stat(cacheDir);
const freeSpace = await getFreeSpace(cacheDir);

if (freeSpace < 1024 * 1024 * 1024) {
  // Less than 1GB
  console.warn('Low disk space, cleaning cache...');
  await zembil.cache.cleanup();
}
```

### Debug Mode

```typescript
// Enable debug logging
zembil.setDebugMode(true);

// Listen to all events
zembil.on('*', (event: string, ...args: any[]) => {
  console.log(`[DEBUG] ${event}:`, args);
});
```

### Performance Monitoring

```typescript
// Monitor performance
const startTime = Date.now();
await zembil.sync();
const duration = Date.now() - startTime;

console.log(`Sync completed in ${duration}ms`);

// Get detailed metrics
const metrics = await zembil.getMetrics();
console.log('Cache hit rate:', metrics.cacheHitRate);
console.log('Average download time:', metrics.avgDownloadTime);
```

## Examples

### Complete Application Example

```typescript
import { Zembil } from 'zembil';
import * as path from 'path';
import * as os from 'os';

class MyApp {
  private zembil: Zembil;

  constructor() {
    const cacheDir = path.join(os.homedir(), '.myapp-cache');
    this.zembil = new Zembil(cacheDir);
  }

  async initialize(): Promise<void> {
    await this.zembil.initialize();

    // Set up event listeners
    this.zembil.on('download:complete', this.onPackageDownloaded);
    this.zembil.on('install:complete', this.onPackageInstalled);
  }

  async prepareOfflineEnvironment(packages: string[]): Promise<void> {
    console.log('Preparing offline environment...');

    // Queue all packages
    for (const pkg of packages) {
      const [name, version] = pkg.split('@');
      await this.zembil.queue.add(name, version, 'npm', 10);
    }

    // Download everything
    await this.zembil.sync();

    console.log('Offline environment ready!');
  }

  async installPackages(packages: string[]): Promise<void> {
    console.log('Installing packages from cache...');
    await this.zembil.install(packages);
    console.log('Installation complete!');
  }

  private onPackageDownloaded(packageName: string): void {
    console.log(`✅ Downloaded: ${packageName}`);
  }

  private onPackageInstalled(packageName: string): void {
    console.log(`📦 Installed: ${packageName}`);
  }
}

// Usage
const app = new MyApp();
await app.initialize();

// Prepare for offline work
await app.prepareOfflineEnvironment([
  'react@18.2.0',
  'express@4.18.0',
  'lodash@4.17.21',
]);

// Later, when offline
await app.installPackages(['react', 'express', 'lodash']);
```

This developer guide provides comprehensive information for using Zembil as a library in your applications. The examples show real-world usage patterns and best practices for building offline-first applications.
