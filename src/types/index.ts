export interface PackageInfo {
  name: string;
  version: string;
  manager: PackageManager;
  description?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface CachedPackage extends PackageInfo {
  id: string;
  cachedAt: Date;
  size: number;
  checksum: string;
  localPath: string;
  documentationPath?: string;
  examplesPath?: string;
}

export interface QueueItem {
  id: string;
  packageName: string;
  version: string;
  manager: PackageManager;
  priority: number;
  queuedAt: Date;
  status: QueueStatus;
  error?: string;
}

export interface CacheConfig {
  cacheDir: string;
  maxSize: number; // in bytes
  compressionLevel: number;
  enableDocumentation: boolean;
  enableExamples: boolean;
  syncInterval: number; // in minutes
  offlineMode: boolean;
}

export interface SyncResult {
  success: boolean;
  downloaded: number;
  failed: number;
  errors: string[];
  totalSize: number;
}

export type PackageManager = 'npm' | 'pip' | 'maven' | 'composer' | 'cargo' | 'go';
export type QueueStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';

export interface PackageManagerInterface {
  name: PackageManager;
  install(packageName: string, version: string, targetDir: string): Promise<void>;
  getPackageInfo(packageName: string, version: string): Promise<PackageInfo>;
  downloadPackage(packageName: string, version: string): Promise<string>;
  getDocumentation(packageName: string, version: string): Promise<string>;
  getExamples(packageName: string, version: string): Promise<string[]>;
  listVersions(packageName: string): Promise<string[]>;
}

export interface CacheInterface {
  add(packageInfo: PackageInfo, packagePath: string, docsPath?: string, examplesPath?: string): Promise<string>;
  get(packageName: string, version: string): Promise<CachedPackage | null>;
  list(): Promise<CachedPackage[]>;
  remove(packageName: string, version: string): Promise<boolean>;
  exists(packageName: string, version: string): Promise<boolean>;
  getSize(): Promise<number>;
  cleanup(): Promise<void>;
}

export interface QueueInterface {
  add(packageName: string, version: string, manager: PackageManager, priority?: number): Promise<string>;
  remove(id: string): Promise<boolean>;
  list(): Promise<QueueItem[]>;
  process(): Promise<SyncResult>;
  clear(): Promise<void>;
  getStatus(): Promise<{ pending: number; downloading: number; completed: number; failed: number }>;
}
