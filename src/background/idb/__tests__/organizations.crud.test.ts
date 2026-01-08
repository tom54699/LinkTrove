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

    const resultA = await (s as any).createOrganization?.('Org A', '#123456', { createDefaultCollection: false });
    const resultB = await (s as any).createOrganization?.('Org B', undefined, { createDefaultCollection: false });
    const a = resultA.organization;
    const b = resultB.organization;
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

    const resultOrgB = await (s as any).createOrganization?.('Org B', undefined, { createDefaultCollection: false });
    const orgB = resultOrgB.organization;
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

  it('should auto-create default Collection when creating Organization', async () => {
    const { createStorageService } = await import('../../storageService');
    const s = createStorageService();
    await waitForOrgMigration();

    const result = await (s as any).createOrganization?.('Test Org', '#ff0000');

    // Verify organization was created
    expect(result.organization).toBeDefined();
    expect(result.organization.name).toBe('Test Org');
    expect(result.organization.color).toBe('#ff0000');

    // Verify default Collection was auto-created
    expect(result.defaultCollection).toBeDefined();
    expect(result.defaultCollection).not.toBeNull();
    expect(result.defaultCollection.name).toBe('General');
    expect(result.defaultCollection.organizationId).toBe(result.organization.id);
    expect(result.defaultCollection.order).toBe(0);
    expect(result.defaultCollection.color).toBe('#ff0000');

    // Verify Collection exists in database
    const allCategories = (await getAll('categories')) as any[];
    const createdCategory = allCategories.find((c) => c.id === result.defaultCollection.id);
    expect(createdCategory).toBeDefined();
    expect(createdCategory.name).toBe('General');
  });

  it('should skip default Collection when createDefaultCollection is false', async () => {
    const { createStorageService } = await import('../../storageService');
    const s = createStorageService();
    await waitForOrgMigration();

    const categoriesBeforeCount = ((await getAll('categories')) as any[]).length;

    const result = await (s as any).createOrganization?.(
      'Test Org No Collection',
      '#00ff00',
      { createDefaultCollection: false }
    );

    // Verify organization was created
    expect(result.organization).toBeDefined();
    expect(result.organization.name).toBe('Test Org No Collection');

    // Verify NO default Collection was created
    expect(result.defaultCollection).toBeNull();

    // Verify no new categories in database
    const categoriesAfter = (await getAll('categories')) as any[];
    expect(categoriesAfter.length).toBe(categoriesBeforeCount);
  });
});
