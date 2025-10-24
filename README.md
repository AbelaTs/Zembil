# Zembil - Offline Package & Docs Cache

**Zembil** (Amharic for "stash" or "store") is an offline package and documentation cache system designed for developers in areas with unreliable internet connectivity and frequent power outages.

> **Recent Updates**: Added comprehensive testing framework, branch protection, and developer documentation.

## The Problem

Developers in regions with poor internet infrastructure face:

- Hours of failed `npm install` attempts
- Inability to access documentation during outages
- Wasted development time due to connectivity issues
- Difficulty learning new packages without internet access

## The Solution

Zembil allows developers to:

1. **Queue packages** they need during good connectivity periods
2. **Download and cache** packages with full documentation
3. **Install instantly** from local cache when offline
4. **Access documentation** with zero latency
5. **Sync across devices** when connectivity returns

## Features

- 🚀 **Multi-package manager support**: npm, pip, Maven, and more
- 📚 **Full documentation caching**: API docs, examples, tutorials
- 🔄 **Smart sync**: Only download what's changed
- 💾 **Efficient storage**: Compressed, deduplicated cache
- 🎯 **IDE integration**: Works with VS Code, IntelliJ, etc.
- 🌐 **Offline-first**: Designed for unreliable connections
- ⚡ **Power outage resilient**: Graceful handling of interruptions

## Quick Start

### CLI Usage

```bash
# Install Zembil
npm install -g zembil

# Initialize cache directory
zembil init

# Queue packages for download
zembil queue add react@18.2.0
zembil queue add express@4.18.0
zembil queue add lodash@4.17.21

# Download queued packages (when you have good internet)
zembil sync

# Install from cache (works offline!)
zembil install react express lodash
```

### Programmatic Usage

```typescript
import { Zembil } from 'zembil';

// Initialize Zembil
const zembil = new Zembil('./cache');
await zembil.initialize();

// Queue packages
await zembil.queue.add('react', '18.2.0', 'npm', 10);
await zembil.queue.add('express', '4.18.0', 'npm', 8);

// Download packages
await zembil.sync();

// Install from cache
await zembil.install(['react', 'express']);
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Good Internet │    │   Local Cache   │    │  Offline Usage  │
│                 │    │                 │    │                 │
│ • Queue packages│───▶│ • Package files │───▶│ • Instant install│
│ • Download docs │    │ • Documentation │    │ • Fast docs     │
│ • Sync metadata │    │ • Examples       │    │ • No latency    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Documentation

- 📖 [Developer Guide](docs/developer-guide.md) - Complete guide for using Zembil as a library
- 🔧 [API Reference](docs/api-reference.md) - Complete API documentation
- 🏗️ [Architecture](docs/architecture.md) - System design and components
- 🧪 [Testing Guide](docs/testing.md) - How to test Zembil applications
- 📚 [Basic Usage](examples/basic-usage.md) - CLI usage examples
- 💻 [Programmatic Usage](examples/programmatic-usage.ts) - Library usage examples

## Installation

### As a CLI Tool

```bash
npm install -g zembil
```

### As a Library

```bash
npm install zembil
```

## License

MIT License - Built for the global developer community
