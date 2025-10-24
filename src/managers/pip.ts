import * as fs from 'fs-extra';
import * as path from 'path';
import fetch from 'node-fetch';
import { PackageManagerInterface, PackageInfo } from '../types';

/**
 * Pip package manager implementation for downloading and installing Python packages.
 * Handles package metadata retrieval, wheel downloads, and local installation.
 */
export class PipManager implements PackageManagerInterface {
  name = 'pip' as const;
  private pypiUrl = 'https://pypi.org/pypi';

  /**
   * Installs a Python package to the target directory.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @param targetDir - Directory to install the package
   */
  async install(packageName: string, version: string, targetDir: string): Promise<void> {
    await this.getPackageInfo(packageName, version);
    const wheelUrl = await this.getWheelUrl(packageName, version);
    
    const response = await fetch(wheelUrl);
    if (!response.ok) {
      throw new Error(`Failed to download package: ${response.statusText}`);
    }

    const wheelPath = path.join(targetDir, `${packageName}-${version}.whl`);
    const buffer = await response.buffer();
    await fs.writeFile(wheelPath, buffer);

    await fs.ensureDir(path.join(targetDir, 'site-packages'));
    await fs.copy(wheelPath, path.join(targetDir, 'site-packages', path.basename(wheelPath)));
  }

  /**
   * Retrieves package information from PyPI.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @returns Package information object
   */
  async getPackageInfo(packageName: string, version: string): Promise<PackageInfo> {
    const response = await fetch(`${this.pypiUrl}/${packageName}/${version}/json`);
    if (!response.ok) {
      throw new Error(`Package not found: ${packageName}@${version}`);
    }

    const data = await response.json() as any;
    const info = data.info;
    
    return {
      name: info.name,
      version: info.version,
      manager: 'pip',
      description: info.summary,
      homepage: info.home_page,
      repository: info.project_urls?.Source || info.project_urls?.Repository,
      license: info.license,
      dependencies: this.parseDependencies(info.requires_dist)
    };
  }

  /**
   * Downloads a Python package wheel to a temporary location.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @returns Path to the downloaded wheel file
   */
  async downloadPackage(packageName: string, version: string): Promise<string> {
    const wheelUrl = await this.getWheelUrl(packageName, version);
    const response = await fetch(wheelUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download package: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    const tempPath = path.join(process.cwd(), 'temp', `${packageName}-${version}.whl`);
    await fs.ensureDir(path.dirname(tempPath));
    await fs.writeFile(tempPath, buffer);
    
    return tempPath;
  }

  /**
   * Retrieves package documentation from PyPI.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @returns Package documentation as string
   */
  async getDocumentation(packageName: string, version: string): Promise<string> {
    const response = await fetch(`${this.pypiUrl}/${packageName}/${version}/json`);
    if (!response.ok) {
      return '';
    }

    const data = await response.json() as any;
    const info = data.info;
    
    return info.description || info.summary || '';
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
    const response = await fetch(`${this.pypiUrl}/${packageName}/json`);
    if (!response.ok) {
      throw new Error(`Package not found: ${packageName}`);
    }

    const data = await response.json() as any;
    return Object.keys(data.releases).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }

  /**
   * Gets the wheel URL for a package version.
   * @param packageName - Name of the package
   * @param version - Version of the package
   * @returns Wheel download URL
   */
  private async getWheelUrl(packageName: string, version: string): Promise<string> {
    const response = await fetch(`${this.pypiUrl}/${packageName}/${version}/json`);
    if (!response.ok) {
      throw new Error(`Package not found: ${packageName}@${version}`);
    }

    const data = await response.json() as any;
    const urls = data.urls || [];
    
    const wheelUrl = urls.find((url: any) => url.packagetype === 'bdist_wheel');
    if (wheelUrl) {
      return wheelUrl.url;
    }

    const sourceUrl = urls.find((url: any) => url.packagetype === 'sdist');
    if (sourceUrl) {
      return sourceUrl.url;
    }

    throw new Error(`No suitable distribution found for ${packageName}@${version}`);
  }

  /**
   * Parses dependency requirements from PyPI format.
   * @param requiresDist - Array of requirement strings
   * @returns Parsed dependencies object
   */
  private parseDependencies(requiresDist: string[]): Record<string, string> | undefined {
    if (!requiresDist || requiresDist.length === 0) {
      return undefined;
    }

    const deps: Record<string, string> = {};
    for (const req of requiresDist) {
      const match = req.match(/^([a-zA-Z0-9_-]+)(.*)$/);
      if (match) {
        const name = match[1];
        const version = match[2] || '*';
        deps[name] = version;
      }
    }
    return deps;
  }
}
