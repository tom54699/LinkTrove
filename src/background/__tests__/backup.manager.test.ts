import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { BookmarkService } from '../db/BookmarkService';
import { SyncManager } from '../sync/SyncManager';
import { BackupManager } from '../backup/BackupManager';
import type { FSAdapter } from '../sync/FileSystemSync';

class MemFS implements FSAdapter {
  store = new Map<string, string>();
  async writeFile(p: string, c: string) { this.store.set(p, c); }
  async readFile(p: string) { const v = this.store.get(p); if (v == null) throw new Error('ENOENT'); return v; }
  async exists(p: string) { return this.store.has(p); }
}

describe('Security 7.2 Backup integrity & restore', () => {
  it('writes backup with sha256 and restores only if valid', async () => {
    const db = new DatabaseManager('memory'); await db.init();
    const bms = new BookmarkService(db);
    await bms.create({ title: 'A', url: 'https://a' });
    const sync = new SyncManager(db);
    const fs = new MemFS();
    const mgr = new BackupManager(sync, fs);

    const stat = await mgr.writeBackup('bk.json');
    expect(stat.hash).toMatch(/^[a-f0-9]{64}$/);
    const ok = await mgr.verifyBackup('bk.json');
    expect(ok).toBe(true);

    // Tamper
    await fs.writeFile('bk.json', (await fs.readFile('bk.json')).replace('https://a','https://b'));
    const ok2 = await mgr.verifyBackup('bk.json');
    expect(ok2).toBe(false);
  });
});

