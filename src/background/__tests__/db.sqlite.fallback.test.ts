import { describe, it, expect } from 'vitest';
import { createDatabaseManager } from '../db/createDatabase';

describe('DB factory sqlite fallback', () => {
  it('falls back to memory when sqlite is unavailable', async () => {
    const db = await createDatabaseManager('sqlite');
    expect(db.isReady()).toBe(true);
    expect(db.getBackend()).toBe('memory');
  });
});

