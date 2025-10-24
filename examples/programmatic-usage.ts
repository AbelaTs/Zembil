/**
 * Zembil Programmatic Usage Examples
 * 
 * This file demonstrates how to use Zembil as a library in your applications.
 * Run with: npx ts-node examples/programmatic-usage.ts
 */

import { Zembil } from '../src/zembil';
import * as path from 'path';
import * as os from 'os';

async function basicExample() {
  console.log('🚀 Basic Zembil Usage Example');
  
  // Initialize Zembil
  const cacheDir = path.join(os.tmpdir(), 'zembil-example');
  const zembil = new Zembil(cacheDir);
  
  try {
    // Initialize the cache system
    await zembil.initialize();
    console.log('✅ Zembil initialized successfully');
    
    // Queue some packages
    console.log('📦 Queuing packages...');
    await zembil.queue.add('react', '18.2.0', 'npm', 10);
    await zembil.queue.add('express', '4.18.0', 'npm', 8);
    await zembil.queue.add('lodash', '4.17.21', 'npm', 5);
    
    // Check queue status
    const status = await zembil.queue.getStatus();
    console.log(`📊 Queue status: ${status.pending} pending, ${status.completed} completed`);
    
    // List queued packages
    const queuedPackages = await zembil.queue.list();
    console.log('📋 Queued packages:', queuedPackages.map(p => `${p.packageName}@${p.version}`));
    
    // Get configuration
    const config = zembil.getConfig();
    console.log('⚙️ Configuration:', {
      cacheDir: config.cacheDir,
      maxSize: `${(config.maxSize / 1024 / 1024).toFixed(2)} MB`,
      offlineMode: config.offlineMode
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function eventHandlingExample() {
  console.log('\n🎧 Event Handling Example');
  
  const cacheDir = path.join(os.tmpdir(), 'zembil-events');
  const zembil = new Zembil(cacheDir);
  
  // Set up event listeners
  zembil.on('download:start', (packageName: string) => {
    console.log(`🔄 Starting download: ${packageName}`);
  });
  
  zembil.on('download:progress', (packageName: string, progress: number) => {
    console.log(`📈 ${packageName}: ${progress}%`);
  });
  
  zembil.on('download:complete', (packageName: string) => {
    console.log(`✅ Downloaded: ${packageName}`);
  });
  
  zembil.on('download:error', (packageName: string, error: Error) => {
    console.error(`❌ Failed to download ${packageName}:`, error.message);
  });
  
  zembil.on('install:start', (packageName: string) => {
    console.log(`📦 Installing: ${packageName}`);
  });
  
  zembil.on('install:complete', (packageName: string) => {
    console.log(`✅ Installed: ${packageName}`);
  });
  
  try {
    await zembil.initialize();
    
    // Queue a package
    await zembil.queue.add('axios', '1.6.0', 'npm', 10);
    
    // The events will fire during sync and install operations
    console.log('🎧 Event listeners set up. Events will fire during operations.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function cacheManagementExample() {
  console.log('\n💾 Cache Management Example');
  
  const cacheDir = path.join(os.tmpdir(), 'zembil-cache');
  const zembil = new Zembil(cacheDir);
  
  try {
    await zembil.initialize();
    
    // Check if package exists in cache
    const exists = await zembil.cache.exists('react', '18.2.0');
    console.log(`🔍 React 18.2.0 exists in cache: ${exists}`);
    
    // Get cache size
    const size = await zembil.cache.getSize();
    console.log(`📊 Cache size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    
    // List all cached packages
    const packages = await zembil.cache.list();
    console.log(`📦 Cached packages: ${packages.length}`);
    packages.forEach(pkg => {
      console.log(`  - ${pkg.name}@${pkg.version} (${(pkg.size / 1024).toFixed(2)} KB)`);
    });
    
    // Clean up cache
    if (packages.length > 0) {
      console.log('🧹 Cleaning up cache...');
      await zembil.cache.cleanup();
      console.log('✅ Cache cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function configurationExample() {
  console.log('\n⚙️ Configuration Example');
  
  const cacheDir = path.join(os.tmpdir(), 'zembil-config');
  const zembil = new Zembil(cacheDir);
  
  try {
    await zembil.initialize();
    
    // Get current configuration
    let config = zembil.getConfig();
    console.log('📋 Current configuration:', config);
    
    // Update configuration
    console.log('🔧 Updating configuration...');
    await zembil.setMaxSize(1024 * 1024 * 1024); // 1GB
    await zembil.setOfflineMode(true);
    await zembil.setSyncInterval(60); // 60 minutes
    
    // Get updated configuration
    config = zembil.getConfig();
    console.log('📋 Updated configuration:', {
      maxSize: `${(config.maxSize / 1024 / 1024).toFixed(2)} MB`,
      offlineMode: config.offlineMode,
      syncInterval: `${config.syncInterval} minutes`
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function errorHandlingExample() {
  console.log('\n🛡️ Error Handling Example');
  
  const cacheDir = path.join(os.tmpdir(), 'zembil-errors');
  const zembil = new Zembil(cacheDir);
  
  try {
    await zembil.initialize();
    
    // Try to get a non-existent package
    try {
      const pkg = await zembil.cache.get('non-existent-package', '1.0.0');
      console.log('📦 Package found:', pkg);
    } catch (error) {
      console.log('❌ Expected error for non-existent package:', error.message);
    }
    
    // Try to remove a non-existent package
    try {
      const removed = await zembil.cache.remove('non-existent-package', '1.0.0');
      console.log('🗑️ Package removed:', removed);
    } catch (error) {
      console.log('❌ Expected error for removing non-existent package:', error.message);
    }
    
    // Handle queue operations gracefully
    try {
      await zembil.queue.add('', '1.0.0', 'npm'); // Invalid package name
    } catch (error) {
      console.log('❌ Expected error for invalid package name:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function batchOperationsExample() {
  console.log('\n📦 Batch Operations Example');
  
  const cacheDir = path.join(os.tmpdir(), 'zembil-batch');
  const zembil = new Zembil(cacheDir);
  
  try {
    await zembil.initialize();
    
    // Define packages to queue
    const packages = [
      { name: 'react', version: '18.2.0', priority: 10 },
      { name: 'express', version: '4.18.0', priority: 8 },
      { name: 'lodash', version: '4.17.21', priority: 5 },
      { name: 'axios', version: '1.6.0', priority: 7 },
      { name: 'typescript', version: '5.3.0', priority: 6 }
    ];
    
    console.log('📦 Queuing multiple packages...');
    
    // Queue all packages
    const queuePromises = packages.map(pkg => 
      zembil.queue.add(pkg.name, pkg.version, 'npm', pkg.priority)
    );
    
    const queueIds = await Promise.all(queuePromises);
    console.log(`✅ Queued ${queueIds.length} packages`);
    
    // Check queue status
    const status = await zembil.queue.getStatus();
    console.log('📊 Queue status:', status);
    
    // List queued packages
    const queuedPackages = await zembil.queue.list();
    console.log('📋 Queued packages:');
    queuedPackages.forEach(pkg => {
      console.log(`  - ${pkg.packageName}@${pkg.version} (priority: ${pkg.priority})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function main() {
  console.log('🎯 Zembil Programmatic Usage Examples');
  console.log('=====================================\n');
  
  try {
    await basicExample();
    await eventHandlingExample();
    await cacheManagementExample();
    await configurationExample();
    await errorHandlingExample();
    await batchOperationsExample();
    
    console.log('\n🎉 All examples completed successfully!');
    console.log('\n💡 Tips:');
    console.log('  - Use event listeners for progress tracking');
    console.log('  - Handle errors gracefully with try-catch');
    console.log('  - Use batch operations for efficiency');
    console.log('  - Monitor cache size and clean up regularly');
    console.log('  - Configure Zembil for your specific needs');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicExample,
  eventHandlingExample,
  cacheManagementExample,
  configurationExample,
  errorHandlingExample,
  batchOperationsExample
};
