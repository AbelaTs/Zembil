# Zembil - Offline Package & Docs Cache

**Zembil** (Amharic for "stash" or "store") is an offline package and documentation cache system designed for developers in areas with unreliable internet connectivity and frequent power outages.

## The Problem

Developers in regions with poor internet infrastructure face:

- Hours of failed `npm install` attempts
- Inability to access documentation during outages
- Wasted development time due to connectivity issues
- Difficulty learning new packages without internet access

## Why Zembil vs npm/pip/maven?

### ❌ **What npm/pip/maven can't do:**

1. **Offline installs fail** - Even with npm cache, you need internet to resolve dependencies
2. **No documentation caching** - Docs are online-only, inaccessible during outages
3. **No queue system** - Can't plan ahead and download later
4. **Single manager focus** - Each tool only handles its own ecosystem
5. **No progress tracking** - Can't pause/resume downloads manually

### ✅ **What Zembil adds:**

1. **True offline installs** - Install packages completely offline once cached
2. **Documentation included** - Full docs cached with packages for offline access
3. **Queue system** - Queue 50+ packages when you have 5 minutes of good internet, download later
4. **Multi-manager unified cache** - One tool for npm, pip, maven packages
5. **Manual pause/resume** - Control downloads with progress tracking
6. **Team sharing** - Share cache directories across devices/teams

### 🎯 **When to use Zembil:**

- ✅ Unreliable/poor internet connection
- ✅ Need to work offline frequently
- ✅ Want offline documentation access
- ✅ Use multiple package managers (npm + pip + maven)
- ✅ Team collaboration with shared cache
- ✅ Air-gapped or bandwidth-limited environments

### 🚀 **When npm/pip/maven is fine:**

- ✅ Stable internet connection
- ✅ Only need packages (not docs)
- ✅ Single package manager
- ✅ No need for offline workflow

## The Solution

Zembil allows developers to:

1. **Queue packages** they need during good connectivity periods
2. **Download and cache** packages with full documentation
3. **Install instantly** from local cache when offline
4. **Access documentation** with zero latency
5. **Pause/resume downloads** with progress tracking
6. **Sync across devices** when connectivity returns

## Features

- 🚀 **Multi-package manager support**: npm, pip, Maven, and more
- 📚 **Full documentation caching**: API docs, examples, tutorials
- ⏸️ **Manual pause/resume**: Control downloads with progress tracking
- 📊 **Real-time progress**: See download progress with visual indicators
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
# ⬇️  react@18.2.0: [████████░░░░░░░░░░░░] 45% (2.3MB / 5.1MB)

# Pause if needed (in another terminal or Ctrl+C)
zembil queue pause

# Check progress
zembil queue list
# ⏸️ react@18.2.0 (npm)
#    Progress: [████████░░░░░░░░░░░░] 45% (2.3MB / 5.1MB)

# Resume when ready
zembil queue resume
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

// Download packages (with progress tracking)
await zembil.sync();

// Pause/resume control
await zembil.queue.pause();
await zembil.queue.resume();

// Check queue status with progress
const status = await zembil.queue.getStatus();
const items = await zembil.queue.list();
items.forEach(item => {
  if (item.progress) {
    console.log(`${item.packageName}: ${item.progress.percentage}%`);
  }
});

// Install from cache
await zembil.install('react', './node_modules');
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
