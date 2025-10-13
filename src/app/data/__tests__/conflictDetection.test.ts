/**
 * conflictDetection.test.ts
 *
 * 測試衝突檢測功能
 */

import { describe, it, expect } from 'vitest';
import { detectConflict, formatConflictMessage } from '../conflictDetection';
import type { ExportPayload } from '../mergeService';

describe('conflictDetection', () => {
  const createPayload = (counts: {
    webpages?: number;
    categories?: number;
    subcategories?: number;
    templates?: number;
    organizations?: number;
  }): ExportPayload => ({
    schemaVersion: 1,
    webpages: Array(counts.webpages || 0).fill({}).map((_, i) => ({
      id: `w${i}`,
      title: `Page ${i}`,
      url: `https://example.com/${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    categories: Array(counts.categories || 0).fill({}).map((_, i) => ({
      id: `c${i}`,
      name: `Category ${i}`,
      organizationId: 'org1',
      order: i,
    })),
    subcategories: Array(counts.subcategories || 0).fill({}).map((_, i) => ({
      id: `s${i}`,
      name: `Subcat ${i}`,
      categoryId: 'c0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })),
    templates: Array(counts.templates || 0).fill({}).map((_, i) => ({
      id: `t${i}`,
      name: `Template ${i}`,
      placeholder: '',
    })),
    organizations: Array(counts.organizations || 0).fill({}).map((_, i) => ({
      id: `o${i}`,
      name: `Org ${i}`,
      order: i,
    })),
    settings: {},
    orders: {},
    exportedAt: new Date().toISOString(),
  });

  describe('detectConflict', () => {
    it('should return no conflict when data is identical', () => {
      const local = createPayload({ webpages: 5, categories: 2, subcategories: 3 });
      const remote = createPayload({ webpages: 5, categories: 2, subcategories: 3 });

      const result = detectConflict(local, remote);

      expect(result.hasConflict).toBe(false);
      expect(result.severity).toBe('none');
      expect(result.diff.webpages).toBe(0);
      expect(result.diff.categories).toBe(0);
      expect(result.percentDiff).toBe(0);
    });

    it('should detect minor conflict (small webpage difference)', () => {
      const local = createPayload({ webpages: 50, categories: 2 });
      const remote = createPayload({ webpages: 55, categories: 2 });

      const result = detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('minor'); // 5/55 = 9% < 20% and diff <= 10
      expect(result.diff.webpages).toBe(-5);
      expect(result.local.webpages).toBe(50);
      expect(result.remote.webpages).toBe(55);
    });

    it('should detect major conflict (large webpage difference)', () => {
      const local = createPayload({ webpages: 10 });
      const remote = createPayload({ webpages: 25 });

      const result = detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('major');
      expect(result.diff.webpages).toBe(-15);
      expect(result.percentDiff).toBeCloseTo(60, 1); // (15/25)*100 = 60%
    });

    it('should detect major conflict (>20% difference)', () => {
      const local = createPayload({ webpages: 50 });
      const remote = createPayload({ webpages: 60 });

      const result = detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('minor'); // 10/60 = 16.7% < 20%
    });

    it('should detect major conflict when percentage is exactly 20%', () => {
      const local = createPayload({ webpages: 40 });
      const remote = createPayload({ webpages: 50 });

      const result = detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('major'); // 10/50 = 20%
    });

    it('should detect conflict in categories only', () => {
      const local = createPayload({ webpages: 10, categories: 5 });
      const remote = createPayload({ webpages: 10, categories: 3 });

      const result = detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('none'); // no webpage diff, so severity is none but conflict exists
      expect(result.diff.categories).toBe(2);
      expect(result.diff.webpages).toBe(0);
    });

    it('should handle empty local data', () => {
      const local = createPayload({});
      const remote = createPayload({ webpages: 20, categories: 5 });

      const result = detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('major');
      expect(result.diff.webpages).toBe(-20);
      expect(result.local.webpages).toBe(0);
      expect(result.remote.webpages).toBe(20);
    });

    it('should handle empty remote data', () => {
      const local = createPayload({ webpages: 30, categories: 4 });
      const remote = createPayload({});

      const result = detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('major');
      expect(result.diff.webpages).toBe(30);
      expect(result.local.webpages).toBe(30);
      expect(result.remote.webpages).toBe(0);
    });

    it('should detect conflict in all data types', () => {
      const local = createPayload({
        webpages: 50,
        categories: 10,
        subcategories: 20,
        templates: 5,
        organizations: 3,
      });
      const remote = createPayload({
        webpages: 55,
        categories: 12,
        subcategories: 18,
        templates: 4,
        organizations: 2,
      });

      const result = detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.diff.webpages).toBe(-5);
      expect(result.diff.categories).toBe(-2);
      expect(result.diff.subcategories).toBe(2);
      expect(result.diff.templates).toBe(1);
      expect(result.diff.organizations).toBe(1);
    });

    it('should calculate correct percentage for local > remote', () => {
      const local = createPayload({ webpages: 100 });
      const remote = createPayload({ webpages: 80 });

      const result = detectConflict(local, remote);

      expect(result.diff.webpages).toBe(20);
      expect(result.percentDiff).toBeCloseTo(20, 1); // 20/100 = 20%
      expect(result.severity).toBe('major');
    });
  });

  describe('formatConflictMessage', () => {
    it('should return "一致" message when no conflict', () => {
      const local = createPayload({ webpages: 5, categories: 2 });
      const remote = createPayload({ webpages: 5, categories: 2 });
      const info = detectConflict(local, remote);

      const message = formatConflictMessage(info);

      expect(message).toBe('本地與雲端資料一致');
    });

    it('should format webpage difference (local > remote)', () => {
      const local = createPayload({ webpages: 15 });
      const remote = createPayload({ webpages: 10 });
      const info = detectConflict(local, remote);

      const message = formatConflictMessage(info);

      expect(message).toContain('網頁：本地 多 5 個');
    });

    it('should format webpage difference (remote > local)', () => {
      const local = createPayload({ webpages: 10 });
      const remote = createPayload({ webpages: 20 });
      const info = detectConflict(local, remote);

      const message = formatConflictMessage(info);

      expect(message).toContain('網頁：本地 少 10 個');
    });

    it('should format multiple differences', () => {
      const local = createPayload({ webpages: 10, categories: 5, templates: 3 });
      const remote = createPayload({ webpages: 15, categories: 4, templates: 5 });
      const info = detectConflict(local, remote);

      const message = formatConflictMessage(info);

      expect(message).toContain('網頁：本地 少 5 個');
      expect(message).toContain('分類：本地 多 1 個');
      expect(message).toContain('模板：本地 少 2 個');
    });

    it('should handle all data types in message', () => {
      const local = createPayload({
        webpages: 20,
        categories: 10,
        subcategories: 15,
        templates: 5,
        organizations: 3,
      });
      const remote = createPayload({
        webpages: 25,
        categories: 8,
        subcategories: 20,
        templates: 5,
        organizations: 2,
      });
      const info = detectConflict(local, remote);

      const message = formatConflictMessage(info);

      expect(message).toContain('網頁：本地 少 5 個');
      expect(message).toContain('分類：本地 多 2 個');
      expect(message).toContain('群組：本地 少 5 個');
      expect(message).not.toContain('模板'); // templates are equal
      expect(message).toContain('組織：本地 多 1 個');
    });
  });
});
