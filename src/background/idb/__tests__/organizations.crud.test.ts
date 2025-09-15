import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { getAll, getMeta } from '../db';

async function resetDb() {
  try {
    await new Promise((res, rej) => {
      const req = indexedDB.deleteDatabase('linktrove');
      req.onsuccess = () => res(null);
      req.onerror = () => rej(req.error);
    });
  } catch {}
}

async function waitForOrgMigration(timeout = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const mark = await getMeta<boolean>('migratedOrganizationsV1');
      if (mark) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('StorageService organizations API', () => {
  beforeAll(async () => {
    await resetDb();
  });

  it('lists default organization and supports create/rename/reorder', async () => {
    const { createStorageService } = await import('../../storageService');
    const s = createStorageService();
    await waitForOrgMigration();

    const list0 = (await (s as any).listOrganizations?.()) as any[];
    expect(Array.isArray(list0)).toBe(true);
    expect(list0.find((o) => o.id === 'o_default')).toBeTruthy();

    const a = await (s as any).createOrganization?.('Org A', '#123456');
    const b = await (s as any).createOrganization?.('Org B');
    const list1 = (await (s as any).listOrganizations?.()) as any[];
    const names = list1.map((o) => o.name);
    expect(names.includes('Org A')).toBe(true);
    expect(names.includes('Org B')).toBe(true);

    await (s as any).renameOrganization?.(a.id, 'Org A+');
    const list2 = (await (s as any).listOrganizations?.()) as any[];
    expect(list2.find((o) => o.id === a.id)?.name).toBe('Org A+');

    // reorder: put B first
    await (s as any).reorderOrganizations?.([b!.id, a!.id, 'o_default']);
    const list3 = (await (s as any).listOrganizations?.()) as any[];
    expect(list3[0].id).toBe(b!.id);
  });

  it('category helpers: addCategory / reorderCategories / updateCategoryOrganization / deleteOrganization', async () => {
    const { createStorageService } = await import('../../storageService');
    const s = createStorageService();
    await waitForOrgMigration();

    const orgB = await (s as any).createOrganization?.('Org B');
    // Add three categories under default
    const c1 = await (s as any).addCategory?.('C1');
    const c2 = await (s as any).addCategory?.('C2');
    const c3 = await (s as any).addCategory?.('C3');
    expect(c1.organizationId).toBe('o_default');
    // reorder within default
    await (s as any).reorderCategories?.([c3.id, c1.id, c2.id], 'o_default');
    const afterCats = (await getAll('categories')) as any[];
    const defCats = afterCats.filter((c) => c.organizationId === 'o_default').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    expect(defCats.map((c) => c.id)).toEqual([c3.id, c1.id, c2.id]);

    // move one category to Org B
    await (s as any).updateCategoryOrganization?.(c2.id, orgB.id);
    const moved = (await getAll('categories')) as any[];
    const inB = moved.filter((c) => c.organizationId === orgB.id);
    expect(inB.some((c) => c.id === c2.id)).toBe(true);

    // delete Org B and reassign to default
    await (s as any).deleteOrganization?.(orgB.id, { reassignTo: 'o_default' });
    const finalCats = (await getAll('categories')) as any[];
    expect(finalCats.every((c) => c.organizationId === 'o_default')).toBe(true);
  });
});
