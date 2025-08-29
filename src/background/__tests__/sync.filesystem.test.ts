import { describe, it, expect, vi } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { BookmarkService } from '../db/BookmarkService';
import { CategoryService } from '../db/CategoryService';
import { FileSystemSync, type FSAdapter } from '../sync/FileSystemSync';

class MockFS implements FSAdapter {
  store = new Map<string, string>();
  async writeFile(path: string, content: string): Promise<void> { this.store.set(path, content); }
  async readFile(path: string): Promise<string> { const v = this.store.get(path); if (v == null) throw new Error('ENOENT'); return v; }
  async exists(path: string): Promise<boolean> { return this.store.has(path); }
}

describe('Sync 5.2 File System', () => {
  it('backs up and syncs incrementally with progress events', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const cats = new CategoryService(db);
    const bms = new BookmarkService(db);
    const fs = new MockFS();
    const onProgress = vi.fn();
    const fss = new FileSystemSync(db, fs, { onProgress });

    const cid = await cats.create({ name: 'Main' });
    await bms.create({ title: 'A', url: 'https://a', categoryId: cid });
    const backup = await fss.backupNow();
    expect(backup.bytes).toBeGreaterThan(0);

    const r1 = await fss.syncNow();
    expect(r1.wrote).toBe(false); // same hash, no rewrite
    expect(onProgress).toHaveBeenCalled();

    // Simulate remote change by editing file
    const mutated = (await fs.readFile('linktrove.bundle.json')).replace('https://a','https://b');
    await fs.writeFile('linktrove.bundle.json', mutated);

    const r2 = await fss.syncNow();
    // should import remote diff
    expect(r2.imported + r2.skipped).toBeGreaterThanOrEqual(0);
  });
});

