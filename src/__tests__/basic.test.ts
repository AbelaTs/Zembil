import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('Basic File Operations', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), 'zembil-basic-test');
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  test('should create and manage directories', async () => {
    const cacheDir = path.join(tempDir, 'cache');
    await fs.ensureDir(cacheDir);
    await fs.ensureDir(path.join(cacheDir, 'packages'));
    await fs.ensureDir(path.join(cacheDir, 'docs'));
    await fs.ensureDir(path.join(cacheDir, 'examples'));

    expect(await fs.pathExists(path.join(cacheDir, 'packages'))).toBe(true);
    expect(await fs.pathExists(path.join(cacheDir, 'docs'))).toBe(true);
    expect(await fs.pathExists(path.join(cacheDir, 'examples'))).toBe(true);
  });

  test('should handle file operations', async () => {
    const testFile = path.join(tempDir, 'test.txt');
    const content = 'test content';
    
    await fs.writeFile(testFile, content);
    expect(await fs.pathExists(testFile)).toBe(true);
    
    const readContent = await fs.readFile(testFile, 'utf8');
    expect(readContent).toBe(content);
    
    await fs.remove(testFile);
    expect(await fs.pathExists(testFile)).toBe(false);
  });

  test('should copy files', async () => {
    const sourceFile = path.join(tempDir, 'source.txt');
    const destFile = path.join(tempDir, 'dest.txt');
    const content = 'test content';
    
    await fs.writeFile(sourceFile, content);
    await fs.copy(sourceFile, destFile);
    
    expect(await fs.pathExists(destFile)).toBe(true);
    
    const copiedContent = await fs.readFile(destFile, 'utf8');
    expect(copiedContent).toBe(content);
  });

  test('should handle directory copying', async () => {
    const sourceDir = path.join(tempDir, 'source');
    const destDir = path.join(tempDir, 'dest');
    
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'file1.txt'), 'content1');
    await fs.writeFile(path.join(sourceDir, 'file2.txt'), 'content2');
    
    await fs.copy(sourceDir, destDir);
    
    expect(await fs.pathExists(destDir)).toBe(true);
    expect(await fs.pathExists(path.join(destDir, 'file1.txt'))).toBe(true);
    expect(await fs.pathExists(path.join(destDir, 'file2.txt'))).toBe(true);
  });
});
