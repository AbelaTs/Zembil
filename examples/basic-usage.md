# Zembil Basic Usage Examples

## Scenario: Ethiopian Developer with Unreliable Internet

### Step 1: Initial Setup (When you have good internet)

```bash
# Install Zembil globally
npm install -g zembil

# Initialize cache directory
zembil init

# Queue packages you'll need for your project
zembil queue add react -v 18.2.0
zembil queue add express -v 4.18.0
zembil queue add lodash -v 4.17.21
zembil queue add axios -v 1.6.0
zembil queue add typescript -v 5.3.0

# Add Python packages too
zembil queue add requests -v 2.31.0 -m pip
zembil queue add numpy -v 1.24.0 -m pip
zembil queue add pandas -v 2.0.0 -m pip

# Add Java packages
zembil queue add "org.springframework:spring-boot-starter-web" -v 3.1.0 -m maven
```

### Step 2: Download Everything (When internet is stable)

```bash
# Download all queued packages with documentation
# Shows real-time progress:
# ⬇️  react@18.2.0: [████████░░░░░░░░░░░░] 45% (2.3MB / 5.1MB)
zembil sync

# If you need to pause (e.g., internet becomes unstable)
# In another terminal:
zembil queue pause

# Check current progress
zembil queue list
# ⏸️ react@18.2.0 (npm)
#    Progress: [████████░░░░░░░░░░░░] 45% (2.3MB / 5.1MB)

# Resume when internet is stable again
zembil queue resume
zembil sync

# Check what was downloaded
zembil cache list
```

### Step 3: Work Offline (During power outages or poor connectivity)

```bash
# Install packages instantly from cache
zembil install react express lodash axios typescript

# Install Python packages
zembil install requests numpy pandas

# Install Java packages
zembil install "org.springframework:spring-boot-starter-web"

# View documentation offline
zembil docs react 18.2.0
zembil docs express 4.18.0
```

## Advanced Usage

### Priority Queue Management

```bash
# Add high-priority packages
zembil queue add react -v 18.2.0 -p 10
zembil queue add express -v 4.18.0 -p 10

# Add lower-priority packages
zembil queue add lodash -v 4.17.21 -p 1

# Check queue status
zembil queue status
```

### Automatic Interruption Tracking

```bash
# Start downloading
zembil sync

# If interrupted (network loss, Ctrl+C, power outage):
# Progress is automatically saved! No action needed.

# Check what was interrupted
zembil queue list
# Shows:
# ⏸️ react@18.2.0 (npm) - Interrupted at 45%
#    Progress: [████████░░░░░░░░░░░░] 45% (2.3MB / 5.1MB) (interrupted, will resume)
# ⏳ express@4.18.0 (npm) - Pending

# Resume when ready (just run sync again!)
zembil sync
# Or explicitly mark for retry:
zembil queue resume
zembil sync

# Check status
zembil queue status
# Shows interrupted count if any

# Cancel a specific package from queue
zembil queue cancel react

# Cancel a specific version
zembil queue cancel react -v 18.2.0

# Cancel all pending downloads
zembil queue cancel-all
```

### Cache Management

```bash
# List all cached packages
zembil cache list

# Remove specific package from cache
zembil cache remove react 18.2.0

# Clean all versions of a package from cache
zembil cache clean react

# Clean all packages from cache
zembil cache clean --all

# Clean up orphaned files
zembil cache cleanup

# Get cache statistics
zembil info
```

### Offline Package Sharing

```bash
# Create offline bundle for sharing with team
zembil bundle create essential-packages.zip

# Extract shared bundle
zembil bundle extract team-packages.zip ./offline-cache
```

## IDE Integration

### VS Code Extension (Future)

```json
{
  "zembil.cacheDir": "~/.zembil",
  "zembil.autoInstall": true,
  "zembil.offlineMode": true
}
```

### IntelliJ Plugin (Future)

- Automatic package detection
- Offline documentation lookup
- Cache status indicators
- One-click offline installation

## Automatic Interruption Tracking & Progress

### How It Works

Zembil automatically tracks interruptions - no manual pause needed:

```bash
# Start sync with progress tracking
zembil sync
# Real-time progress: ⬇️  react@18.2.0: [████████░░░░░░░░░░░░] 45%

# If interrupted (network loss, Ctrl+C, power outage):
# Progress is automatically saved! Nothing to do.

# Check progress anytime
zembil queue list
# ⏸️ react@18.2.0 (npm) - Interrupted
#    Progress: [████████░░░░░░░░░░░░] 45% (2.3MB / 5.1MB) (interrupted, will resume)

# Resume when ready - just run sync again!
zembil sync  # Automatically continues from where it left off
```

### Progress Persistence

Progress is automatically saved to `queue.json`:
- **Survives restarts** - Check progress after reboot
- **Automatic tracking** - No manual pause needed
- **Network errors handled** - Interruptions detected automatically
- **Shows MB downloaded/total** - See exactly where it stopped
- **Visual progress bars** - Easy to see status

## Power Outage Resilience

### Automatic Recovery

Zembil automatically handles:
- Interrupted downloads (can pause/resume manually)
- Corrupted cache files (automatic cleanup)
- Partial installations (rollback and retry)
- Progress tracking (survives restarts)

### Manual Recovery

```bash
# Check for corrupted packages
zembil cache verify

# Repair corrupted packages
zembil cache repair

# Force re-download of specific package
zembil queue add react -v 18.2.0 --force
zembil sync
```

## Team Collaboration

### Sharing Cache with Team

```bash
# Export cache for team sharing
zembil export team-cache.zip

# Import team cache
zembil import team-cache.zip

# Sync with team repository
zembil sync --team-repo https://github.com/your-team/zembil-cache
```

### University/Co-working Space Setup

```bash
# Set up shared cache directory
zembil init -d /shared/zembil-cache

# Configure for team use
zembil config set team-mode true
zembil config set shared-cache /shared/zembil-cache

# Team members can sync from shared cache
zembil sync --from-shared
```

## Troubleshooting

### Common Issues

1. **Package not found in cache**
   ```bash
   # Check if package is queued
   zembil queue list
   
   # Re-queue and sync
   zembil queue add package-name -v version
   zembil sync
   ```

2. **Installation fails**
   ```bash
   # Check cache integrity
   zembil cache verify
   
   # Re-download package
   zembil cache remove package-name version
   zembil queue add package-name -v version
   zembil sync
   ```

3. **Documentation not available**
   ```bash
   # Check if docs were downloaded
   zembil cache list
   
   # Re-sync with documentation
   zembil queue add package-name -v version
   zembil sync
   ```

### Performance Optimization

```bash
# Set cache size limit
zembil config set max-size 5GB

# Enable compression
zembil config set compression-level 9

# Set sync interval
zembil config set sync-interval 30
```

## Best Practices

1. **Queue packages during good connectivity**
2. **Regularly sync when internet is available**
3. **Keep cache size manageable**
4. **Share cache with team members**
5. **Use priority system for critical packages**
6. **Monitor cache health regularly**
