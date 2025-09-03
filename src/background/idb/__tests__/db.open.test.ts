import { describe, it, expect } from 'vitest';
import { openDb, getAll, putAll, clearStore } from '../../idb/db';

describe('IDB open + basic ops', () => {
  it('opens database and performs basic put/get', async () => {
    const db = await openDb();
    expect(db.name).toBe('linktrove');
    await clearStore('categories');
    await putAll('categories', [{ id: 'c1', name: 'Default', color: '#999', order: 0 }]);
    const cats = await getAll('categories');
    expect(cats.length).toBe(1);
    expect(cats[0].id).toBe('c1');
  });
});

