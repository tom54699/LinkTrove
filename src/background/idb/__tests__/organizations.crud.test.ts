import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { getAll, getMeta } from '../db';
import { DEFAULT_CATEGORY_NAME, DEFAULT_ORGANIZATION_NAME } from '../../../utils/defaults';

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
  beforeEach(async () => {
    await resetDb();
  });

  it('lists default organization and supports create/rename/reorder', async () => {
    const { createStorageService } = await import('../../storageService');
    const s = createStorageService();
    await waitForOrgMigration();

    const list0 = (await (s as any).listOrganizations?.()) as any[];
    expect(Array.isArray(list0)).toBe(true);
    const defOrg = list0.find((o) => o.isDefault);
    expect(defOrg).toBeTruthy();
    expect(defOrg.name).toBe(DEFAULT_ORGANIZATION_NAME);

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
    await (s as any).reorderOrganizations?.([b!.id, a!.id, defOrg.id]);
    const list3 = (await (s as any).listOrganizations?.()) as any[];
    expect(list3[0].id).toBe(b!.id);
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
    expect(result.defaultCollection.name).toBe(DEFAULT_CATEGORY_NAME);
    expect(result.defaultCollection.organizationId).toBe(result.organization.id);
    expect(result.defaultCollection.order).toBe(0);
    expect(result.defaultCollection.color).toBe('#ff0000');

    // Verify Collection exists in database
    const allCategories = (await getAll('categories')) as any[];
    const createdCategory = allCategories.find((c) => c.id === result.defaultCollection.id);
    expect(createdCategory).toBeDefined();
    expect(createdCategory.name).toBe(DEFAULT_CATEGORY_NAME);
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
