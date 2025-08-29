import { describe, it, expect } from 'vitest';
import { createDatabaseManager } from '../db/createDatabase';

describe('SQLite smoke (skip when unavailable)', () => {
  it('initializes and can insert/search', async () => {
    const db = await createDatabaseManager('sqlite');
    if (db.getBackend() !== 'sqlite') {
      // Environment without sqlite-wasm; treat as skip
      expect(db.isReady()).toBe(true);
      return;
    }
    const cat = await db.insertCategory({ name: 'Smoke', color: '#000' });
    expect(cat).toBeGreaterThan(0);
    const id = await db.insertBookmark({ title: 'Hello SQLite', url: 'https://example.com', description: 'FTS5 test', category_id: cat });
    expect(id).toBeGreaterThan(0);
    const res = await db.fullTextSearch('SQLite');
    expect(Array.isArray(res)).toBe(true);
  });
});

