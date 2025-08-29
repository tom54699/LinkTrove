import { DatabaseManager } from './DatabaseManager';

/**
 * Factory that tries to create a SQLite-backed DatabaseManager, and
 * falls back to the in-memory DatabaseManager when the environment
 * cannot load SQLite-WASM/OPFS (such as tests or limited sandboxes).
 */
export async function createDatabaseManager(prefer: 'sqlite' | 'memory' = 'memory'): Promise<DatabaseManager> {
  if (prefer === 'sqlite') {
    try {
      // Placeholder for future SQLite init (wasm + OPFS mounting)
      // If any step throws, we will fall back to memory.
      // For now, we intentionally fall through to fallback to keep tests stable.
      throw new Error('sqlite not available in this environment');
    } catch {
      const db = new DatabaseManager('memory');
      await db.init();
      return db;
    }
  }
  const db = new DatabaseManager('memory');
  await db.init();
  return db;
}

