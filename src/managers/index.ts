import { PackageManagerInterface } from '../types';
import { NpmManager } from './npm';
import { PipManager } from './pip';
import { MavenManager } from './maven';

export class PackageManagerFactory {
  private static managers: Map<string, PackageManagerInterface> = new Map();

  static getManager(manager: string): PackageManagerInterface {
    if (this.managers.has(manager)) {
      return this.managers.get(manager)!;
    }

    let managerInstance: PackageManagerInterface;

    switch (manager) {
      case 'npm':
        managerInstance = new NpmManager();
        break;
      case 'pip':
        managerInstance = new PipManager();
        break;
      case 'maven':
        managerInstance = new MavenManager();
        break;
      default:
        throw new Error(`Unsupported package manager: ${manager}`);
    }

    this.managers.set(manager, managerInstance);
    return managerInstance;
  }

  static getSupportedManagers(): string[] {
    return ['npm', 'pip', 'maven'];
  }
}

export { NpmManager, PipManager, MavenManager };
