import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { BookmarkService } from '../db/BookmarkService';
import { CategoryService } from '../db/CategoryService';
import { SyncManager } from '../sync/SyncManager';

describe('Sync 5.1 JSON export/import', () => {
  it('exports bundle and imports back with duplicate handling', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const cats = new CategoryService(db);
    const bms = new BookmarkService(db);
    const sync = new SyncManager(db);
    const cid = await cats.create({ name: 'Dev' });
    await bms.create({ title: 'React', url: 'https://react.dev', categoryId: cid, meta: { author: 'Dan' } });
    await bms.create({ title: 'Vite', url: 'https://vitejs.dev', categoryId: cid });

    const json = await sync.exportToJSON();
    // clear and re-import
    const empty = new DatabaseManager('memory'); await empty.init();
    const sync2 = new SyncManager(empty);
    const res = await sync2.importFromJSON(json);
    expect(res.imported).toBeGreaterThan(0);
    // reimport again to trigger duplicate skip
    const res2 = await sync2.importFromJSON(json);
    expect(res2.skipped).toBeGreaterThan(0);
  });
});

