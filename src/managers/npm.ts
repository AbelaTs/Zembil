import * as fs from 'fs-extra';
import * as path from 'path';
import * as tar from 'tar';
import fetch from 'node-fetch';
import { PackageManagerInterface, PackageInfo } from '../types';

/**
 * NPM package manager implementation for downloading and installing Node.js packages.
 * Handles package metadata retrieval, tarball downloads, and local installation.
 */
export class NpmManager implements PackageManagerInterface {
  name = 'npm' as const;
  private registryUrl = 'https://registry.npmjs.org';

  /**
   * Installs a package to the target directory.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @param targetDir - Directory to install the package
   */
  async install(packageName: string, version: string, targetDir: string): Promise<void> {
    const _packageInfo = await this.getPackageInfo(packageName, version);
    const tarballUrl = await this.getTarballUrl(packageName, version);
    
    const response = await fetch(tarballUrl);
    if (!response.ok) {
      throw new Error(`Failed to download package: ${response.statusText}`);
    }

    const tarballPath = path.join(targetDir, `${packageName}-${version}.tgz`);
    const buffer = await response.buffer();
    await fs.writeFile(tarballPath, buffer);

    await tar.extract({
      file: tarballPath,
      cwd: targetDir,
      strip: 1
    });

    await fs.remove(tarballPath);
  }

  /**
   * Retrieves package information from the npm registry.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @returns Package information object
   */
  async getPackageInfo(packageName: string, version: string): Promise<PackageInfo> {
    const response = await fetch(`${this.registryUrl}/${packageName}/${version}`);
    if (!response.ok) {
      throw new Error(`Package not found: ${packageName}@${version}`);
    }

    const data = await response.json() as any;
    
    return {
      name: data.name,
      version: data.version,
      manager: 'npm',
      description: data.description,
      homepage: data.homepage,
      repository: data.repository?.url,
      license: data.license,
      dependencies: data.dependencies,
      devDependencies: data.devDependencies,
      peerDependencies: data.peerDependencies
    };
  }

  /**
   * Downloads a package tarball to a temporary location.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @returns Path to the downloaded tarball
   */
  async downloadPackage(packageName: string, version: string): Promise<string> {
    const tarballUrl = await this.getTarballUrl(packageName, version);
    const response = await fetch(tarballUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download package: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    const tempPath = path.join(process.cwd(), 'temp', `${packageName}-${version}.tgz`);
    await fs.ensureDir(path.dirname(tempPath));
    await fs.writeFile(tempPath, buffer);
    
    return tempPath;
  }

  /**
   * Retrieves package documentation from the npm registry.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @returns Package documentation as markdown string
   */
  async getDocumentation(packageName: string, version: string): Promise<string> {
    const _packageInfo = await this.getPackageInfo(packageName, version);
    
    const response = await fetch(`${this.registryUrl}/${packageName}/${version}`);
    if (!response.ok) {
      return '';
    }

    const data = await response.json() as any;
    return data.readme || '';
  }

  /**
   * Retrieves package examples (currently not implemented).
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @returns Empty array (feature not yet implemented)
   */
  async getExamples(_packageName: string, _version: string): Promise<string[]> {
    return [];
  }

  /**
   * Lists all available versions of a package.
   * @param packageName - Name of the package
   * @returns Array of version strings
   */
  async listVersions(packageName: string): Promise<string[]> {
    const response = await fetch(`${this.registryUrl}/${packageName}`);
    if (!response.ok) {
      throw new Error(`Package not found: ${packageName}`);
    }

    const data = await response.json() as any;
    return Object.keys(data.versions).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }

  /**
   * Gets the tarball URL for a package version.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @returns Tarball download URL
   */
  private async getTarballUrl(packageName: string, version: string): Promise<string> {
    const response = await fetch(`${this.registryUrl}/${packageName}/${version}`);
    if (!response.ok) {
      throw new Error(`Package not found: ${packageName}@${version}`);
    }

    const data = await response.json() as any;
    return data.dist.tarball;
  }
}
