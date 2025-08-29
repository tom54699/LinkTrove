import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { SyncManager } from '../sync/SyncManager';

describe('Sync 5.1 Chrome format import', () => {
  it('imports minimal Chrome bookmarks JSON', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const sync = new SyncManager(db);
    const chrome = JSON.stringify({
      roots: {
        bookmark_bar: {
          name: 'Bookmarks bar',
          type: 'folder',
          children: [
            { name: 'FolderA', type: 'folder', children: [ { name: 'Site', type: 'url', url: 'https://example.com' } ] },
            { name: 'Direct', type: 'url', url: 'https://direct.com' }
          ]
        }
      }
    });
    const res = await sync.importFromChromeFormat(chrome);
    expect(res.imported).toBeGreaterThan(0);
  });
});

