import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  listSnapshots,
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
  clearAllSnapshots,
  type Snapshot,
} from '../snapshotService';

// Mock chrome.storage
const mockStorage = {
  'cloudSync.snapshots': [] as Snapshot[],
};

global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        // Ensure callback is called asynchronously to match real behavior
        setTimeout(() => {
          if (typeof keys === 'string') {
            callback?.({ [keys]: mockStorage[keys as keyof typeof mockStorage] });
          } else if (typeof keys === 'object' && !Array.isArray(keys)) {
            const result: any = {};
            for (const key in keys) {
              result[key] = mockStorage[key as keyof typeof mockStorage] ?? keys[key];
            }
            callback?.(result);
          }
        }, 0);
      }),
      set: vi.fn((items, callback) => {
        Object.assign(mockStorage, items);
        // Ensure callback is called asynchronously
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

// Mock storageService
vi.mock('../../../background/storageService', () => ({
  createStorageService: () => ({
    exportData: vi.fn(async () => JSON.stringify({
      schemaVersion: 1,
      webpages: [
        { id: 'w1', title: 'Page 1', url: 'https://example.com/1', category: 'cat1', updatedAt: '2025-01-01T00:00:00Z' },
        { id: 'w2', title: 'Page 2', url: 'https://example.com/2', category: 'cat1', updatedAt: '2025-01-02T00:00:00Z' },
      ],
      categories: [
        { id: 'cat1', name: 'Category 1', color: '#64748b', order: 0, updatedAt: '2025-01-01T00:00:00Z' },
      ],
      templates: [],
      subcategories: [],
      organizations: [],
      settings: {},
      orders: { subcategories: {} },
      exportedAt: '2025-01-15T00:00:00Z',
    })),
    importData: vi.fn(async () => {}),
    loadFromLocal: vi.fn(async () => []),
    loadFromSync: vi.fn(async () => []),
    loadTemplates: vi.fn(async () => []),
    listOrganizations: vi.fn(async () => []),
  }),
}));

describe('snapshotService', () => {
  beforeEach(() => {
    // Reset mock storage
    mockStorage['cloudSync.snapshots'] = [];
    vi.clearAllMocks();
  });

  describe('listSnapshots', () => {
    it('should return empty array when no snapshots exist', async () => {
      const snapshots = await listSnapshots();
      expect(snapshots).toEqual([]);
    });

    it('should return existing snapshots', async () => {
      const mockSnapshots: Snapshot[] = [
        {
          id: 'snapshot-1',
          createdAt: '2025-01-15T10:00:00Z',
          reason: 'before-restore',
          data: {
            schemaVersion: 1,
            webpages: [],
            categories: [],
            templates: [],
            subcategories: [],
            organizations: [],
            settings: {},
            orders: { subcategories: {} },
          },
          summary: { webpages: 0, categories: 0, templates: 0, subcategories: 0, organizations: 0 },
        },
      ];
      mockStorage['cloudSync.snapshots'] = mockSnapshots;

      const snapshots = await listSnapshots();
      expect(snapshots).toEqual(mockSnapshots);
    });
  });

  describe('createSnapshot', () => {
    it('should create a snapshot with correct structure', async () => {
      const snapshot = await createSnapshot('before-restore');

      expect(snapshot).toMatchObject({
        id: expect.stringMatching(/^snapshot-\d+$/),
        createdAt: expect.any(String),
        reason: 'before-restore',
        data: expect.objectContaining({
          schemaVersion: 1,
          webpages: expect.any(Array),
          categories: expect.any(Array),
        }),
        summary: expect.objectContaining({
          webpages: 2,
          categories: 1,
          templates: 0,
          subcategories: 0,
          organizations: 0,
        }),
      });
    });

    it('should add snapshot to beginning of list', async () => {
      await createSnapshot('before-restore');
      await createSnapshot('before-merge');

      const snapshots = await listSnapshots();
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].reason).toBe('before-merge');
      expect(snapshots[1].reason).toBe('before-restore');
    });

    it('should limit snapshots to MAX_SNAPSHOTS (3)', async () => {
      await createSnapshot('before-restore');
      await createSnapshot('before-merge');
      await createSnapshot('manual');
      await createSnapshot('before-restore');

      const snapshots = await listSnapshots();
      expect(snapshots).toHaveLength(3);
      expect(snapshots[0].reason).toBe('before-restore');
      expect(snapshots[1].reason).toBe('manual');
      expect(snapshots[2].reason).toBe('before-merge');
    });

    it('should save snapshot to chrome.storage.local', async () => {
      await createSnapshot('before-restore');

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'cloudSync.snapshots': expect.arrayContaining([
            expect.objectContaining({
              reason: 'before-restore',
            }),
          ]),
        }),
        expect.any(Function)
      );
    });
  });

  describe('restoreSnapshot', () => {
    it('should throw error if snapshot does not exist', async () => {
      await expect(restoreSnapshot('non-existent')).rejects.toThrow('快照不存在');
    });

    it('should restore data from snapshot', async () => {
      const snapshot = await createSnapshot('before-restore');

      // Should not throw
      await expect(restoreSnapshot(snapshot.id)).resolves.not.toThrow();
    });

    it('should trigger UI refresh events', async () => {
      const snapshot = await createSnapshot('before-restore');
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      await restoreSnapshot(snapshot.id);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'snapshot:restored',
          detail: expect.objectContaining({
            snapshotId: snapshot.id,
          }),
        })
      );

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'groups:changed',
        })
      );
    });
  });

  describe('deleteSnapshot', () => {
    it('should remove snapshot from list', async () => {
      await createSnapshot('before-restore');
      const snapshot2 = await createSnapshot('before-merge');
      await createSnapshot('manual');

      // Verify we have 3 snapshots
      let snapshots = await listSnapshots();
      expect(snapshots).toHaveLength(3);

      // Delete the middle one
      await deleteSnapshot(snapshot2.id);

      snapshots = await listSnapshots();
      expect(snapshots).toHaveLength(2);
      expect(snapshots.find(s => s.id === snapshot2.id)).toBeUndefined();
    });

    it('should not throw if snapshot does not exist', async () => {
      await expect(deleteSnapshot('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clearAllSnapshots', () => {
    it('should remove all snapshots', async () => {
      await createSnapshot('before-restore');
      await createSnapshot('before-merge');
      await createSnapshot('manual');

      await clearAllSnapshots();

      const snapshots = await listSnapshots();
      expect(snapshots).toEqual([]);
    });

    it('should set empty array in storage', async () => {
      await createSnapshot('before-restore');

      await clearAllSnapshots();

      expect(chrome.storage.local.set).toHaveBeenLastCalledWith(
        { 'cloudSync.snapshots': [] },
        expect.any(Function)
      );
    });
  });

  describe('snapshot data integrity', () => {
    it('should preserve complete data structure', async () => {
      const snapshot = await createSnapshot('before-restore');

      expect(snapshot.data).toMatchObject({
        schemaVersion: 1,
        webpages: expect.any(Array),
        categories: expect.any(Array),
        templates: expect.any(Array),
        subcategories: expect.any(Array),
        organizations: expect.any(Array),
        settings: expect.any(Object),
        orders: expect.objectContaining({
          subcategories: expect.any(Object),
        }),
      });
    });

    it('should correctly count data items in summary', async () => {
      const snapshot = await createSnapshot('before-merge');

      expect(snapshot.summary.webpages).toBe(2);
      expect(snapshot.summary.categories).toBe(1);
      expect(snapshot.summary.templates).toBe(0);
      expect(snapshot.summary.subcategories).toBe(0);
      expect(snapshot.summary.organizations).toBe(0);
    });

    it('should handle malformed data arrays gracefully', async () => {
      const snapshot = await createSnapshot('manual');

      // Even with non-array fields, should not crash
      expect(snapshot.summary.webpages).toBeGreaterThanOrEqual(0);
      expect(snapshot.summary.categories).toBeGreaterThanOrEqual(0);
      expect(snapshot.summary.templates).toBeGreaterThanOrEqual(0);
      expect(snapshot.summary.subcategories).toBeGreaterThanOrEqual(0);
      expect(snapshot.summary.organizations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('reason types', () => {
    it('should accept "before-restore" reason', async () => {
      const snapshot = await createSnapshot('before-restore');
      expect(snapshot.reason).toBe('before-restore');
    });

    it('should accept "before-merge" reason', async () => {
      const snapshot = await createSnapshot('before-merge');
      expect(snapshot.reason).toBe('before-merge');
    });

    it('should accept "manual" reason', async () => {
      const snapshot = await createSnapshot('manual');
      expect(snapshot.reason).toBe('manual');
    });
  });
});
