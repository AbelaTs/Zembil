import * as fs from 'fs-extra';
import * as path from 'path';
import { CachedPackage } from '../types';

export class OfflineUtils {
  static async createOfflinePackage(packageName: string, version: string, manager: string): Promise<string> {
    // Create a portable package that can be shared offline
    const tempDir = path.join(process.cwd(), 'temp', `offline-${packageName}-${version}`);
    await fs.ensureDir(tempDir);

    // Create package manifest
    const manifest = {
      name: packageName,
      version: version,
      manager: manager,
      created: new Date().toISOString(),
      zembil: {
        version: '1.0.0',
        format: 'offline-package'
      }
    };

    await fs.writeFile(
      path.join(tempDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    return tempDir;
  }

  static async extractOfflinePackage(packagePath: string, targetDir: string): Promise<void> {
    const manifestPath = path.join(packagePath, 'manifest.json');
    
    if (!await fs.pathExists(manifestPath)) {
      throw new Error('Invalid offline package: manifest.json not found');
    }

    const _manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    
    // Copy package files
    const packageFiles = await fs.readdir(packagePath);
    for (const file of packageFiles) {
      if (file !== 'manifest.json') {
        await fs.copy(
          path.join(packagePath, file),
          path.join(targetDir, file)
        );
      }
    }
  }

  static async createOfflineBundle(packages: CachedPackage[], outputPath: string): Promise<void> {
    const bundleDir = path.join(process.cwd(), 'temp', 'offline-bundle');
    await fs.ensureDir(bundleDir);

    // Create bundle manifest
    const bundleManifest = {
      created: new Date().toISOString(),
      packages: packages.map(pkg => ({
        name: pkg.name,
        version: pkg.version,
        manager: pkg.manager,
        size: pkg.size,
        cachedAt: pkg.cachedAt.toISOString()
      })),
      totalSize: packages.reduce((sum, pkg) => sum + pkg.size, 0),
      zembil: {
        version: '1.0.0',
        format: 'offline-bundle'
      }
    };

    await fs.writeFile(
      path.join(bundleDir, 'bundle.json'),
      JSON.stringify(bundleManifest, null, 2)
    );

    // Copy package files
    for (const pkg of packages) {
      const packageDir = path.join(bundleDir, 'packages', `${pkg.name}-${pkg.version}`);
      await fs.ensureDir(packageDir);

      // Copy main package
      await fs.copy(pkg.localPath, path.join(packageDir, 'package.tar.gz'));

      // Copy documentation if available
      if (pkg.documentationPath) {
        await fs.copy(pkg.documentationPath, path.join(packageDir, 'docs'));
      }

      // Copy examples if available
      if (pkg.examplesPath) {
        await fs.copy(pkg.examplesPath, path.join(packageDir, 'examples'));
      }
    }

    // Create archive
    const archiver = require('archiver');
    const output = require('fs').createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve());
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(bundleDir, false);
      archive.finalize();
    });
  }

  static async extractOfflineBundle(bundlePath: string, targetDir: string): Promise<void> {
    const extract = require('extract-zip');
    const tempDir = path.join(process.cwd(), 'temp', 'bundle-extract');
    
    await fs.ensureDir(tempDir);
    await extract(bundlePath, { dir: tempDir });

    // Read bundle manifest
    const bundleManifest = JSON.parse(
      await fs.readFile(path.join(tempDir, 'bundle.json'), 'utf8')
    );

    // Extract packages
    for (const pkgInfo of bundleManifest.packages) {
      const packageDir = path.join(tempDir, 'packages', `${pkgInfo.name}-${pkgInfo.version}`);
      
      if (await fs.pathExists(packageDir)) {
        const targetPackageDir = path.join(targetDir, pkgInfo.name);
        await fs.ensureDir(targetPackageDir);
        
        // Extract package
        const tar = require('tar');
        await tar.extract({
          file: path.join(packageDir, 'package.tar.gz'),
          cwd: targetPackageDir
        });

        // Copy documentation and examples
        if (await fs.pathExists(path.join(packageDir, 'docs'))) {
          await fs.copy(
            path.join(packageDir, 'docs'),
            path.join(targetPackageDir, 'docs')
          );
        }

        if (await fs.pathExists(path.join(packageDir, 'examples'))) {
          await fs.copy(
            path.join(packageDir, 'examples'),
            path.join(targetPackageDir, 'examples')
          );
        }
      }
    }
  }

  static async validateOfflinePackage(packagePath: string): Promise<boolean> {
    try {
      const manifestPath = path.join(packagePath, 'manifest.json');
      
      if (!await fs.pathExists(manifestPath)) {
        return false;
      }

      const _manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      
      // Check required fields
      return !!(
        manifest.name &&
        manifest.version &&
        manifest.manager &&
        manifest.zembil &&
        manifest.zembil.format === 'offline-package'
      );
    } catch (error) {
      return false;
    }
  }

  static async getOfflinePackageInfo(packagePath: string): Promise<{
    name: string;
    version: string;
    manager: string;
    created: string;
  } | null> {
    try {
      const manifestPath = path.join(packagePath, 'manifest.json');
      const _manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      
      return {
        name: manifest.name,
        version: manifest.version,
        manager: manifest.manager,
        created: manifest.created
      };
    } catch (error) {
      return null;
    }
  }
}
