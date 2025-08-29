import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { MigrationService } from '../migration/MigrationService';
import type { LegacyStores } from '../migration/types';

describe('Migration rollback on write error (transactional)', () => {
  it('restores DB when a bookmark insert fails inside transaction', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const before = await db.exportSnapshot();
    const legacy: LegacyStores = {
      async loadCategories() { return [{ id: 'default', name: 'Default', color: '#333', order: 0 } as any]; },
      async loadWebpages() { return [ { id: 'ok', title: 'Ok', url: 'https://ok' } as any, { id: 'bad', title: 'Bad', url: 'https://bad' } as any ]; },
    };
    const origInsert = db.insertBookmark.bind(db);
    db.insertBookmark = (row: any) => {
      if (String(row.title).toLowerCase() === 'bad') return Promise.reject(new Error('boom'));
      return origInsert(row);
    };
    const m = new MigrationService(db, legacy);
    try { await m.migrate(); } catch {}
    const after = await db.exportSnapshot();
    // Transaction should have rolled back bookmark writes; categories may have been inserted outside txn
    expect(after.bookmarks.length).toBe(before.bookmarks.length);
  });
});

