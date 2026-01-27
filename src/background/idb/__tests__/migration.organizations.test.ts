import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { putAll, getAll, getMeta } from '../db';
import { DEFAULT_ORGANIZATION_NAME } from '../../../utils/defaults';

async function resetDb() {
  try {
    await new Promise((res, rej) => {
      const req = indexedDB.deleteDatabase('linktrove');
      req.onsuccess = () => res(null);
      req.onerror = () => rej(req.error);
    });
  } catch {}
}

describe('IDB migration for organizations (v3)', () => {
  beforeAll(async () => {
    await resetDb();
  });

  it('creates default organization and assigns categories.organizationId', async () => {
    const cats = [
      { id: 'c1', name: 'Alpha', color: '#888', order: 2 },
      { id: 'c2', name: 'Beta', color: '#777', order: 0 },
      { id: 'c3', name: 'Gamma', color: '#666', order: 1 },
    ] as any[];
    // Seed categories without organizationId
    await putAll('categories', cats as any);

    // Trigger storage initialization (runs migrations)
    const { createStorageService } = await import('../../storageService');
    createStorageService();
    // Wait for migration to complete
    const start = Date.now();
    while (Date.now() - start < 5000) {
      try {
        const mark = await getMeta<boolean>('migratedOrganizationsV1');
        if (mark) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 25));
    }

    const orgs = (await getAll('organizations' as any)) as any[];
    expect(orgs.length).toBeGreaterThanOrEqual(1);
    const def = orgs.find((o) => o.isDefault);
    expect(def).toBeTruthy();
    expect(def.name).toBe(DEFAULT_ORGANIZATION_NAME);

    const after = (await getAll('categories')) as any[];
    // Each category should be assigned to default org
    for (const c of after) expect(c.organizationId).toBe(def.id);
    // And order should be contiguous per org (0..n-1) in original order
    const ordered = after.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    expect(ordered.map((c) => c.id)).toEqual(['c2', 'c3', 'c1']);
    expect(ordered.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it('exposes categories indexes and organizations store', async () => {
    const { openDb } = await import('../db');
    const db = await openDb();
    // categories composite indexes for organization scope
    const t1 = db.transaction('categories', 'readonly');
    const s1 = t1.objectStore('categories');
    expect(() => s1.index('by_organizationId')).not.toThrow();
    expect(() => s1.index('by_organizationId_order')).not.toThrow();
    // organizations store with order index
    const t2 = db.transaction('organizations' as any, 'readonly');
    const s2 = t2.objectStore('organizations' as any);
    expect(() => s2.index('order')).not.toThrow();
  });
});
