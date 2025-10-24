import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { PackageInfo } from '../types';

/**
 * Test utilities for Zembil testing
 */
export class TestUtils {
  /**
   * Creates a temporary directory for testing
   */
  static async createTempDir(prefix: string = 'zembil-test'): Promise<string> {
    const tempDir = path.join(os.tmpdir(), `${prefix}-${Date.now()}`);
    await fs.ensureDir(tempDir);
    return tempDir;
  }

  /**
   * Creates a test package file
   */
  static async createTestPackage(dir: string, name: string = 'test-package.tar.gz'): Promise<string> {
    const packagePath = path.join(dir, name);
    await fs.writeFile(packagePath, `test package content for ${name}`);
    return packagePath;
  }

  /**
   * Creates test documentation directory
   */
  static async createTestDocs(dir: string, name: string = 'docs'): Promise<string> {
    const docsPath = path.join(dir, name);
    await fs.ensureDir(docsPath);
    await fs.writeFile(path.join(docsPath, 'README.md'), 'Test documentation');
    await fs.writeFile(path.join(docsPath, 'API.md'), 'API documentation');
    return docsPath;
  }

  /**
   * Creates test examples directory
   */
  static async createTestExamples(dir: string, name: string = 'examples'): Promise<string> {
    const examplesPath = path.join(dir, name);
    await fs.ensureDir(examplesPath);
    await fs.writeFile(path.join(examplesPath, 'basic.js'), 'console.log("basic example");');
    await fs.writeFile(path.join(examplesPath, 'advanced.js'), 'console.log("advanced example");');
    return examplesPath;
  }

  /**
   * Creates a test package info object
   */
  static createTestPackageInfo(
    name: string = 'test-package',
    version: string = '1.0.0',
    manager: 'npm' | 'pip' | 'maven' = 'npm'
  ): PackageInfo {
    return {
      name,
      version,
      manager,
      description: `Test package ${name}`
    };
  }

  /**
   * Waits for a specified amount of time
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Creates a large test file for size testing
   */
  static async createLargeTestFile(filePath: string, sizeInMB: number = 1): Promise<void> {
    const content = 'x'.repeat(1024 * 1024 * sizeInMB);
    await fs.writeFile(filePath, content);
  }

  /**
   * Verifies that a directory contains expected files
   */
  static async verifyDirectoryContents(dirPath: string, expectedFiles: string[]): Promise<boolean> {
    if (!await fs.pathExists(dirPath)) return false;
    
    const files = await fs.readdir(dirPath);
    return expectedFiles.every(file => files.includes(file));
  }

  /**
   * Creates a mock package manager response
   */
  static createMockPackageResponse(name: string, version: string) {
    return {
      name,
      version,
      description: `Mock package ${name}`,
      dependencies: {},
      repository: {
        type: 'git',
        url: `https://github.com/test/${name}.git`
      },
      homepage: `https://github.com/test/${name}`,
      license: 'MIT'
    };
  }
}
