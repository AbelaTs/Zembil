# Zembil API Reference

Complete API documentation for the Zembil library.

## Table of Contents

1. [Core Classes](#core-classes)
2. [Interfaces](#interfaces)
3. [Types](#types)
4. [Events](#events)
5. [Error Handling](#error-handling)

## Core Classes

### Zembil

Main class for managing offline package caching.

```typescript
class Zembil {
  constructor(cacheDir: string, options?: ZembilOptions);

  // Initialization
  initialize(): Promise<void>;

  // Package management
  sync(): Promise<void>;
  install(packages: string[], options?: InstallOptions): Promise<void>;

  // Configuration
  getConfig(): ZembilConfig;
  setMaxSize(size: number): Promise<void>;
  setOfflineMode(enabled: boolean): Promise<void>;
  setSyncInterval(interval: number): Promise<void>;

  // Event handling
  on(event: string, listener: Function): void;
  off(event: string, listener: Function): void;
  emit(event: string, ...args: any[]): void;

  // Utilities
  getCacheDir(): string;
  getMetrics(): Promise<Metrics>;
}
```

### Cache

Manages local package cache storage.

```typescript
class Cache implements CacheInterface {
  constructor(cacheDir: string);

  // Package operations
  add(
    packageInfo: PackageInfo,
    packagePath: string,
    docsPath?: string,
    examplesPath?: string
  ): Promise<string>;
  get(name: string, version: string): Promise<CachedPackage | null>;
  remove(name: string, version: string): Promise<boolean>;
  exists(name: string, version: string): Promise<boolean>;
  list(): Promise<CachedPackage[]>;

  // Cache management
  getSize(): Promise<number>;
  cleanup(): Promise<void>;

  // Initialization
  initialize(): Promise<void>;
}
```

### Queue

Manages package download queue.

```typescript
class Queue {
  // Queue operations
  add(
    name: string,
    version: string,
    manager: string,
    priority?: number
  ): Promise<string>;
  remove(id: string): Promise<boolean>;
  list(): Promise<QueueItem[]>;
  clear(): Promise<void>;

  // Status
  getStatus(): Promise<QueueStatus>;

  // Processing
  process(): Promise<void>;
  pause(): void;
  resume(): void;
}
```

### Database

SQLite database for package metadata.

```typescript
class Database {
  constructor(dbPath: string);

  // Schema management
  initialize(): Promise<void>;

  // Package operations
  savePackage(pkg: CachedPackage): Promise<void>;
  getPackage(name: string, version: string): Promise<CachedPackage | null>;
  listPackages(): Promise<CachedPackage[]>;
  removePackage(name: string, version: string): Promise<void>;
  searchPackages(query: string): Promise<CachedPackage[]>;

  // Statistics
  getStats(): Promise<DatabaseStats>;

  // Connection management
  close(): void;
}
```

## Interfaces

### CacheInterface

```typescript
interface CacheInterface {
  add(
    packageInfo: PackageInfo,
    packagePath: string,
    docsPath?: string,
    examplesPath?: string
  ): Promise<string>;
  get(name: string, version: string): Promise<CachedPackage | null>;
  remove(name: string, version: string): Promise<boolean>;
  exists(name: string, version: string): Promise<boolean>;
  list(): Promise<CachedPackage[]>;
  getSize(): Promise<number>;
  cleanup(): Promise<void>;
  initialize(): Promise<void>;
}
```

### PackageManager

```typescript
interface PackageManager {
  downloadPackage(name: string, version: string): Promise<string>;
  installPackage(packagePath: string, targetDir: string): Promise<void>;
  getPackageInfo(name: string, version: string): Promise<PackageInfo>;
  getDocumentation(name: string, version: string): Promise<string | null>;
  getExamples(name: string, version: string): Promise<string[] | null>;
}
```

### NetworkInterface

```typescript
interface NetworkInterface {
  isOnline(): Promise<boolean>;
  getConnectionQuality(): Promise<ConnectionQuality>;
  download(url: string, options?: DownloadOptions): Promise<Buffer>;
  upload(data: Buffer, url: string, options?: UploadOptions): Promise<void>;
}
```

## Types

### PackageInfo

```typescript
interface PackageInfo {
  name: string;
  version: string;
  manager: string;
  description?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}
```

### CachedPackage

```typescript
interface CachedPackage extends PackageInfo {
  id: string;
  cachedAt: Date;
  size: number;
  checksum: string;
  localPath: string;
  documentationPath?: string;
  examplesPath?: string;
}
```

### QueueItem

```typescript
interface QueueItem {
  id: string;
  packageName: string;
  version: string;
  manager: string;
  priority: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
}
```

### QueueStatus

```typescript
interface QueueStatus {
  pending: number;
  downloading: number;
  completed: number;
  failed: number;
}
```

### ZembilConfig

```typescript
interface ZembilConfig {
  cacheDir: string;
  maxSize: number;
  offlineMode: boolean;
  syncInterval: number;
  enableDocumentation: boolean;
  enableExamples: boolean;
  compressionLevel: number;
  retryAttempts: number;
  retryDelay: number;
}
```

### InstallOptions

```typescript
interface InstallOptions {
  targetDir?: string;
  manager?: string;
  includeDocs?: boolean;
  includeExamples?: boolean;
  force?: boolean;
  dryRun?: boolean;
}
```

### Metrics

```typescript
interface Metrics {
  totalPackages: number;
  totalSize: number;
  cacheHitRate: number;
  avgDownloadTime: number;
  avgInstallTime: number;
  networkUsage: number;
  storageUsage: number;
}
```

### ConnectionQuality

```typescript
interface ConnectionQuality {
  latency: number;
  bandwidth: number;
  stability: number;
  reliability: number;
}
```

## Events

### Download Events

```typescript
// Download started
zembil.on('download:start', (packageName: string, version: string) => {
  console.log(`Starting download: ${packageName}@${version}`);
});

// Download progress
zembil.on('download:progress', (packageName: string, progress: number) => {
  console.log(`${packageName}: ${progress}%`);
});

// Download completed
zembil.on('download:complete', (packageName: string, version: string) => {
  console.log(`Downloaded: ${packageName}@${version}`);
});

// Download failed
zembil.on('download:error', (packageName: string, error: Error) => {
  console.error(`Failed to download ${packageName}:`, error.message);
});
```

### Installation Events

```typescript
// Installation started
zembil.on('install:start', (packageName: string) => {
  console.log(`Installing: ${packageName}`);
});

// Installation completed
zembil.on('install:complete', (packageName: string) => {
  console.log(`Installed: ${packageName}`);
});

// Installation failed
zembil.on('install:error', (packageName: string, error: Error) => {
  console.error(`Failed to install ${packageName}:`, error.message);
});
```

### Cache Events

```typescript
// Package added to cache
zembil.on('cache:add', (packageName: string, version: string) => {
  console.log(`Cached: ${packageName}@${version}`);
});

// Package removed from cache
zembil.on('cache:remove', (packageName: string, version: string) => {
  console.log(`Removed from cache: ${packageName}@${version}`);
});

// Cache cleaned up
zembil.on('cache:cleanup', (removedCount: number, freedSpace: number) => {
  console.log(
    `Cache cleanup: removed ${removedCount} packages, freed ${freedSpace} bytes`
  );
});
```

### Queue Events

```typescript
// Package added to queue
zembil.on('queue:add', (packageName: string, version: string) => {
  console.log(`Queued: ${packageName}@${version}`);
});

// Package removed from queue
zembil.on('queue:remove', (packageName: string, version: string) => {
  console.log(`Unqueued: ${packageName}@${version}`);
});

// Queue cleared
zembil.on('queue:clear', () => {
  console.log('Queue cleared');
});
```

### System Events

```typescript
// System initialized
zembil.on('system:initialized', () => {
  console.log('Zembil initialized');
});

// Sync started
zembil.on('sync:start', () => {
  console.log('Sync started');
});

// Sync completed
zembil.on('sync:complete', (stats: SyncStats) => {
  console.log(
    `Sync completed: ${stats.downloaded} downloaded, ${stats.failed} failed`
  );
});

// Sync failed
zembil.on('sync:error', (error: Error) => {
  console.error('Sync failed:', error.message);
});
```

## Error Handling

### Error Types

```typescript
// Network errors
class NetworkError extends Error {
  code: 'NETWORK_ERROR';
  statusCode?: number;
  url?: string;
}

// Storage errors
class StorageError extends Error {
  code: 'STORAGE_ERROR';
  path?: string;
  operation?: string;
}

// Package errors
class PackageError extends Error {
  code: 'PACKAGE_ERROR';
  packageName?: string;
  version?: string;
}

// Cache errors
class CacheError extends Error {
  code: 'CACHE_ERROR';
  operation?: string;
}
```

### Error Handling Examples

```typescript
try {
  await zembil.sync();
} catch (error) {
  switch (error.code) {
    case 'NETWORK_ERROR':
      console.log('Network error, will retry later');
      break;
    case 'STORAGE_ERROR':
      console.log('Storage error, cleaning up...');
      await zembil.cache.cleanup();
      break;
    case 'PACKAGE_ERROR':
      console.log(`Package error: ${error.packageName}@${error.version}`);
      break;
    default:
      console.error('Unexpected error:', error);
  }
}
```

### Retry Logic

```typescript
async function downloadWithRetry(
  packageName: string,
  version: string,
  maxRetries: number = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await zembil.queue.add(packageName, version, 'npm');
      await zembil.sync();
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

## Usage Examples

### Basic Usage

```typescript
import { Zembil } from 'zembil';

const zembil = new Zembil('./cache');
await zembil.initialize();

// Queue packages
await zembil.queue.add('react', '18.2.0', 'npm', 10);
await zembil.queue.add('express', '4.18.0', 'npm', 5);

// Download
await zembil.sync();

// Install
await zembil.install(['react', 'express']);
```

### Advanced Usage

```typescript
// Custom configuration
const zembil = new Zembil('./cache', {
  maxSize: 5 * 1024 * 1024 * 1024, // 5GB
  offlineMode: false,
  syncInterval: 30,
  enableDocumentation: true,
  enableExamples: true,
});

// Event handling
zembil.on('download:progress', (name, progress) => {
  console.log(`${name}: ${progress}%`);
});

// Batch operations
const packages = [
  { name: 'react', version: '18.2.0', priority: 10 },
  { name: 'express', version: '4.18.0', priority: 8 },
  { name: 'lodash', version: '4.17.21', priority: 5 },
];

for (const pkg of packages) {
  await zembil.queue.add(pkg.name, pkg.version, 'npm', pkg.priority);
}

await zembil.sync();
```

### Error Handling

```typescript
try {
  await zembil.sync();
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    console.log('Network error, will retry later');
  } else if (error.code === 'STORAGE_FULL') {
    console.log('Storage full, cleaning up...');
    await zembil.cache.cleanup();
    await zembil.sync();
  } else {
    console.error('Unexpected error:', error);
  }
}
```

This API reference provides complete documentation for all Zembil classes, interfaces, types, and events. Use this as a reference when building applications with Zembil.
