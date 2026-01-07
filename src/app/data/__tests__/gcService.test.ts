import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { getGCStats, runGC, shouldAutoGC, getLastGCTime } from '../gcService';
import type { WebpageData } from '../../../background/storageService';
import { createStorageService } from '../../../background/storageService';

// Mock chrome.storage
const mockStorage: Record<string, any> = {};

global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        setTimeout(() => {
          if (typeof keys === 'string') {
            callback?.({ [keys]: mockStorage[keys] });
          } else if (typeof keys === 'object' && !Array.isArray(keys)) {
            const result: any = {};
            for (const key in keys) {
              result[key] = mockStorage[key] ?? keys[key];
            }
            callback?.(result);
          }
        }, 0);
      }),
      set: vi.fn((items, callback) => {
        Object.assign(mockStorage, items);
        setTimeout(() => {
          callback?.();
        }, 0);
      }),
      remove: vi.fn((keys, callback) => {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach((key) => delete mockStorage[key]);
        setTimeout(() => {
          callback?.();
        }, 0);
      }),
    },
  },
  runtime: {
    lastError: undefined,
  },
} as any;

// Helper to reset database
async function resetDb() {
  try {
    await new Promise((res, rej) => {
      const req = indexedDB.deleteDatabase('linktrove');
      req.onsuccess = () => res(null);
      req.onerror = () => rej(req.error);
    });
  } catch {}
}

// Helper to open IndexedDB directly
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('linktrove', 3);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    // Need to handle onupgradeneeded in case DB doesn't exist
    request.onupgradeneeded = () => {
      // Schema will be created by IDB storage
    };
  });
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Helper to clear all stores
async function clearAllStores() {
  try {
    const db = await openDB();
    const tx = db.transaction(['webpages', 'categories', 'subcategories', 'templates', 'organizations'], 'readwrite');
    await Promise.all([
      tx.objectStore('webpages').clear(),
      tx.objectStore('categories').clear(),
      tx.objectStore('subcategories').clear(),
      tx.objectStore('templates').clear(),
      tx.objectStore('organizations').clear(),
    ]);
    await tx.done;
    db.close();
  } catch (e) {
    // DB might not exist yet, ignore
  }
}

// Helper to add items directly to IDB
async function addWebpages(items: WebpageData[]) {
  const db = await openDB();
  const tx = db.transaction('webpages', 'readwrite');
  const store = tx.objectStore('webpages');
  for (const item of items) {
    store.add(item);
  }
  await tx.done;
  db.close();
}

describe('gcService', () => {
  beforeAll(async () => {
    // Initialize DB by creating storage service
    await resetDb();
    const storage = createStorageService();
    // Trigger schema creation by loading data
    await storage.loadFromLocal().catch(() => []);
  });

  describe('getGCStats', () => {
    it('should return zero tombstones when no deleted items exist', async () => {
      await clearAllStores();
      const stats = await getGCStats();

      expect(stats.totalTombstones).toBe(0);
      expect(stats.oldestTombstone).toBeUndefined();
      expect(stats.categories.webpages).toBe(0);
      expect(stats.categories.categories).toBe(0);
      expect(stats.categories.subcategories).toBe(0);
      expect(stats.categories.templates).toBe(0);
      expect(stats.categories.organizations).toBe(0);
    });

    it('should count deleted webpages', async () => {
      await clearAllStores();
      await addWebpages([
        {
          id: 'w1',
          title: 'Active',
          url: 'https://example.com',
          favicon: '',
          note: '',
          category: 'cat1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'w2',
          title: 'Deleted',
          url: 'https://example.com',
          favicon: '',
          note: '',
          category: 'cat1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-10T00:00:00Z',
          deleted: true,
          deletedAt: '2025-01-10T00:00:00Z',
        },
      ]);

      const stats = await getGCStats();

      expect(stats.totalTombstones).toBe(1);
      expect(stats.categories.webpages).toBe(1);
      expect(stats.oldestTombstone).toBe('2025-01-10T00:00:00.000Z');
    });

    it('should find oldest tombstone across multiple items', async () => {
      await clearAllStores();
      await addWebpages([
        {
          id: 'w1',
          title: 'Deleted Old',
          url: 'https://example.com',
          favicon: '',
          note: '',
          category: 'cat1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-05T00:00:00Z',
          deleted: true,
          deletedAt: '2025-01-05T00:00:00Z', // Oldest
        },
        {
          id: 'w2',
          title: 'Deleted Recent',
          url: 'https://example.com',
          favicon: '',
          note: '',
          category: 'cat1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-15T00:00:00Z',
          deleted: true,
          deletedAt: '2025-01-15T00:00:00Z',
        },
      ]);

      const stats = await getGCStats();

      expect(stats.totalTombstones).toBe(2);
      expect(stats.oldestTombstone).toBe('2025-01-05T00:00:00.000Z');
    });

    it('should handle unix timestamp deletedAt', async () => {
      await clearAllStores();
      const unixTime = 1704499200000; // 2024-01-06T00:00:00.000Z
      await addWebpages([
        {
          id: 'w1',
          title: 'Deleted',
          url: 'https://example.com',
          favicon: '',
          note: '',
          category: 'cat1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-06T00:00:00Z',
          deleted: true,
          deletedAt: unixTime as any,
        },
      ]);

      const stats = await getGCStats();

      expect(stats.totalTombstones).toBe(1);
      expect(stats.oldestTombstone).toBe('2024-01-06T00:00:00.000Z');
    });
  });

  describe('runGC', () => {
    it('should not clean tombstones newer than retention period', async () => {
      await clearAllStores();
      const now = new Date();
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      await addWebpages([
        {
          id: 'w1',
          title: 'Recent Delete',
          url: 'https://example.com',
          favicon: '',
          note: '',
          category: 'cat1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: recentDate.toISOString(),
          deleted: true,
          deletedAt: recentDate.toISOString(),
        },
      ]);

      const result = await runGC(30); // 30 days retention

      expect(result.cleaned).toBe(0);
      expect(result.categories.webpages).toBe(0);

      // Verify item still exists
      const stats = await getGCStats();
      expect(stats.totalTombstones).toBe(1);
    });

    it('should clean tombstones older than retention period', async () => {
      await clearAllStores();
      const now = new Date();
      const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 days ago

      await addWebpages([
        {
          id: 'w1',
          title: 'Old Delete',
          url: 'https://example.com',
          favicon: '',
          note: '',
          category: 'cat1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: oldDate.toISOString(),
          deleted: true,
          deletedAt: oldDate.toISOString(),
        },
      ]);

      const result = await runGC(30); // 30 days retention

      expect(result.cleaned).toBe(1);
      expect(result.categories.webpages).toBe(1);

      // Verify item is gone
      const stats = await getGCStats();
      expect(stats.totalTombstones).toBe(0);
    });

    it('should clean only old tombstones and keep recent ones', async () => {
      await clearAllStores();
      const now = new Date();
      const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      await addWebpages([
        {
          id: 'w1',
          title: 'Old Delete',
          url: 'https://example.com',
          favicon: '',
          note: '',
          category: 'cat1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: oldDate.toISOString(),
          deleted: true,
          deletedAt: oldDate.toISOString(),
        },
        {
          id: 'w2',
          title: 'Recent Delete',
          url: 'https://example.com',
          favicon: '',
          note: '',
          category: 'cat1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: recentDate.toISOString(),
          deleted: true,
          deletedAt: recentDate.toISOString(),
        },
        {
          id: 'w3',
          title: 'Active',
          url: 'https://example.com',
          favicon: '',
          note: '',
          category: 'cat1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-15T00:00:00Z',
        },
      ]);

      const result = await runGC(30);

      expect(result.cleaned).toBe(1);
      expect(result.categories.webpages).toBe(1);

      // Verify only w1 was cleaned
      const db = await openDB();
      const tx = db.transaction('webpages', 'readonly');
      const all = await requestToPromise(tx.objectStore('webpages').getAll());
      db.close();

      expect(all).toHaveLength(2);
      expect(all.find((w: any) => w.id === 'w1')).toBeUndefined();
      expect(all.find((w: any) => w.id === 'w2')).toBeDefined();
      expect(all.find((w: any) => w.id === 'w3')).toBeDefined();
    });

    it('should not delete active items', async () => {
      await clearAllStores();
      await addWebpages([
        {
          id: 'w1',
          title: 'Active',
          url: 'https://example.com',
          favicon: '',
          note: '',
          category: 'cat1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z', // Very old updatedAt
        },
      ]);

      const result = await runGC(30);

      expect(result.cleaned).toBe(0);

      // Verify item still exists
      const db = await openDB();
      const tx = db.transaction('webpages', 'readonly');
      const all = await requestToPromise(tx.objectStore('webpages').getAll());
      db.close();

      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('w1');
    });

    it('should record GC time after running', async () => {
      const before = Date.now();
      await runGC(30);
      const after = Date.now();

      const lastGCTime = await getLastGCTime();
      expect(lastGCTime).toBeDefined();
      expect(lastGCTime).toBeGreaterThanOrEqual(before);
      expect(lastGCTime).toBeLessThanOrEqual(after);
    });
  });

  describe('shouldAutoGC', () => {
    it('should return true when no GC has run before', async () => {
      // Clear GC time
      await new Promise<void>((resolve) => {
        chrome.storage?.local?.remove?.('cloudSync.lastGCTime', () => resolve());
      });

      const should = await shouldAutoGC();
      expect(should).toBe(true);
    });

    it('should return false when GC ran recently', async () => {
      // Set recent GC time
      const recentTime = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago
      await new Promise<void>((resolve) => {
        chrome.storage?.local?.set?.({ 'cloudSync.lastGCTime': recentTime }, () => resolve());
      });

      const should = await shouldAutoGC();
      expect(should).toBe(false);
    });

    it('should return true when GC ran more than 7 days ago', async () => {
      // Set old GC time
      const oldTime = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
      await new Promise<void>((resolve) => {
        chrome.storage?.local?.set?.({ 'cloudSync.lastGCTime': oldTime }, () => resolve());
      });

      const should = await shouldAutoGC();
      expect(should).toBe(true);
    });
  });

  describe('getLastGCTime', () => {
    it('should return undefined when no GC has run', async () => {
      // Clear GC time
      await new Promise<void>((resolve) => {
        chrome.storage?.local?.remove?.('cloudSync.lastGCTime', () => resolve());
      });

      const time = await getLastGCTime();
      expect(time).toBeUndefined();
    });

    it('should return last GC time', async () => {
      const testTime = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      await new Promise<void>((resolve) => {
        chrome.storage?.local?.set?.({ 'cloudSync.lastGCTime': testTime }, () => resolve());
      });

      const time = await getLastGCTime();
      expect(time).toBe(testTime);
    });
  });
});
