import { SyncManager } from '../sync/SyncManager';
import type { FSAdapter } from '../sync/FileSystemSync';
import { sha256Hex } from '../crypto/CryptoBox';

export class BackupManager {
  constructor(private sync: SyncManager, private fs: FSAdapter) {}

  async writeBackup(path: string): Promise<{ bytes: number; hash: string }> {
    const json = await this.sync.exportToJSON();
    const hash = await sha256Hex(json);
    await this.fs.writeFile(path, json);
    await this.fs.writeFile(path + '.sha256', hash);
    return { bytes: json.length, hash };
  }

  async verifyBackup(path: string): Promise<boolean> {
    const json = await this.fs.readFile(path);
    const want = await this.fs.readFile(path + '.sha256');
    const got = await sha256Hex(json);
    return got === want;
  }

  async restoreBackup(path: string): Promise<{ imported: number; skipped: number }> {
    const ok = await this.verifyBackup(path);
    if (!ok) throw new Error('Integrity check failed');
    const json = await this.fs.readFile(path);
    return this.sync.importFromJSON(json);
  }
}

