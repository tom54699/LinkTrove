import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { getMeta } from '../db';
import { ENTITY_LIMITS, LimitExceededError } from '../storage';

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

async function getDefaultOrgId(svc: any): Promise<string> {
  const orgs = (await svc.listOrganizations?.()) as any[];
  const def = orgs.find((o: any) => o.isDefault) || orgs[0];
  return def?.id;
}

describe('Entity count limits', () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe('ENTITY_LIMITS constants', () => {
    it('should export correct limit values', () => {
      expect(ENTITY_LIMITS.MAX_ORGANIZATIONS).toBe(8);
      expect(ENTITY_LIMITS.MAX_CATEGORIES_PER_ORG).toBe(20);
      expect(ENTITY_LIMITS.MAX_GROUPS_PER_CATEGORY).toBe(50);
    });
  });

  describe('LimitExceededError', () => {
    it('should have correct name and code', () => {
      const error = new LimitExceededError('Test message');
      expect(error.name).toBe('LimitExceededError');
      expect(error.code).toBe('LIMIT_EXCEEDED');
      expect(error.message).toBe('Test message');
    });
  });

  describe('Organization limit (max 8)', () => {
    it('should allow creating organizations up to the limit', async () => {
      const { createStorageService } = await import('../../storageService');
      const s = createStorageService();
      await waitForOrgMigration();

      // Default org already exists, so we can create 7 more
      for (let i = 1; i <= 7; i++) {
        const result = await (s as any).createOrganization?.(`Org ${i}`, undefined, { createDefaultCollection: false });
        expect(result.organization.name).toBe(`Org ${i}`);
      }

      const list = (await (s as any).listOrganizations?.()) as any[];
      expect(list.length).toBe(8);
    });

    it('should throw LimitExceededError when exceeding organization limit', async () => {
      const { createStorageService } = await import('../../storageService');
      const s = createStorageService();
      await waitForOrgMigration();

      // Create 7 more orgs (default + 7 = 8)
      for (let i = 1; i <= 7; i++) {
        await (s as any).createOrganization?.(`Org ${i}`, undefined, { createDefaultCollection: false });
      }

      // 9th org should fail
      await expect((s as any).createOrganization?.('Org 8', undefined, { createDefaultCollection: false }))
        .rejects.toThrow(LimitExceededError);

      await expect((s as any).createOrganization?.('Org 8', undefined, { createDefaultCollection: false }))
        .rejects.toThrow(/已達上限/);
    });
  });

  describe('Category limit (max 20 per org)', () => {
    it('should allow creating categories up to the limit', async () => {
      const { createStorageService } = await import('../../storageService');
      const s = createStorageService();
      await waitForOrgMigration();
      const defOrgId = await getDefaultOrgId(s);

      for (let i = 1; i <= 20; i++) {
        const cat = await (s as any).addCategory?.(`Cat ${i}`, '#000000', defOrgId);
        expect(cat.name).toBe(`Cat ${i}`);
      }
    });

    it('should throw LimitExceededError when exceeding category limit per org', async () => {
      const { createStorageService } = await import('../../storageService');
      const s = createStorageService();
      await waitForOrgMigration();
      const defOrgId = await getDefaultOrgId(s);

      // Create 20 categories
      for (let i = 1; i <= 20; i++) {
        await (s as any).addCategory?.(`Cat ${i}`, '#000000', defOrgId);
      }

      // 21st category should fail
      await expect((s as any).addCategory?.('Cat 21', '#000000', defOrgId))
        .rejects.toThrow(LimitExceededError);

      await expect((s as any).addCategory?.('Cat 21', '#000000', defOrgId))
        .rejects.toThrow(/已達上限/);
    });

    it('should allow creating categories in different organizations independently', async () => {
      const { createStorageService } = await import('../../storageService');
      const s = createStorageService();
      await waitForOrgMigration();
      const defOrgId = await getDefaultOrgId(s);

      // Create another org
      const result = await (s as any).createOrganization?.('Org B', undefined, { createDefaultCollection: false });
      const orgB = result.organization;

      // Fill up default org
      for (let i = 1; i <= 20; i++) {
        await (s as any).addCategory?.(`DefCat ${i}`, '#000000', defOrgId);
      }

      // Should still be able to create in Org B
      const catB = await (s as any).addCategory?.('Cat in B', '#000000', orgB.id);
      expect(catB.name).toBe('Cat in B');
      expect(catB.organizationId).toBe(orgB.id);
    });
  });

  describe('Group/Subcategory limit (max 50 per category)', () => {
    it('should allow creating groups up to the limit', async () => {
      const { createStorageService } = await import('../../storageService');
      const s = createStorageService();
      await waitForOrgMigration();
      const defOrgId = await getDefaultOrgId(s);

      const cat = await (s as any).addCategory?.('TestCat', '#000000', defOrgId);

      for (let i = 1; i <= 50; i++) {
        const group = await (s as any).createSubcategory?.(cat.id, `Group ${i}`);
        expect(group.name).toBe(`Group ${i}`);
      }
    });

    it('should throw LimitExceededError when exceeding group limit per category', async () => {
      const { createStorageService } = await import('../../storageService');
      const s = createStorageService();
      await waitForOrgMigration();
      const defOrgId = await getDefaultOrgId(s);

      const cat = await (s as any).addCategory?.('TestCat', '#000000', defOrgId);

      // Create 50 groups
      for (let i = 1; i <= 50; i++) {
        await (s as any).createSubcategory?.(cat.id, `Group ${i}`);
      }

      // 51st group should fail
      await expect((s as any).createSubcategory?.(cat.id, 'Group 51'))
        .rejects.toThrow(LimitExceededError);

      await expect((s as any).createSubcategory?.(cat.id, 'Group 51'))
        .rejects.toThrow(/已達上限/);
    });

    it('should allow creating groups in different categories independently', async () => {
      const { createStorageService } = await import('../../storageService');
      const s = createStorageService();
      await waitForOrgMigration();
      const defOrgId = await getDefaultOrgId(s);

      const catA = await (s as any).addCategory?.('Cat A', '#000000', defOrgId);
      const catB = await (s as any).addCategory?.('Cat B', '#000000', defOrgId);

      // Fill up Cat A
      for (let i = 1; i <= 50; i++) {
        await (s as any).createSubcategory?.(catA.id, `Group ${i}`);
      }

      // Should still be able to create in Cat B
      const groupB = await (s as any).createSubcategory?.(catB.id, 'Group in B');
      expect(groupB.name).toBe('Group in B');
      expect(groupB.categoryId).toBe(catB.id);
    });
  });
});
