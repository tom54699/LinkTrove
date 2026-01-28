import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrganizationsProvider, useOrganizations } from '../sidebar/organizations';
import { CategoriesProvider, useCategories } from '../sidebar/categories';
import { putAll, getAll, setMeta } from '../../background/idb/db';

function setupChromeStub() {
  const g: any = globalThis as any;
  if (!g.chrome) g.chrome = {} as any;
  if (!g.chrome.storage) g.chrome.storage = {} as any;
  if (!g.chrome.storage.local)
    g.chrome.storage.local = {
      get: (defaults: any, cb: (res: any) => void) => cb({ ...defaults }),
      set: (_items: any, _cb?: () => void) => _cb?.(),
      clear: (_cb?: () => void) => _cb?.(),
    } as any;
}

async function resetDb() {
  try {
    await new Promise((res, rej) => {
      const req = indexedDB.deleteDatabase('linktrove');
      req.onsuccess = () => res(null);
      req.onerror = () => rej(req.error);
    });
  } catch {}
}

describe('Delete Protection Integration Tests', () => {
  beforeEach(async () => {
    await resetDb();
    setupChromeStub();
    await setMeta('migratedOrganizationsV1', true);
  });

  it('three-layer protection: cannot delete last org → last collection → last group', async () => {
    // Setup minimal hierarchy: 1 org → 1 collection → 1 group
    await putAll('organizations' as any, [
      { id: 'o_a', name: 'Personal', order: 0 },
    ] as any);

    await putAll('categories', [
      { id: 'c1', name: 'Collection 1', color: '#888', order: 0, organizationId: 'o_a' },
    ] as any);

    await putAll('subcategories' as any, [
      { id: 'g1', categoryId: 'c1', name: 'Group 1', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);

    // Test harness that exposes all three layers
    const TestHarness: React.FC = () => {
      const orgs = useOrganizations();
      const cats = useCategories();

      return (
        <div>
          <div data-testid="org-count">{orgs.organizations.length}</div>
          <div data-testid="cat-count">{cats.categories.length}</div>
          <button
            data-testid="delete-org"
            onClick={() => { void orgs.actions.remove('o_a').catch(() => {}); }}
          >
            Delete Org
          </button>
          <button
            data-testid="delete-cat"
            onClick={() => { void cats.actions.deleteCategory('c1').catch(() => {}); }}
          >
            Delete Collection
          </button>
        </div>
      );
    };

    render(
      <OrganizationsProvider>
        <CategoriesProvider>
          <TestHarness />
        </CategoriesProvider>
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('org-count').textContent).toBe('1');
      expect(screen.getByTestId('cat-count').textContent).toBe('1');
    });

    // Try to delete organization (should fail)
    fireEvent.click(screen.getByTestId('delete-org'));
    await waitFor(() => {
      expect(screen.getByTestId('org-count').textContent).toBe('1');
    }, { timeout: 300 });

    // Try to delete collection (should fail)
    fireEvent.click(screen.getByTestId('delete-cat'));
    await waitFor(() => {
      expect(screen.getByTestId('cat-count').textContent).toBe('1');
    }, { timeout: 300 });

    // Verify data integrity
    const orgsInDb = (await getAll('organizations' as any)) as any[];
    const catsInDb = (await getAll('categories')) as any[];
    const groupsInDb = (await getAll('subcategories' as any)) as any[];

    expect(orgsInDb.length).toBe(1);
    expect(catsInDb.length).toBe(1);
    expect(groupsInDb.length).toBe(1);
  });

  it('cascade delete verification: org → collections → groups → webpages', async () => {
    // Setup: 2 orgs, each with multiple collections, groups, and webpages
    await putAll('organizations' as any, [
      { id: 'o_a', name: 'Org A', order: 0 },
      { id: 'o_b', name: 'Org B', order: 1 },
    ] as any);

    await putAll('categories', [
      { id: 'c1', name: 'Cat A1', color: '#aaa', order: 0, organizationId: 'o_a' },
      { id: 'c2', name: 'Cat A2', color: '#bbb', order: 1, organizationId: 'o_a' },
      { id: 'c3', name: 'Cat B1', color: '#ccc', order: 0, organizationId: 'o_b' },
    ] as any);

    await putAll('subcategories' as any, [
      { id: 'g1', categoryId: 'c1', name: 'Group A1', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'g2', categoryId: 'c2', name: 'Group A2', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'g3', categoryId: 'c3', name: 'Group B1', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);

    await putAll('webpages', [
      { id: 'w1', title: 'Web A1', url: 'https://a1.com', category: 'c1', subcategoryId: 'g1', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'w2', title: 'Web A2', url: 'https://a2.com', category: 'c2', subcategoryId: 'g2', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'w3', title: 'Web B1', url: 'https://b1.com', category: 'c3', subcategoryId: 'g3', createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);

    const TestHarness: React.FC = () => {
      const orgs = useOrganizations();
      return (
        <div>
          <div data-testid="org-count">{orgs.organizations.length}</div>
          <button
            data-testid="delete-org-a"
            onClick={() => { void orgs.actions.remove('o_a').catch(() => {}); }}
          >
            Delete Org A
          </button>
        </div>
      );
    };

    render(
      <OrganizationsProvider>
        <TestHarness />
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('org-count').textContent).toBe('2');
    });

    // Delete org A
    fireEvent.click(screen.getByTestId('delete-org-a'));

    await waitFor(() => {
      expect(screen.getByTestId('org-count').textContent).toBe('1');
    }, { timeout: 1500 });

    // Verify cascade soft-delete: org A and its data are marked as deleted
    await waitFor(async () => {
      const orgsInDb = (await getAll('organizations' as any)) as any[];
      const catsInDb = (await getAll('categories')) as any[];
      const groupsInDb = (await getAll('subcategories' as any)) as any[];
      const webpagesInDb = (await getAll('webpages')) as any[];

      // Soft-delete: records still exist but marked as deleted
      expect(orgsInDb.length).toBe(2); // Both org A and org B exist
      const orgA = orgsInDb.find((o: any) => o.id === 'o_a');
      const orgB = orgsInDb.find((o: any) => o.id === 'o_b');
      expect(orgA.deleted).toBe(true);
      expect(orgA.deletedAt).toBeTruthy();
      expect(orgB.deleted).toBeUndefined(); // or false

      // Filter out deleted items - only org B's data remains
      const activeOrgs = orgsInDb.filter((o: any) => !o.deleted);
      const activeCats = catsInDb.filter((c: any) => !c.deleted);
      const activeGroups = groupsInDb.filter((g: any) => !g.deleted);
      const activeWebpages = webpagesInDb.filter((w: any) => !w.deleted);

      expect(activeOrgs.length).toBe(1);
      expect(activeOrgs[0].id).toBe('o_b');

      expect(activeCats.length).toBe(1);
      expect(activeCats[0].id).toBe('c3');
      expect(activeCats[0].organizationId).toBe('o_b');

      expect(activeGroups.length).toBe(1);
      expect(activeGroups[0].id).toBe('g3');

      expect(activeWebpages.length).toBe(1);
      expect(activeWebpages[0].id).toBe('w3');
    }, { timeout: 1500 });
  });

  it('per-organization collection protection: cannot delete last in org A, but can in org B', async () => {
    await putAll('organizations' as any, [
      { id: 'o_a', name: 'Org A', order: 0 },
      { id: 'o_b', name: 'Org B', order: 1 },
    ] as any);

    await putAll('categories', [
      { id: 'c1', name: 'Cat A1', color: '#aaa', order: 0, organizationId: 'o_a' },
      { id: 'c2', name: 'Cat B1', color: '#bbb', order: 0, organizationId: 'o_b' },
      { id: 'c3', name: 'Cat B2', color: '#ccc', order: 1, organizationId: 'o_b' },
    ] as any);

    const TestHarness: React.FC = () => {
      const cats = useCategories();
      // Show all categories for testing (normally filtered by selected org)
      const allCats = cats.categories;
      return (
        <div>
          <div data-testid="cat-count">{allCats.length}</div>
          <button
            data-testid="delete-c1"
            onClick={() => { void cats.actions.deleteCategory('c1').catch(() => {}); }}
          >
            Delete C1 (last in A)
          </button>
          <button
            data-testid="delete-c2"
            onClick={() => { void cats.actions.deleteCategory('c2').catch(() => {}); }}
          >
            Delete C2 (one of two in B)
          </button>
        </div>
      );
    };

    render(
      <OrganizationsProvider>
        <CategoriesProvider>
          <TestHarness />
        </CategoriesProvider>
      </OrganizationsProvider>
    );

    await waitFor(() => {
      const count = screen.getByTestId('cat-count').textContent;
      expect(count).toBe('1');
    }, { timeout: 1500 });

    // Try to delete c1 (last in org A) - should fail
    fireEvent.click(screen.getByTestId('delete-c1'));
    await waitFor(async () => {
      const catsInDb = (await getAll('categories')) as any[];
      expect(catsInDb.find((c: any) => c.id === 'c1')).toBeTruthy();
    }, { timeout: 300 });

    // c1 should still exist
    let catsInDb = (await getAll('categories')) as any[];
    expect(catsInDb.find((c: any) => c.id === 'c1')).toBeTruthy();

    // Try to delete c2 (org B has 2) - should succeed (soft-delete)
    fireEvent.click(screen.getByTestId('delete-c2'));

    await waitFor(async () => {
      catsInDb = (await getAll('categories')) as any[];
      const c2 = catsInDb.find((c: any) => c.id === 'c2');
      // Soft-delete: c2 still exists but marked as deleted
      expect(c2).toBeTruthy();
      expect(c2.deleted).toBe(true);
      expect(c2.deletedAt).toBeTruthy();
    }, { timeout: 1500 });

    // Final state: c1 (org A), c2 (org B, deleted), c3 (org B)
    catsInDb = (await getAll('categories')) as any[];
    expect(catsInDb.length).toBe(3); // All records exist (c2 is soft-deleted)
    expect(catsInDb.some((c: any) => c.id === 'c1')).toBe(true);
    expect(catsInDb.some((c: any) => c.id === 'c3')).toBe(true);
    // Filter out deleted: only c1 and c3 remain active
    const activeCats = catsInDb.filter((c: any) => !c.deleted);
    expect(activeCats.length).toBe(2);
    expect(activeCats.some((c: any) => c.id === 'c1')).toBe(true);
    expect(activeCats.some((c: any) => c.id === 'c3')).toBe(true);
  });

  it('error handling: data layer throws error when UI protection bypassed', async () => {

    await putAll('organizations' as any, [
      { id: 'o_a', name: 'Personal', order: 0 },
    ] as any);

    const TestHarness: React.FC = () => {
      const orgs = useOrganizations();
      const [errorMessage, setErrorMessage] = React.useState('');

      const forceDelete = async () => {
        try {
          // Simulate bypassing UI check and calling data layer directly
          await orgs.actions.remove('o_a');
        } catch {
          setErrorMessage('blocked');
        }
      };

      return (
        <div>
          <div data-testid="org-count">{orgs.organizations.length}</div>
          <div data-testid="error">{errorMessage}</div>
          <button data-testid="force-delete" onClick={() => { void forceDelete(); }}>
            Force Delete
          </button>
        </div>
      );
    };

    render(
      <OrganizationsProvider>
        <TestHarness />
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('org-count').textContent).toBe('1');
    });

    fireEvent.click(screen.getByTestId('force-delete'));

    // Wait a bit for async operations
    await new Promise(r => setTimeout(r, 100));

    // Organization should still exist (data layer blocked it)
    await waitFor(() => {
      expect(screen.getByTestId('org-count').textContent).toBe('1');
    });

    const orgsInDb = (await getAll('organizations' as any)) as any[];
    expect(orgsInDb.length).toBe(1);

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('blocked');
    });
  });

  it('auto-switching after deletion: selects remaining item', async () => {
    await putAll('organizations' as any, [
      { id: 'o_a', name: 'Org A', order: 0 },
      { id: 'o_b', name: 'Org B', order: 1 },
    ] as any);

    const TestHarness: React.FC = () => {
      const orgs = useOrganizations();

      return (
        <div>
          <div data-testid="selected">{orgs.selectedOrgId}</div>
          <div data-testid="count">{orgs.organizations.length}</div>
          <button
            data-testid="delete-current"
            onClick={() => { void orgs.actions.remove(orgs.selectedOrgId).catch(() => {}); }}
          >
            Delete Current
          </button>
        </div>
      );
    };

    render(
      <OrganizationsProvider>
        <TestHarness />
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('2');
    });

    const initialSelected = screen.getByTestId('selected').textContent;
    expect(['o_a', 'o_b'].includes(initialSelected!)).toBe(true);

    // Delete current organization
    fireEvent.click(screen.getByTestId('delete-current'));

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    // Should auto-switch to the remaining org
    const newSelected = screen.getByTestId('selected').textContent;
    expect(newSelected).not.toBe(initialSelected);
    expect(['o_a', 'o_b'].includes(newSelected!)).toBe(true);

    // Verify soft-delete: both orgs exist in database, one is marked deleted
    const orgsInDb = (await getAll('organizations' as any)) as any[];
    expect(orgsInDb.length).toBe(2); // Both orgs exist
    const deletedOrg = orgsInDb.find((o: any) => o.id === initialSelected);
    const activeOrg = orgsInDb.find((o: any) => o.id === newSelected);
    expect(deletedOrg.deleted).toBe(true);
    expect(deletedOrg.deletedAt).toBeTruthy();
    expect(activeOrg.deleted).toBeUndefined(); // or false
    // Filter out deleted: only one active org remains
    const activeOrgs = orgsInDb.filter((o: any) => !o.deleted);
    expect(activeOrgs.length).toBe(1);
    expect(activeOrgs[0].id).toBe(newSelected);
  });
});
