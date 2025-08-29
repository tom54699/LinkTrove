import { DatabaseManager } from '../db/DatabaseManager';
import { SyncManager } from './SyncManager';

export interface FSAdapter {
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
}

export interface FileSystemSyncOptions {
  filename?: string; // default: linktrove.bundle.json
  onProgress?: (phase: 'export' | 'write' | 'read' | 'import' | 'idle') => void;
}

export class FileSystemSync {
  private filename: string;
  private sync: SyncManager;
  constructor(private db: DatabaseManager, private fs: FSAdapter, opts: FileSystemSyncOptions = {}) {
    this.filename = opts.filename || 'linktrove.bundle.json';
    this.sync = new SyncManager(db);
    this.onProgress = opts.onProgress || (()=>{});
  }
  onProgress: (phase: 'export' | 'write' | 'read' | 'import' | 'idle') => void;

  private hash(s: string): string {
    // Simple djb2 hash as hex for deterministic compare (not crypto-secure)
    let h = 5381 >>> 0;
    for (let i = 0; i < s.length; i++) { h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  async backupNow(): Promise<{ bytes: number; hash: string }> {
    this.onProgress('export');
    const json = await this.sync.exportToJSON();
    this.onProgress('write');
    await this.fs.writeFile(this.filename, json);
    this.onProgress('idle');
    return { bytes: json.length, hash: this.hash(json) };
  }

  async syncNow(): Promise<{ wrote: boolean; imported: number; skipped: number; currentHash: string }>
  {
    const json = await this.sync.exportToJSON();
    const localHash = this.hash(json);
    let remote = '';
    if (await this.fs.exists(this.filename)) {
      this.onProgress('read');
      remote = await this.fs.readFile(this.filename);
    }
    const remoteHash = remote ? this.hash(remote) : '';
    let wrote = false;
    if (!remote || remoteHash !== localHash) {
      this.onProgress('write');
      await this.fs.writeFile(this.filename, json);
      wrote = true;
    }
    // If remote exists and is different/newer, import it
    let imported = 0, skipped = 0;
    if (remote && remoteHash !== localHash) {
      this.onProgress('import');
      try {
        const res = await this.sync.importFromJSON(remote);
        imported = res.imported; skipped = res.skipped;
      } catch {
        // ignore malformed remote; rely on local snapshot
      }
    }
    this.onProgress('idle');
    return { wrote, imported, skipped, currentHash: localHash };
  }
}

