import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { BookmarkService } from '../db/BookmarkService';
import { SyncManager } from '../sync/SyncManager';

describe('Sync 5.1 Netscape HTML export', () => {
  it('generates a bookmarks HTML document', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const bms = new BookmarkService(db);
    const sync = new SyncManager(db);
    await bms.create({ title: 'React', url: 'https://react.dev' });
    const html = await sync.exportToNetscapeHTML();
    expect(html.includes('<!DOCTYPE NETSCAPE-Bookmark-file-1>')).toBe(true);
    expect(html.includes('<A HREF="https://react.dev"')).toBe(true);
  });
});

