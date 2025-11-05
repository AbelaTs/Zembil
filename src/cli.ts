#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as os from 'os';
import { Zembil } from './zembil';

const program = new Command();

program
  .name('zembil')
  .description('Offline Package & Docs Cache for developers with unreliable internet')
  .version('1.0.0');

// Initialize command
program
  .command('init')
  .description('Initialize Zembil cache directory')
  .option('-d, --dir <path>', 'Cache directory path', path.join(os.homedir(), '.zembil'))
  .action(async (options) => {
    const spinner = ora('Initializing Zembil cache...').start();
    try {
      const zembil = new Zembil(options.dir);
      await zembil.initialize();
      spinner.succeed(`Zembil cache initialized at ${options.dir}`);
    } catch (error) {
      spinner.fail(`Failed to initialize: ${error}`);
      process.exit(1);
    }
  });

// Queue commands
const queueCommand = program
  .command('queue')
  .description('Manage package queue');

queueCommand
  .command('add <package>')
  .description('Add package to download queue')
  .option('-v, --version <version>', 'Package version', 'latest')
  .option('-m, --manager <manager>', 'Package manager (npm, pip, maven)', 'npm')
  .option('-p, --priority <priority>', 'Download priority (higher = more important)', '0')
  .action(async (packageName, options) => {
    const spinner = ora(`Adding ${packageName} to queue...`).start();
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      const id = await zembil.queue.add(
        packageName, 
        options.version, 
        options.manager, 
        parseInt(options.priority)
      );
      spinner.succeed(`Added ${packageName}@${options.version} to queue (ID: ${id})`);
    } catch (error) {
      spinner.fail(`Failed to add package: ${error}`);
      process.exit(1);
    }
  });

queueCommand
  .command('list')
  .description('List queued packages')
  .action(async () => {
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      const items = await zembil.queue.list();
      
      if (items.length === 0) {
        console.log(chalk.yellow('No packages in queue'));
        return;
      }

      console.log(chalk.blue('\n📦 Queued Packages:'));
      console.log('─'.repeat(80));
      
      items.forEach(item => {
        const status = item.status === 'pending' ? chalk.yellow('⏳') :
                     item.status === 'downloading' ? chalk.blue('⬇️') :
                     item.status === 'paused' ? chalk.yellow('⏸️') :
                     item.status === 'completed' ? chalk.green('✅') :
                     chalk.red('❌');
        
        console.log(`${status} ${item.packageName}@${item.version} (${item.manager})`);
        console.log(`   ID: ${item.id}`);
        console.log(`   Priority: ${item.priority}`);
        console.log(`   Queued: ${item.queuedAt.toLocaleString()}`);
        
        // Show progress if available
        if (item.progress && item.progress.total > 0) {
          const downloadedMB = (item.progress.downloaded / 1024 / 1024).toFixed(2);
          const totalMB = (item.progress.total / 1024 / 1024).toFixed(2);
          const progressBar = '█'.repeat(Math.floor(item.progress.percentage / 5)) + 
                            '░'.repeat(20 - Math.floor(item.progress.percentage / 5));
          console.log(`   Progress: [${progressBar}] ${item.progress.percentage}% (${downloadedMB}MB / ${totalMB}MB)`);
        }
        
        if (item.error) {
          console.log(chalk.red(`   Error: ${item.error}`));
        }
        console.log('');
      });
    } catch (error) {
      console.error(chalk.red(`Failed to list queue: ${error}`));
      process.exit(1);
    }
  });

queueCommand
  .command('remove <id>')
  .description('Remove package from queue')
  .action(async (id) => {
    const spinner = ora('Removing package from queue...').start();
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      const removed = await zembil.queue.remove(id);
      
      if (removed) {
        spinner.succeed('Package removed from queue');
      } else {
        spinner.fail('Package not found in queue');
      }
    } catch (error) {
      spinner.fail(`Failed to remove package: ${error}`);
      process.exit(1);
    }
  });

queueCommand
  .command('clear')
  .description('Clear all packages from queue')
  .action(async () => {
    const spinner = ora('Clearing queue...').start();
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      await zembil.queue.clear();
      spinner.succeed('Queue cleared');
    } catch (error) {
      spinner.fail(`Failed to clear queue: ${error}`);
      process.exit(1);
    }
  });

queueCommand
  .command('status')
  .description('Show queue status')
  .action(async () => {
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      const status = await zembil.queue.getStatus();
      const isPaused = await zembil.queue.isPaused();
      
      console.log(chalk.blue('\n📊 Queue Status:'));
      console.log('─'.repeat(40));
      console.log(`⏳ Pending: ${status.pending}`);
      console.log(`⬇️  Downloading: ${status.downloading}`);
      console.log(`⏸️  Paused: ${status.paused}`);
      console.log(`✅ Completed: ${status.completed}`);
      console.log(`❌ Failed: ${status.failed}`);
      if (isPaused) {
        console.log(chalk.yellow('\n⚠️  Queue is currently paused. Use "zembil queue resume" to continue.'));
      }
    } catch (error) {
      console.error(chalk.red(`Failed to get status: ${error}`));
      process.exit(1);
    }
  });

queueCommand
  .command('pause')
  .description('Pause queue processing (current download will be paused)')
  .action(async () => {
    const spinner = ora('Pausing queue...').start();
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      await zembil.queue.pause();
      spinner.succeed('Queue paused. Use "zembil queue resume" to continue.');
    } catch (error) {
      spinner.fail(`Failed to pause: ${error}`);
      process.exit(1);
    }
  });

queueCommand
  .command('resume')
  .description('Resume paused queue processing')
  .action(async () => {
    const spinner = ora('Resuming queue...').start();
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      await zembil.queue.resume();
      spinner.succeed('Queue resumed. Run "zembil sync" to continue downloads.');
    } catch (error) {
      spinner.fail(`Failed to resume: ${error}`);
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Download queued packages (requires internet)')
  .option('-f, --force', 'Force download even if package exists in cache')
  .action(async (options) => {
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      
      // Check if paused
      const isPaused = await zembil.queue.isPaused();
      if (isPaused) {
        console.log(chalk.yellow('⚠️  Queue is paused. Use "zembil queue resume" first.'));
        process.exit(0);
      }
      
      // Show initial status
      const status = await zembil.queue.getStatus();
      const totalPending = status.pending + status.paused;
      
      if (totalPending === 0) {
        console.log(chalk.yellow('No packages to sync. Queue is empty.'));
        return;
      }
      
      console.log(chalk.blue(`\n📦 Syncing ${totalPending} packages...\n`));
      
      // Start sync in background and show progress
      const syncPromise = zembil.sync();
      
      // Monitor progress
      const progressInterval = setInterval(async () => {
        const items = await zembil.queue.list();
        const downloading = items.find(item => item.status === 'downloading');
        
        if (downloading && downloading.progress) {
          const progress = downloading.progress;
          const progressBar = '█'.repeat(Math.floor(progress.percentage / 5)) + 
                            '░'.repeat(20 - Math.floor(progress.percentage / 5));
          const downloadedMB = (progress.downloaded / 1024 / 1024).toFixed(2);
          const totalMB = (progress.total / 1024 / 1024).toFixed(2);
          
          process.stdout.write(`\r⬇️  ${downloading.packageName}@${downloading.version}: ` +
            `[${progressBar}] ${progress.percentage}% (${downloadedMB}MB / ${totalMB}MB)`);
        }
      }, 500);
      
      const result = await syncPromise;
      clearInterval(progressInterval);
      process.stdout.write('\n'); // New line after progress
      
      if (result.success) {
        console.log(chalk.green(`\n✅ Sync completed: ${result.downloaded} downloaded, ${result.failed} failed`));
        if (result.errors.length > 0) {
          console.log(chalk.red('\nErrors:'));
          result.errors.forEach(error => console.log(`  • ${error}`));
        }
      } else {
        console.log(chalk.red(`\n❌ Sync failed: ${result.failed} packages failed to download`));
        result.errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Sync failed: ${error}`));
      process.exit(1);
    }
  });

// Install command
program
  .command('install <packages...>')
  .description('Install packages from cache (works offline)')
  .option('-d, --dir <path>', 'Installation directory', process.cwd())
  .action(async (packages, options) => {
    const spinner = ora('Installing packages from cache...').start();
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      
      for (const packageName of packages) {
        await zembil.install(packageName, options.dir);
      }
      
      spinner.succeed(`Installed ${packages.length} packages from cache`);
    } catch (error) {
      spinner.fail(`Installation failed: ${error}`);
      process.exit(1);
    }
  });

// Cache commands
const cacheCommand = program
  .command('cache')
  .description('Manage cached packages');

cacheCommand
  .command('list')
  .description('List cached packages')
  .action(async () => {
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      const packages = await zembil.cache.list();
      
      if (packages.length === 0) {
        console.log(chalk.yellow('No packages in cache'));
        return;
      }

      console.log(chalk.blue('\n💾 Cached Packages:'));
      console.log('─'.repeat(80));
      
      packages.forEach(pkg => {
        console.log(`📦 ${pkg.name}@${pkg.version} (${pkg.manager})`);
        console.log(`   Size: ${(pkg.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Cached: ${pkg.cachedAt.toLocaleString()}`);
        if (pkg.description) {
          console.log(`   Description: ${pkg.description}`);
        }
        console.log('');
      });
    } catch (error) {
      console.error(chalk.red(`Failed to list cache: ${error}`));
      process.exit(1);
    }
  });

cacheCommand
  .command('remove <package> <version>')
  .description('Remove package from cache')
  .action(async (packageName, version) => {
    const spinner = ora(`Removing ${packageName}@${version} from cache...`).start();
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      const removed = await zembil.cache.remove(packageName, version);
      
      if (removed) {
        spinner.succeed('Package removed from cache');
      } else {
        spinner.fail('Package not found in cache');
      }
    } catch (error) {
      spinner.fail(`Failed to remove package: ${error}`);
      process.exit(1);
    }
  });

cacheCommand
  .command('cleanup')
  .description('Clean up orphaned files and optimize cache')
  .action(async () => {
    const spinner = ora('Cleaning up cache...').start();
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      await zembil.cache.cleanup();
      spinner.succeed('Cache cleaned up');
    } catch (error) {
      spinner.fail(`Cleanup failed: ${error}`);
      process.exit(1);
    }
  });

// Docs command
program
  .command('docs <package> <version>')
  .description('Open package documentation')
  .action(async (packageName, version) => {
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      const docs = await zembil.getDocumentation(packageName, version);
      
      if (docs) {
        console.log(chalk.blue(`\n📚 Documentation for ${packageName}@${version}:`));
        console.log('─'.repeat(80));
        console.log(docs);
      } else {
        console.log(chalk.yellow(`No documentation available for ${packageName}@${version}`));
      }
    } catch (error) {
      console.error(chalk.red(`Failed to get documentation: ${error}`));
      process.exit(1);
    }
  });

// Info command
program
  .command('info')
  .description('Show Zembil information and statistics')
  .action(async () => {
    try {
      const zembil = new Zembil();
      await zembil.initialize();
      const stats = await zembil.getStats();
      
      console.log(chalk.blue('\n🔍 Zembil Statistics:'));
      console.log('─'.repeat(50));
      console.log(`📦 Total packages: ${stats.totalPackages}`);
      console.log(`💾 Cache size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📅 Oldest cache: ${stats.oldestCache.toLocaleDateString()}`);
      console.log(`📅 Newest cache: ${stats.newestCache.toLocaleDateString()}`);
      console.log(`📁 Cache directory: ${zembil.getCacheDir()}`);
    } catch (error) {
      console.error(chalk.red(`Failed to get info: ${error}`));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
