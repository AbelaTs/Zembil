# Zembil Architecture

## Overview

Zembil is designed as a distributed, offline-first package and documentation cache system. It addresses the specific needs of developers in regions with unreliable internet connectivity and frequent power outages.

## Core Components

### 1. Package Managers (`src/managers/`)

**Purpose**: Abstract different package managers (npm, pip, Maven) behind a unified interface.

**Key Features**:
- Unified API for package operations
- Support for multiple package managers
- Extensible design for new package managers
- Offline-first approach

**Supported Managers**:
- **npm**: Node.js packages from npm registry
- **pip**: Python packages from PyPI
- **maven**: Java packages from Maven Central

### 2. Cache System (`src/core/cache.ts`)

**Purpose**: Store packages, documentation, and examples locally for offline access.

**Key Features**:
- SQLite database for metadata
- File system storage for packages
- Deduplication and compression
- Integrity verification with checksums
- Automatic cleanup of orphaned files

**Storage Structure**:
```
~/.zembil/
├── packages/          # Package files (.tar.gz, .whl, .jar)
├── docs/             # Documentation files
├── examples/         # Example code
├── cache.db          # SQLite metadata database
├── queue.json        # Download queue
└── config.json       # Configuration
```

### 3. Queue System (`src/core/queue.ts`)

**Purpose**: Manage package download queue with priority and retry logic.

**Key Features**:
- Priority-based queuing
- Retry mechanism for failed downloads
- Status tracking (pending, downloading, completed, failed)
- Batch processing
- Error handling and reporting

### 4. Database Layer (`src/core/database.ts`)

**Purpose**: Store package metadata and cache information.

**Schema**:
```sql
CREATE TABLE packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  manager TEXT NOT NULL,
  description TEXT,
  homepage TEXT,
  repository TEXT,
  license TEXT,
  dependencies TEXT,           -- JSON
  devDependencies TEXT,        -- JSON
  peerDependencies TEXT,       -- JSON
  cachedAt TEXT NOT NULL,
  size INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  localPath TEXT NOT NULL,
  documentationPath TEXT,
  examplesPath TEXT,
  UNIQUE(name, version)
);
```

## Data Flow

### 1. Package Queuing
```
Developer → CLI → Queue → Database
```

### 2. Package Download (Online)
```
Queue → Package Manager → Registry → Cache → Database
```

### 3. Package Installation (Offline)
```
Developer → CLI → Cache → Package Manager → Target Directory
```

### 4. Documentation Access
```
Developer → CLI → Cache → Documentation Files
```

## Network Resilience

### Connection Detection
- Automatic online/offline detection
- Latency and speed measurement
- Connection quality assessment

### Retry Logic
- Exponential backoff for failed downloads
- Resume interrupted downloads
- Graceful degradation during poor connectivity

### Offline Mode
- Automatic fallback to cache
- Queue management during offline periods
- Sync when connectivity returns

## Power Outage Handling

### Interruption Recovery
- Transaction-based operations
- Atomic file operations
- Automatic rollback on failure
- State persistence across restarts

### Data Integrity
- Checksum verification
- Corrupted file detection
- Automatic repair mechanisms
- Backup and restore capabilities

## Performance Optimizations

### Caching Strategy
- LRU eviction policy
- Size-based limits
- Compression for storage efficiency
- Deduplication across packages

### Network Optimization
- Parallel downloads with limits
- Bandwidth throttling
- Connection pooling
- Request batching

### Storage Optimization
- Compressed package storage
- Shared dependency storage
- Incremental updates
- Cleanup of orphaned files

## Security Considerations

### Package Verification
- Checksum validation
- Signature verification (future)
- Malware scanning (future)
- Trusted source validation

### Access Control
- User-based permissions
- Team sharing controls
- Cache access restrictions
- Audit logging

## Extensibility

### Plugin System (Future)
- Custom package managers
- Additional documentation sources
- IDE integrations
- Cloud storage backends

### API Layer (Future)
- REST API for remote access
- WebSocket for real-time updates
- GraphQL for complex queries
- Webhook support for events

## Scalability

### Multi-User Support
- Shared cache directories
- User isolation
- Permission management
- Resource quotas

### Distributed Caching
- Peer-to-peer sharing
- CDN integration
- Mirror synchronization
- Load balancing

## Monitoring and Analytics

### Metrics Collection
- Download statistics
- Cache hit rates
- Performance metrics
- Error tracking

### Health Monitoring
- Cache integrity checks
- Storage usage monitoring
- Network quality assessment
- System resource usage

## Future Enhancements

### AI-Powered Features
- Package recommendation
- Dependency prediction
- Usage pattern analysis
- Smart caching strategies

### Cloud Integration
- Cloud storage backends
- Distributed caching
- Global package mirrors
- Team collaboration features

### Advanced Documentation
- Interactive examples
- Code snippets
- Tutorial integration
- Video content support
