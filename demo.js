#!/usr/bin/env node

/**
 * Zembil Demo Script
 * 
 * This script demonstrates the core functionality of Zembil
 * for developers with unreliable internet connectivity.
 */

const { Zembil } = require('./dist/zembil');
const path = require('path');
const os = require('os');

async function runDemo() {
  console.log('🚀 Zembil Demo - Offline Package Cache System');
  console.log('=' .repeat(50));
  
  // Create a temporary cache directory for demo
  const demoDir = path.join(os.tmpdir(), 'zembil-demo');
  const zembil = new Zembil(demoDir);
  
  try {
    // Step 1: Initialize Zembil
    console.log('\n📁 Initializing Zembil cache...');
    await zembil.initialize();
    console.log(`✅ Cache initialized at: ${zembil.getCacheDir()}`);
    
    // Step 2: Queue some packages
    console.log('\n📦 Queuing packages for download...');
    const packages = [
      { name: 'react', version: '18.2.0', manager: 'npm' },
      { name: 'express', version: '4.18.0', manager: 'npm' },
      { name: 'lodash', version: '4.17.21', manager: 'npm' }
    ];
    
    for (const pkg of packages) {
      const id = await zembil.queue.add(pkg.name, pkg.version, pkg.manager);
      console.log(`  ✅ Queued ${pkg.name}@${pkg.version} (ID: ${id.substring(0, 8)}...)`);
    }
    
    // Step 3: Show queue status
    console.log('\n📊 Queue Status:');
    const status = await zembil.queue.getStatus();
    console.log(`  Pending: ${status.pending}`);
    console.log(`  Downloading: ${status.downloading}`);
    console.log(`  Completed: ${status.completed}`);
    console.log(`  Failed: ${status.failed}`);
    
    // Step 4: Show queued packages
    console.log('\n📋 Queued Packages:');
    const queueItems = await zembil.queue.list();
    queueItems.forEach(item => {
      console.log(`  • ${item.packageName}@${item.version} (${item.manager})`);
    });
    
    // Step 5: Show cache info
    console.log('\n💾 Cache Information:');
    const stats = await zembil.getStats();
    console.log(`  Total packages: ${stats.totalPackages}`);
    console.log(`  Cache size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Oldest cache: ${stats.oldestCache.toLocaleDateString()}`);
    console.log(`  Newest cache: ${stats.newestCache.toLocaleDateString()}`);
    
    // Step 6: Show configuration
    console.log('\n⚙️  Configuration:');
    const config = zembil.getConfig();
    console.log(`  Cache directory: ${config.cacheDir}`);
    console.log(`  Max size: ${(config.maxSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`  Documentation enabled: ${config.enableDocumentation}`);
    console.log(`  Examples enabled: ${config.enableExamples}`);
    console.log(`  Offline mode: ${config.offlineMode}`);
    console.log(`  Sync interval: ${config.syncInterval} minutes`);
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run "zembil sync" to download queued packages (requires internet)');
    console.log('2. Run "zembil install <package>" to install from cache (works offline)');
    console.log('3. Run "zembil docs <package> <version>" to view documentation');
    console.log('4. Run "zembil cache list" to see cached packages');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up demo directory
    const fs = require('fs-extra');
    await fs.remove(demoDir);
    console.log('\n🧹 Cleaned up demo files');
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { runDemo };
