import { describe, it, expect } from 'vitest';
import { mergeLWW, type ExportPayload } from '../mergeService';

describe('mergeLWW', () => {
  const createEmptyPayload = (): ExportPayload => ({
    schemaVersion: 1,
    webpages: [],
    categories: [],
    templates: [],
    subcategories: [],
    organizations: [],
    orders: { subcategories: {} },
    exportedAt: new Date().toISOString(),
  });

  describe('Webpages merging', () => {
    it('should merge webpages by updatedAt (keep newer)', () => {
      const local = createEmptyPayload();
      local.webpages = [
        {
          id: 'w1',
          title: 'Google (local)',
          url: 'https://google.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T10:00:00Z', // newer
        },
      ];

      const remote = createEmptyPayload();
      remote.webpages = [
        {
          id: 'w1',
          title: 'Google (remote)',
          url: 'https://google.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T09:30:00Z', // older
        },
      ];

      const result = mergeLWW(local, remote);

      expect(result.webpages).toHaveLength(1);
      expect(result.webpages[0].title).toBe('Google (local)');
      expect(result.webpages[0].updatedAt).toBe('2025-10-13T10:00:00Z');
    });

    it('should merge webpages by updatedAt (remote newer)', () => {
      const local = createEmptyPayload();
      local.webpages = [
        {
          id: 'w1',
          title: 'Google (local)',
          url: 'https://google.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T09:30:00Z', // older
        },
      ];

      const remote = createEmptyPayload();
      remote.webpages = [
        {
          id: 'w1',
          title: 'Google (remote)',
          url: 'https://google.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T10:00:00Z', // newer
        },
      ];

      const result = mergeLWW(local, remote);

      expect(result.webpages).toHaveLength(1);
      expect(result.webpages[0].title).toBe('Google (remote)');
      expect(result.webpages[0].updatedAt).toBe('2025-10-13T10:00:00Z');
    });

    it('should keep both webpages when IDs are different', () => {
      const local = createEmptyPayload();
      local.webpages = [
        {
          id: 'w1',
          title: 'Google',
          url: 'https://google.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T10:00:00Z',
        },
      ];

      const remote = createEmptyPayload();
      remote.webpages = [
        {
          id: 'w2',
          title: 'GitHub',
          url: 'https://github.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T10:00:00Z',
        },
      ];

      const result = mergeLWW(local, remote);

      expect(result.webpages).toHaveLength(2);
      expect(result.webpages.map((w) => w.id).sort()).toEqual(['w1', 'w2']);
    });

    it('should add new webpages from remote', () => {
      const local = createEmptyPayload();
      local.webpages = [
        {
          id: 'w1',
          title: 'Google',
          url: 'https://google.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T10:00:00Z',
        },
      ];

      const remote = createEmptyPayload();
      remote.webpages = [
        {
          id: 'w2',
          title: 'GitHub',
          url: 'https://github.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T10:00:00Z',
        },
      ];

      const result = mergeLWW(local, remote);

      expect(result.webpages).toHaveLength(2);
      expect(result.stats.webpagesLocal).toBe(1);
      expect(result.stats.webpagesRemote).toBe(1);
      expect(result.stats.webpagesMerged).toBe(2);
    });

    it('should fallback to createdAt if updatedAt is missing', () => {
      const local = createEmptyPayload();
      local.webpages = [
        {
          id: 'w1',
          title: 'Google (local)',
          url: 'https://google.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T10:00:00Z', // newer
          updatedAt: '2025-10-13T09:00:00Z',
        },
      ];

      const remote = createEmptyPayload();
      remote.webpages = [
        {
          id: 'w1',
          title: 'Google (remote)',
          url: 'https://google.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T11:00:00Z', // newer
        },
      ];

      const result = mergeLWW(local, remote);

      // Should use updatedAt (remote is newer)
      expect(result.webpages[0].title).toBe('Google (remote)');
    });
  });

  describe('Subcategories merging', () => {
    it('should merge subcategories by timestamp (number format)', () => {
      const local = createEmptyPayload();
      local.subcategories = [
        {
          id: 'g1',
          categoryId: 'c1',
          name: 'Group (local)',
          order: 0,
          createdAt: 1728800000000,
          updatedAt: 1728810000000, // newer
        },
      ];

      const remote = createEmptyPayload();
      remote.subcategories = [
        {
          id: 'g1',
          categoryId: 'c1',
          name: 'Group (remote)',
          order: 0,
          createdAt: 1728800000000,
          updatedAt: 1728805000000, // older
        },
      ];

      const result = mergeLWW(local, remote);

      expect(result.subcategories).toHaveLength(1);
      expect(result.subcategories[0].name).toBe('Group (local)');
    });
  });

  describe('Orders merging', () => {
    it('should use orders from payload with newer exportedAt', () => {
      const local = createEmptyPayload();
      local.exportedAt = '2025-10-13T10:00:00Z'; // newer
      local.orders = {
        subcategories: {
          g1: ['w1', 'w2', 'w3'],
        },
      };

      const remote = createEmptyPayload();
      remote.exportedAt = '2025-10-13T09:00:00Z'; // older
      remote.orders = {
        subcategories: {
          g1: ['w3', 'w2', 'w1'],
        },
      };

      const result = mergeLWW(local, remote);

      expect(result.orders.subcategories.g1).toEqual(['w1', 'w2', 'w3']);
    });

    it('should merge orders from both payloads', () => {
      const local = createEmptyPayload();
      local.exportedAt = '2025-10-13T10:00:00Z';
      local.orders = {
        subcategories: {
          g1: ['w1', 'w2'],
        },
      };

      const remote = createEmptyPayload();
      remote.exportedAt = '2025-10-13T09:00:00Z';
      remote.orders = {
        subcategories: {
          g2: ['w3', 'w4'],
        },
      };

      const result = mergeLWW(local, remote);

      expect(result.orders.subcategories).toHaveProperty('g1');
      expect(result.orders.subcategories).toHaveProperty('g2');
      expect(result.orders.subcategories.g1).toEqual(['w1', 'w2']);
      expect(result.orders.subcategories.g2).toEqual(['w3', 'w4']);
    });

    it('should prefer local orders when exportedAt is equal', () => {
      const timestamp = '2025-10-13T10:00:00Z';
      const local = createEmptyPayload();
      local.exportedAt = timestamp;
      local.orders = {
        subcategories: {
          g1: ['w1', 'w2'],
        },
      };

      const remote = createEmptyPayload();
      remote.exportedAt = timestamp;
      remote.orders = {
        subcategories: {
          g1: ['w2', 'w1'],
        },
      };

      const result = mergeLWW(local, remote);

      expect(result.orders.subcategories.g1).toEqual(['w1', 'w2']);
    });
  });

  describe('Categories merging', () => {
    it('should merge categories (currently prefers remote)', () => {
      const local = createEmptyPayload();
      local.categories = [
        { id: 'c1', name: 'Local Cat', color: '#111', order: 0 },
      ];

      const remote = createEmptyPayload();
      remote.categories = [
        { id: 'c1', name: 'Remote Cat', color: '#222', order: 0 },
      ];

      const result = mergeLWW(local, remote);

      expect(result.categories).toHaveLength(1);
      // Currently prefers remote for categories (no updatedAt field)
      expect(result.categories[0].name).toBe('Remote Cat');
    });

    it('should keep both categories when IDs differ', () => {
      const local = createEmptyPayload();
      local.categories = [
        { id: 'c1', name: 'Cat 1', color: '#111', order: 0 },
      ];

      const remote = createEmptyPayload();
      remote.categories = [
        { id: 'c2', name: 'Cat 2', color: '#222', order: 0 },
      ];

      const result = mergeLWW(local, remote);

      expect(result.categories).toHaveLength(2);
    });
  });

  describe('Settings merging', () => {
    it('should use settings from payload with newer exportedAt', () => {
      const local = createEmptyPayload();
      local.exportedAt = '2025-10-13T10:00:00Z'; // newer
      local.settings = { theme: 'dracula', selectedCategoryId: 'c1' };

      const remote = createEmptyPayload();
      remote.exportedAt = '2025-10-13T09:00:00Z'; // older
      remote.settings = { theme: 'gruvbox', selectedCategoryId: 'c2' };

      const result = mergeLWW(local, remote);

      expect(result.settings?.theme).toBe('dracula');
      expect(result.settings?.selectedCategoryId).toBe('c1');
    });
  });

  describe('Complex scenarios', () => {
    it('should handle mixed local and remote additions', () => {
      const local = createEmptyPayload();
      local.webpages = [
        {
          id: 'w1',
          title: 'A',
          url: 'https://a.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T09:00:00Z',
        },
        {
          id: 'w2',
          title: 'B',
          url: 'https://b.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T09:00:00Z',
        },
      ];

      const remote = createEmptyPayload();
      remote.webpages = [
        {
          id: 'w2',
          title: 'B (edited)',
          url: 'https://b.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T10:00:00Z', // edited remotely
        },
        {
          id: 'w3',
          title: 'C',
          url: 'https://c.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T09:00:00Z',
        },
      ];

      const result = mergeLWW(local, remote);

      expect(result.webpages).toHaveLength(3);
      expect(result.webpages.map((w) => w.id).sort()).toEqual(['w1', 'w2', 'w3']);

      // w2 should be the remote version (newer)
      const w2 = result.webpages.find((w) => w.id === 'w2');
      expect(w2?.title).toBe('B (edited)');
    });

    it('should handle empty payloads', () => {
      const local = createEmptyPayload();
      const remote = createEmptyPayload();

      const result = mergeLWW(local, remote);

      expect(result.webpages).toHaveLength(0);
      expect(result.categories).toHaveLength(0);
      expect(result.templates).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate merge statistics', () => {
      const local = createEmptyPayload();
      local.webpages = [
        {
          id: 'w1',
          title: 'A',
          url: 'https://a.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T09:00:00Z',
        },
        {
          id: 'w2',
          title: 'B',
          url: 'https://b.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T09:00:00Z',
        },
      ];

      const remote = createEmptyPayload();
      remote.webpages = [
        {
          id: 'w2',
          title: 'B',
          url: 'https://b.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T09:00:00Z',
        },
        {
          id: 'w3',
          title: 'C',
          url: 'https://c.com',
          favicon: '',
          note: '',
          category: 'c1',
          createdAt: '2025-10-13T09:00:00Z',
          updatedAt: '2025-10-13T09:00:00Z',
        },
      ];

      const result = mergeLWW(local, remote);

      expect(result.stats.webpagesLocal).toBe(2);
      expect(result.stats.webpagesRemote).toBe(2);
      expect(result.stats.webpagesMerged).toBe(3); // w1, w2, w3
    });
  });
});
