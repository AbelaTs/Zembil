# Zembil Installation Guide

## Quick Start

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn
- Internet connection (for initial setup)

### Installation

```bash
# Install Zembil globally
npm install -g zembil

# Or using yarn
yarn global add zembil

# Verify installation
zembil --version
```

### Initial Setup

```bash
# Initialize cache directory (default: ~/.zembil)
zembil init

# Or specify custom directory
zembil init -d /path/to/cache

# Check status
zembil info
```

## Development Installation

### Clone Repository

```bash
git clone https://github.com/your-org/zembil.git
cd zembil
```

### Install Dependencies

```bash
npm install
```

### Build from Source

```bash
npm run build
```

### Run Development Version

```bash
npm run dev
```

## Configuration

### Environment Variables

```bash
# Set custom cache directory
export ZEMBIL_CACHE_DIR="/path/to/cache"

# Set offline mode
export ZEMBIL_OFFLINE_MODE=true

# Set sync interval (minutes)
export ZEMBIL_SYNC_INTERVAL=60
```

### Configuration File

Create `~/.zembil/config.json`:

```json
{
  "cacheDir": "~/.zembil",
  "maxSize": 10737418240,
  "compressionLevel": 6,
  "enableDocumentation": true,
  "enableExamples": true,
  "syncInterval": 60,
  "offlineMode": false,
  "network": {
    "timeout": 30000,
    "retries": 3,
    "parallelDownloads": 5
  },
  "managers": {
    "npm": {
      "registry": "https://registry.npmjs.org",
      "timeout": 30000
    },
    "pip": {
      "index": "https://pypi.org/simple",
      "timeout": 30000
    },
    "maven": {
      "repository": "https://repo1.maven.org/maven2",
      "timeout": 30000
    }
  }
}
```

## System Requirements

### Minimum Requirements

- **OS**: Windows 10, macOS 10.14, or Linux (Ubuntu 18.04+)
- **Node.js**: 16.0.0 or higher
- **RAM**: 512 MB
- **Storage**: 1 GB free space
- **Network**: Internet connection for initial setup

### Recommended Requirements

- **OS**: Windows 11, macOS 12+, or Linux (Ubuntu 20.04+)
- **Node.js**: 18.0.0 or higher
- **RAM**: 2 GB
- **Storage**: 10 GB free space
- **Network**: Stable internet connection

### Package Manager Support

| Manager | Status | Notes |
|---------|--------|-------|
| npm | ✅ Full Support | Node.js packages |
| pip | ✅ Full Support | Python packages |
| Maven | ✅ Full Support | Java packages |
| Composer | 🚧 Planned | PHP packages |
| Cargo | 🚧 Planned | Rust packages |
| Go Modules | 🚧 Planned | Go packages |

## Platform-Specific Installation

### Windows

#### Using Chocolatey
```powershell
# Install Node.js
choco install nodejs

# Install Zembil
npm install -g zembil
```

#### Using Scoop
```powershell
# Install Node.js
scoop install nodejs

# Install Zembil
npm install -g zembil
```

### macOS

#### Using Homebrew
```bash
# Install Node.js
brew install node

# Install Zembil
npm install -g zembil
```

#### Using MacPorts
```bash
# Install Node.js
sudo port install nodejs18

# Install Zembil
npm install -g zembil
```

### Linux

#### Ubuntu/Debian
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Zembil
sudo npm install -g zembil
```

#### CentOS/RHEL
```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Zembil
sudo npm install -g zembil
```

#### Arch Linux
```bash
# Install Node.js
sudo pacman -S nodejs npm

# Install Zembil
sudo npm install -g zembil
```

## Docker Installation

### Using Docker

```bash
# Pull the image
docker pull zembil/zembil:latest

# Run Zembil
docker run -it --rm \
  -v ~/.zembil:/root/.zembil \
  -v $(pwd):/workspace \
  zembil/zembil init
```

### Using Docker Compose

```yaml
version: '3.8'
services:
  zembil:
    image: zembil/zembil:latest
    volumes:
      - ~/.zembil:/root/.zembil
      - ./workspace:/workspace
    working_dir: /workspace
    command: zembil sync
```

## Verification

### Check Installation

```bash
# Verify Zembil is installed
zembil --version

# Check configuration
zembil info

# Test package manager support
zembil queue add react@18.2.0
zembil queue list
zembil queue remove <id>
```

### Test Offline Functionality

```bash
# Queue some packages
zembil queue add react@18.2.0
zembil queue add express@4.18.0

# Download packages (requires internet)
zembil sync

# Test offline installation
zembil install react express
```

## Troubleshooting

### Common Issues

#### 1. Permission Errors

**Problem**: `EACCES: permission denied`

**Solution**:
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Or use a different directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

#### 2. Node.js Version Issues

**Problem**: `Unsupported Node.js version`

**Solution**:
```bash
# Update Node.js
nvm install 18
nvm use 18

# Or using n
sudo n 18
```

#### 3. Cache Directory Issues

**Problem**: `Cannot create cache directory`

**Solution**:
```bash
# Create directory manually
mkdir -p ~/.zembil
chmod 755 ~/.zembil

# Or use different directory
zembil init -d /tmp/zembil
```

#### 4. Network Issues

**Problem**: `Network timeout` or `Connection refused`

**Solution**:
```bash
# Check internet connection
ping google.com

# Configure proxy if needed
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=zembil:*
zembil sync

# Or use verbose mode
zembil sync --verbose
```

### Log Files

```bash
# Check logs
tail -f ~/.zembil/logs/zembil.log

# Clear logs
rm ~/.zembil/logs/*.log
```

## Uninstallation

### Remove Zembil

```bash
# Uninstall global package
npm uninstall -g zembil

# Remove cache directory
rm -rf ~/.zembil

# Remove from PATH (if added manually)
# Edit ~/.bashrc, ~/.zshrc, or ~/.profile
```

### Clean Up

```bash
# Remove all cached packages
zembil cache clear

# Remove configuration
rm -rf ~/.zembil

# Remove from npm cache
npm cache clean --force
```

## Support

### Getting Help

- **Documentation**: [docs.zembil.dev](https://docs.zembil.dev)
- **Issues**: [GitHub Issues](https://github.com/your-org/zembil/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/zembil/discussions)
- **Email**: support@zembil.dev

### Contributing

- **Code**: [GitHub Repository](https://github.com/your-org/zembil)
- **Issues**: Report bugs and feature requests
- **Pull Requests**: Contribute code improvements
- **Documentation**: Help improve documentation

### Community

- **Discord**: [Zembil Discord](https://discord.gg/zembil)
- **Reddit**: [r/zembil](https://reddit.com/r/zembil)
- **Twitter**: [@zembil_dev](https://twitter.com/zembil_dev)
