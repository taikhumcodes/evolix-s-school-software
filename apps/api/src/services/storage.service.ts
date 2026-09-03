import fs from 'node:fs/promises';
import path from 'node:path';

export interface StorageProvider {
  upload(fileBuffer: Buffer, destinationPath: string, contentType?: string): Promise<string>;
  delete(destinationPath: string): Promise<boolean>;
  exists(destinationPath: string): Promise<boolean>;
  getBytes(destinationPath: string): Promise<Buffer | null>;
  getUrl(destinationPath: string): Promise<string>;
}

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string = process.env.LOCAL_STORAGE_PATH || './storage') {
    this.basePath = path.resolve(basePath);
  }

  private getFullPath(destinationPath: string): string {
    return path.join(this.basePath, destinationPath);
  }

  async upload(fileBuffer: Buffer, destinationPath: string): Promise<string> {
    const fullPath = this.getFullPath(destinationPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, fileBuffer);
    return destinationPath;
  }

  async delete(destinationPath: string): Promise<boolean> {
    const fullPath = this.getFullPath(destinationPath);
    try {
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async exists(destinationPath: string): Promise<boolean> {
    const fullPath = this.getFullPath(destinationPath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getBytes(destinationPath: string): Promise<Buffer | null> {
    const fullPath = this.getFullPath(destinationPath);
    try {
      return await fs.readFile(fullPath);
    } catch {
      return null;
    }
  }

  async getUrl(destinationPath: string): Promise<string> {
    return `/api/v1/storage/${destinationPath}`;
  }
}

export class S3StorageProvider implements StorageProvider {
  async upload(_fileBuffer: Buffer, destinationPath: string): Promise<string> {
    return destinationPath;
  }
  async delete(_destinationPath: string): Promise<boolean> {
    return false;
  }
  async exists(_destinationPath: string): Promise<boolean> {
    return false;
  }
  async getBytes(_destinationPath: string): Promise<Buffer | null> {
    return null;
  }
  async getUrl(destinationPath: string): Promise<string> {
    return destinationPath;
  }
}

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    const driver = process.env.STORAGE_DRIVER || 'local';
    if (driver === 's3') {
      storageInstance = new S3StorageProvider();
    } else {
      storageInstance = new LocalStorageProvider();
    }
  }
  return storageInstance;
}
