import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { putAll, getAll } from '../idb/db';
import { DEFAULT_ORGANIZATION_NAME } from '../../utils/defaults';

async function resetDb() {
  try {
    await new Promise((res, rej) => {
      const req = indexedDB.deleteDatabase('linktrove');
      req.onsuccess = () => res(null);
      req.onerror = () => rej(req.error);
    });
  } catch {}
}

function nowIso() { return new Date().toISOString(); }

describe('Export/Import with organizations', () => {
  beforeEach(async () => { await resetDb(); });

  it('includes organizations and preserves category.organizationId on roundtrip', async () => {
    const { createStorageService } = await import('../storageService');
    // seed organizations, categories, subcategories, webpages
    await putAll('organizations' as any, [
      { id: 'o_a', name: 'Org A', order: 0 },
      { id: 'o_b', name: 'Org B', order: 1 },
    ] as any);
    await putAll('categories', [
      { id: 'c1', name: 'A', color: '#aaa', order: 0, organizationId: 'o_a' },
      { id: 'c2', name: 'B', color: '#bbb', order: 0, organizationId: 'o_b' },
    ] as any);
    const s = createStorageService();
    const g1 = await (s as any).createSubcategory('c1', 'G1');
    const g2 = await (s as any).createSubcategory('c2', 'G2');
    await s.saveToLocal([
      { id: 'w1', title: 'A', url: 'https://a', favicon: '', note: '', category: 'c1', subcategoryId: g1.id, createdAt: nowIso(), updatedAt: nowIso() },
      { id: 'w2', title: 'B', url: 'https://b', favicon: '', note: '', category: 'c2', subcategoryId: g2.id, createdAt: nowIso(), updatedAt: nowIso() },
    ] as any);

    const json = await s.exportData();
    const data = JSON.parse(json);
    expect(Array.isArray(data.organizations)).toBe(true);
    expect(data.categories.every((c: any) => !!c.organizationId)).toBe(true);

    await resetDb();
    const s2 = createStorageService();
    await s2.importData(json);
    const orgs2 = (await getAll('organizations' as any)) as any[];
    const cats2 = (await getAll('categories')) as any[];
    expect(orgs2.length).toBe(2);
    const byOrg = new Map(orgs2.map((o) => [o.id, o]));
    expect(cats2.every((c) => byOrg.has((c as any).organizationId))).toBe(true);
  });

  it('imports legacy JSON without organizations by creating default org and assigning categories', async () => {
    const legacy = JSON.stringify({
      webpages: [],
      categories: [ { id: 'c1', name: 'Legacy', color: '#aaa', order: 0 } ],
      templates: [],
      subcategories: [],
    });
    const { createStorageService } = await import('../storageService');
    const s = createStorageService();
    await s.importData(legacy);
    const orgs = (await getAll('organizations' as any)) as any[];
    const cats = (await getAll('categories')) as any[];
    expect(orgs.length).toBeGreaterThanOrEqual(1);
    const def = orgs.find((o) => o.isDefault);
    expect(def).toBeTruthy();
    expect(def.name).toBe(DEFAULT_ORGANIZATION_NAME);
    expect((cats[0] as any).organizationId).toBe(def.id);
  });
});
