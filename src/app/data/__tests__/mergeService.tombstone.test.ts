import { describe, it, expect } from 'vitest';
import { mergeLWW, type ExportPayload } from '../mergeService';
import type { WebpageData } from '../../../background/storageService';

describe('mergeLWW - Tombstone (soft delete)', () => {
  const baseWebpage: WebpageData = {
    id: 'w1',
    title: 'Test Page',
    url: 'https://example.com',
    favicon: '',
    note: '',
    category: 'cat1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  const basePayload: ExportPayload = {
    schemaVersion: 1,
    webpages: [],
    categories: [],
    templates: [],
    subcategories: [],
    organizations: [],
    orders: { subcategories: {} },
    exportedAt: '2025-01-10T00:00:00Z',
  };

  describe('Basic tombstone behavior', () => {
    it('should filter out deleted items from final result', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [
          { ...baseWebpage, id: 'w1', deleted: true, deletedAt: '2025-01-10T00:00:00Z' },
          { ...baseWebpage, id: 'w2', deleted: false },
        ],
        exportedAt: '2025-01-10T00:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [],
        exportedAt: '2025-01-09T00:00:00Z',
      };

      const result = mergeLWW(local, remote);

      // Only w2 should be in result (w1 is deleted)
      expect(result.webpages).toHaveLength(1);
      expect(result.webpages[0].id).toBe('w2');
    });

    it('should not include deleted items even if they exist on both sides', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [
          { ...baseWebpage, id: 'w1', deleted: true, deletedAt: '2025-01-10T00:00:00Z', updatedAt: '2025-01-10T00:00:00Z' },
        ],
        exportedAt: '2025-01-10T00:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [
          { ...baseWebpage, id: 'w1', deleted: true, deletedAt: '2025-01-09T00:00:00Z', updatedAt: '2025-01-09T00:00:00Z' },
        ],
        exportedAt: '2025-01-09T00:00:00Z',
      };

      const result = mergeLWW(local, remote);

      // Both deleted, should be filtered out
      expect(result.webpages).toHaveLength(0);
    });
  });

  describe('Deletion vs Update conflicts', () => {
    it('should keep deletion if deletedAt is newer than remote updatedAt', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [
          {
            ...baseWebpage,
            id: 'w1',
            deleted: true,
            deletedAt: '2025-01-10T12:00:00Z',
            updatedAt: '2025-01-10T12:00:00Z',
          },
        ],
        exportedAt: '2025-01-10T12:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [
          {
            ...baseWebpage,
            id: 'w1',
            title: 'Updated Title',
            updatedAt: '2025-01-10T10:00:00Z', // Older than deletion
          },
        ],
        exportedAt: '2025-01-10T10:00:00Z',
      };

      const result = mergeLWW(local, remote);

      // Deletion wins, should be filtered out
      expect(result.webpages).toHaveLength(0);
    });

    it('should un-delete if remote update is newer than deletedAt', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [
          {
            ...baseWebpage,
            id: 'w1',
            deleted: true,
            deletedAt: '2025-01-10T10:00:00Z',
            updatedAt: '2025-01-10T10:00:00Z',
          },
        ],
        exportedAt: '2025-01-10T10:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [
          {
            ...baseWebpage,
            id: 'w1',
            title: 'Updated After Delete',
            updatedAt: '2025-01-10T12:00:00Z', // Newer than deletion
          },
        ],
        exportedAt: '2025-01-10T12:00:00Z',
      };

      const result = mergeLWW(local, remote);

      // Remote update wins, item should be un-deleted
      expect(result.webpages).toHaveLength(1);
      expect(result.webpages[0].id).toBe('w1');
      expect(result.webpages[0].title).toBe('Updated After Delete');
      expect(result.webpages[0].deleted).toBeUndefined();
    });

    it('should keep deletion if remote deletedAt is newer than local updatedAt', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [
          {
            ...baseWebpage,
            id: 'w1',
            title: 'Local Update',
            updatedAt: '2025-01-10T10:00:00Z',
          },
        ],
        exportedAt: '2025-01-10T10:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [
          {
            ...baseWebpage,
            id: 'w1',
            deleted: true,
            deletedAt: '2025-01-10T12:00:00Z',
            updatedAt: '2025-01-10T12:00:00Z',
          },
        ],
        exportedAt: '2025-01-10T12:00:00Z',
      };

      const result = mergeLWW(local, remote);

      // Remote deletion wins
      expect(result.webpages).toHaveLength(0);
    });

    it('should keep local update if updatedAt is newer than remote deletedAt', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [
          {
            ...baseWebpage,
            id: 'w1',
            title: 'Updated After Delete',
            updatedAt: '2025-01-10T12:00:00Z',
          },
        ],
        exportedAt: '2025-01-10T12:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [
          {
            ...baseWebpage,
            id: 'w1',
            deleted: true,
            deletedAt: '2025-01-10T10:00:00Z',
            updatedAt: '2025-01-10T10:00:00Z',
          },
        ],
        exportedAt: '2025-01-10T10:00:00Z',
      };

      const result = mergeLWW(local, remote);

      // Local update wins, un-delete
      expect(result.webpages).toHaveLength(1);
      expect(result.webpages[0].id).toBe('w1');
      expect(result.webpages[0].title).toBe('Updated After Delete');
      expect(result.webpages[0].deleted).toBeUndefined();
    });
  });

  describe('Both sides deleted', () => {
    it('should keep the one with newer deletedAt when both deleted', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [
          {
            ...baseWebpage,
            id: 'w1',
            deleted: true,
            deletedAt: '2025-01-10T10:00:00Z',
            updatedAt: '2025-01-10T10:00:00Z',
          },
        ],
        exportedAt: '2025-01-10T10:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [
          {
            ...baseWebpage,
            id: 'w1',
            deleted: true,
            deletedAt: '2025-01-10T12:00:00Z',
            updatedAt: '2025-01-10T12:00:00Z',
          },
        ],
        exportedAt: '2025-01-10T12:00:00Z',
      };

      const result = mergeLWW(local, remote);

      // Both deleted, should still be filtered out
      expect(result.webpages).toHaveLength(0);
    });
  });

  describe('Multiple items with mixed states', () => {
    it('should handle mix of deleted and non-deleted items correctly', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [
          { ...baseWebpage, id: 'w1', title: 'Page 1', updatedAt: '2025-01-10T10:00:00Z' },
          { ...baseWebpage, id: 'w2', deleted: true, deletedAt: '2025-01-10T11:00:00Z', updatedAt: '2025-01-10T11:00:00Z' },
          { ...baseWebpage, id: 'w3', title: 'Page 3', updatedAt: '2025-01-10T09:00:00Z' },
        ],
        exportedAt: '2025-01-10T11:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [
          { ...baseWebpage, id: 'w1', title: 'Page 1 Updated', updatedAt: '2025-01-10T12:00:00Z' },
          { ...baseWebpage, id: 'w2', title: 'Page 2', updatedAt: '2025-01-10T10:00:00Z' },
          { ...baseWebpage, id: 'w4', title: 'Page 4', updatedAt: '2025-01-10T10:00:00Z' },
        ],
        exportedAt: '2025-01-10T12:00:00Z',
      };

      const result = mergeLWW(local, remote);

      // w1: remote newer (keep remote)
      // w2: local deleted newer (delete)
      // w3: local only (keep)
      // w4: remote only (keep)
      expect(result.webpages).toHaveLength(3);

      const ids = result.webpages.map((w) => w.id).sort();
      expect(ids).toEqual(['w1', 'w3', 'w4']);

      const w1 = result.webpages.find((w) => w.id === 'w1');
      expect(w1?.title).toBe('Page 1 Updated');
    });

    it('should handle deletion on one side and new item on other side', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [
          { ...baseWebpage, id: 'w1', deleted: true, deletedAt: '2025-01-10T12:00:00Z', updatedAt: '2025-01-10T12:00:00Z' },
        ],
        exportedAt: '2025-01-10T12:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [
          { ...baseWebpage, id: 'w2', title: 'New Page', updatedAt: '2025-01-10T11:00:00Z' },
        ],
        exportedAt: '2025-01-10T11:00:00Z',
      };

      const result = mergeLWW(local, remote);

      // w1 deleted, w2 is new
      expect(result.webpages).toHaveLength(1);
      expect(result.webpages[0].id).toBe('w2');
    });
  });

  describe('Edge cases', () => {
    it('should handle missing deletedAt field gracefully', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [
          {
            ...baseWebpage,
            id: 'w1',
            deleted: true,
            // deletedAt missing
            updatedAt: '2025-01-10T10:00:00Z',
          } as any,
        ],
        exportedAt: '2025-01-10T10:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [
          { ...baseWebpage, id: 'w1', updatedAt: '2025-01-10T12:00:00Z' },
        ],
        exportedAt: '2025-01-10T12:00:00Z',
      };

      const result = mergeLWW(local, remote);

      // Remote update should win (deletedAt is 0 when missing)
      expect(result.webpages).toHaveLength(1);
      expect(result.webpages[0].deleted).toBeUndefined();
    });

    it('should handle unix timestamp deletedAt', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [
          {
            ...baseWebpage,
            id: 'w1',
            deleted: true,
            deletedAt: 1736596800000 as any, // unix timestamp for 2025-01-11T12:00:00Z (newer)
            updatedAt: '2025-01-11T12:00:00Z',
          },
        ],
        exportedAt: '2025-01-11T12:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [
          { ...baseWebpage, id: 'w1', updatedAt: '2025-01-10T10:00:00Z' },
        ],
        exportedAt: '2025-01-10T10:00:00Z',
      };

      const result = mergeLWW(local, remote);

      // Deletion should win (unix timestamp is newer)
      expect(result.webpages).toHaveLength(0);
    });

    it('should handle empty webpages arrays', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [],
        exportedAt: '2025-01-10T12:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [],
        exportedAt: '2025-01-10T11:00:00Z',
      };

      const result = mergeLWW(local, remote);

      expect(result.webpages).toHaveLength(0);
    });
  });

  describe('Stats calculation', () => {
    it('should calculate correct stats with deleted items', () => {
      const local: ExportPayload = {
        ...basePayload,
        webpages: [
          { ...baseWebpage, id: 'w1', updatedAt: '2025-01-10T10:00:00Z' },
          { ...baseWebpage, id: 'w2', deleted: true, deletedAt: '2025-01-10T11:00:00Z', updatedAt: '2025-01-10T11:00:00Z' },
        ],
        exportedAt: '2025-01-10T11:00:00Z',
      };

      const remote: ExportPayload = {
        ...basePayload,
        webpages: [
          { ...baseWebpage, id: 'w3', updatedAt: '2025-01-10T10:00:00Z' },
        ],
        exportedAt: '2025-01-10T10:00:00Z',
      };

      const result = mergeLWW(local, remote);

      expect(result.stats.webpagesLocal).toBe(2);
      expect(result.stats.webpagesRemote).toBe(1);
      expect(result.stats.webpagesMerged).toBe(2); // w1, w3 (w2 is deleted)
    });
  });
});
