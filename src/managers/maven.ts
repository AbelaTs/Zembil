import * as fs from 'fs-extra';
import * as path from 'path';
import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import { PackageManagerInterface, PackageInfo } from '../types';
import { NetworkUtils } from '../utils/network';

/**
 * Maven package manager implementation for downloading and installing Java packages.
 * Handles package metadata retrieval, JAR downloads, and local installation.
 */
export class MavenManager implements PackageManagerInterface {
  name = 'maven' as const;
  private mavenCentralUrl = 'https://repo1.maven.org/maven2';
  private parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
  });

  /**
   * Installs a Maven package to the target directory.
   * @param packageName - Maven coordinates (groupId:artifactId)
   * @param version - Version of the package
   * @param targetDir - Directory to install the package
   */
  async install(packageName: string, version: string, targetDir: string): Promise<void> {
    await this.getPackageInfo(packageName, version);
    const jarUrl = await this.getJarUrl(packageName, version);
    
    const response = await fetch(jarUrl);
    if (!response.ok) {
      throw new Error(`Failed to download package: ${response.statusText}`);
    }

    const jarPath = path.join(targetDir, `${packageName}-${version}.jar`);
    const buffer = await response.buffer();
    await fs.writeFile(jarPath, buffer);

    const mavenPath = this.getMavenPath(packageName);
    await fs.ensureDir(path.join(targetDir, 'maven', mavenPath));
    await fs.copy(jarPath, path.join(targetDir, 'maven', mavenPath, `${packageName}-${version}.jar`));
  }

  /**
   * Retrieves package information from Maven Central.
   * @param packageName - Maven coordinates (groupId:artifactId)
   * @param version - Version of the package
   * @returns Package information object
   */
  async getPackageInfo(packageName: string, version: string): Promise<PackageInfo> {
    const [groupId, artifactId] = packageName.split(':');
    if (!groupId || !artifactId) {
      throw new Error('Invalid Maven coordinates. Expected format: groupId:artifactId');
    }

    const pomUrl = await this.getPomUrl(groupId, artifactId, version);
    const response = await fetch(pomUrl);
    if (!response.ok) {
      throw new Error(`Package not found: ${packageName}@${version}`);
    }

    const pomContent = await response.text();
    
    // Debug output to see what we're parsing
    // console.log('POM Content:', pomContent);
    let info: any = {};
    try {
        info = this.parsePom(pomContent);
    } catch (e) {
        // Fallback for simple POMs that might fail XML parsing or be empty
        // console.warn('Failed to parse POM XML:', e);
    }
    
    return {
      name: packageName,
      version: version,
      manager: 'maven',
      description: info.description,
      homepage: info.url,
      repository: info.scm?.url,
      license: info.license?.name,
      dependencies: info.dependencies
    };
  }

  /**
   * Downloads a Maven JAR to a temporary location.
   * @param packageName - Maven coordinates (groupId:artifactId)
   * @param version - Version of the package
   * @param onProgress - Optional progress callback (downloaded bytes, total bytes)
   * @returns Path to the downloaded JAR file
   */
  async downloadPackage(packageName: string, version: string, onProgress?: (downloaded: number, total: number) => void): Promise<string> {
    const jarUrl = await this.getJarUrl(packageName, version);
    
    let buffer: Buffer;
    if (onProgress) {
      buffer = await NetworkUtils.downloadWithProgress(jarUrl, onProgress);
    } else {
      const response = await fetch(jarUrl);
      if (!response.ok) {
        throw new Error(`Failed to download package: ${response.statusText}`);
      }
      buffer = await response.buffer();
    }

    const tempPath = path.join(process.cwd(), 'temp', `${packageName.replace(':', '-')}-${version}.jar`);
    await fs.ensureDir(path.dirname(tempPath));
    await fs.writeFile(tempPath, buffer);
    
    return tempPath;
  }

  /**
   * Retrieves package documentation (Javadoc) from Maven Central.
   * @param packageName - Maven coordinates (groupId:artifactId)
   * @param version - Version of the package
   * @returns Javadoc URL or empty string if not available
   */
  async getDocumentation(packageName: string, version: string): Promise<string> {
    const [groupId, artifactId] = packageName.split(':');
    const javadocUrl = `${this.mavenCentralUrl}/${groupId.replace(/\./g, '/')}/${artifactId}/${version}/${artifactId}-${version}-javadoc.jar`;
    
    try {
      const response = await fetch(javadocUrl);
      if (response.ok) {
        return `Javadoc available at: ${javadocUrl}`;
      }
    } catch (error) {
      // Javadoc not available
    }

    return '';
  }

  /**
   * Retrieves package examples (currently not implemented).
   * @param packageName - Maven coordinates (groupId:artifactId)
   * @param version - Version of the package
   * @returns Empty array (feature not yet implemented)
   */
  async getExamples(_packageName: string, _version: string): Promise<string[]> {
    return [];
  }

  /**
   * Lists all available versions of a package.
   * @param packageName - Maven coordinates (groupId:artifactId)
   * @returns Array of version strings
   */
  async listVersions(packageName: string): Promise<string[]> {
    const [groupId, artifactId] = packageName.split(':');
    const metadataUrl = `${this.mavenCentralUrl}/${groupId.replace(/\./g, '/')}/${artifactId}/maven-metadata.xml`;
    
    try {
      const response = await fetch(metadataUrl);
      if (!response.ok) {
        throw new Error(`Package not found: ${packageName}`);
      }

      const metadata = await response.text();
      return this.parseVersionsFromMetadata(metadata);
    } catch (error) {
      throw new Error(`Failed to get versions for ${packageName}: ${error}`);
    }
  }

  /**
   * Gets the JAR URL for a package version.
   * @param packageName - Maven coordinates (groupId:artifactId)
   * @param version - Version of the package
   * @returns JAR download URL
   */
  private async getJarUrl(packageName: string, version: string): Promise<string> {
    const [, artifactId] = packageName.split(':');
    const mavenPath = this.getMavenPath(packageName);
    return `${this.mavenCentralUrl}/${mavenPath}/${version}/${artifactId}-${version}.jar`;
  }

  /**
   * Gets the POM URL for a package version.
   * @param groupId - Maven group ID
   * @param artifactId - Maven artifact ID
   * @param version - Version of the package
   * @returns POM download URL
   */
  private async getPomUrl(groupId: string, artifactId: string, version: string): Promise<string> {
    const mavenPath = this.getMavenPath(`${groupId}:${artifactId}`);
    return `${this.mavenCentralUrl}/${mavenPath}/${version}/${artifactId}-${version}.pom`;
  }

  /**
   * Converts Maven coordinates to repository path.
   * @param packageName - Maven coordinates (groupId:artifactId)
   * @returns Repository path
   */
  private getMavenPath(packageName: string): string {
    const [groupId, artifactId] = packageName.split(':');
    return `${groupId.replace(/\./g, '/')}/${artifactId}`;
  }

  /**
   * Parses POM content to extract package information.
   * @param pomContent - POM XML content
   * @returns Parsed package information
   */
  private parsePom(pomContent: string): any {
    const parsed = this.parser.parse(pomContent);
    const project = parsed.project || {};
    
    const info: any = {
        description: project.description,
        url: project.url,
    };

    if (project.licenses && project.licenses.license) {
        const license = Array.isArray(project.licenses.license) 
            ? project.licenses.license[0] 
            : project.licenses.license;
        info.license = { name: license.name };
    }

    if (project.scm) {
        info.scm = { url: project.scm.url };
    }

    // Parse dependencies
    if (project.dependencies && project.dependencies.dependency) {
        const deps = Array.isArray(project.dependencies.dependency)
            ? project.dependencies.dependency
            : [project.dependencies.dependency];
        
        info.dependencies = {};
        for (const dep of deps) {
            info.dependencies[`${dep.groupId}:${dep.artifactId}`] = dep.version;
        }
    }

    return info;
  }

  /**
   * Parses Maven metadata to extract version information.
   * @param metadata - Maven metadata XML content
   * @returns Array of version strings
   */
  private parseVersionsFromMetadata(metadata: string): string[] {
      const parsed = this.parser.parse(metadata);
      const versioning = parsed.metadata?.versioning;
      
      if (!versioning || !versioning.versions || !versioning.versions.version) {
          return [];
      }

      const versions = Array.isArray(versioning.versions.version)
          ? versioning.versions.version
          : [versioning.versions.version];
          
      return versions
          .filter((v: string) => !v.includes('SNAPSHOT'))
          .sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
  }
}
