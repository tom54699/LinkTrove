import { DatabaseManager } from './DatabaseManager';

/**
 * Factory that tries to create a SQLite-backed DatabaseManager, and
 * falls back to the in-memory DatabaseManager when the environment
 * cannot load SQLite-WASM/OPFS (such as tests or limited sandboxes).
 */
export async function createDatabaseManager(prefer: 'sqlite' | 'memory' = 'memory'): Promise<DatabaseManager> {
  if (prefer === 'sqlite') {
    const db = new DatabaseManager('sqlite');
    await db.init();
    if (db.getBackend() === 'sqlite') return db;
    // Fallback already handled inside init()
    return db;
  }
  const db = new DatabaseManager('memory');
  await db.init();
  return db;
}
