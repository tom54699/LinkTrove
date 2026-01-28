import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrganizationsProvider, useOrganizations } from '../organizations';
import { putAll, getAll, setMeta } from '../../../background/idb/db';

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

const TestHarness: React.FC = () => {
  const { organizations, actions } = useOrganizations();
  return (
    <div>
      <pre data-testid="orgs">{JSON.stringify(organizations.map((o) => o.id))}</pre>
      <div data-testid="count">{organizations.length}</div>
      {organizations.map((org) => (
        <button
          key={org.id}
          data-testid={`delete-${org.id}`}
          onClick={() => { void actions.remove(org.id).catch(() => {}); }}
        >
          Delete {org.name}
        </button>
      ))}
    </div>
  );
};

describe('Organization Delete Protection', () => {
  beforeEach(async () => {
    await resetDb();
    setupChromeStub();
    // Mark migration as complete to prevent auto-migration
    await setMeta('migratedOrganizationsV1', true);
  });

  it('prevents deleting the last organization', async () => {
    await putAll('organizations' as any, [
      { id: 'o_a', name: 'Personal', order: 0, isDefault: true },
    ] as any);

    render(
      <OrganizationsProvider>
        <TestHarness />
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    const deleteBtn = screen.getByTestId('delete-o_a');

    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    }, { timeout: 300 });

    // Organization should still exist
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });
  });

  it('allows deleting when multiple organizations exist', async () => {
    await putAll('organizations' as any, [
      { id: 'o_a', name: 'Personal', order: 0, isDefault: true },
      { id: 'o_work', name: 'Work', order: 1 },
    ] as any);

    render(
      <OrganizationsProvider>
        <TestHarness />
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('2');
    });

    const deleteBtn = screen.getByTestId('delete-o_work');
    fireEvent.click(deleteBtn);

    // Wait for organization to be deleted
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    // Verify it's soft-deleted in database
    const orgsInDb = (await getAll('organizations' as any)) as any[];
    expect(orgsInDb.length).toBe(2); // Both orgs exist
    const orgWork = orgsInDb.find((o: any) => o.id === 'o_work');
    expect(orgWork.deleted).toBe(true);
    expect(orgWork.deletedAt).toBeTruthy();
    // Filter out deleted: only org A remains
    const activeOrgs = orgsInDb.filter((o: any) => !o.deleted);
    expect(activeOrgs.length).toBe(1);
    expect(activeOrgs[0].id).toBe('o_a');
  });

  it('cascades delete to all categories, groups, and webpages', async () => {
    // Setup: Create organization with categories, groups, and webpages
    await putAll('organizations' as any, [
      { id: 'o_a', name: 'Personal', order: 0, isDefault: true },
      { id: 'o_work', name: 'Work', order: 1 },
    ] as any);

    await putAll('categories', [
      { id: 'c1', name: 'Cat1', color: '#aaa', order: 0, organizationId: 'o_a' },
      { id: 'c2', name: 'Cat2', color: '#bbb', order: 0, organizationId: 'o_work' },
      { id: 'c3', name: 'Cat3', color: '#ccc', order: 1, organizationId: 'o_work' },
    ] as any);

    await putAll('subcategories' as any, [
      { id: 'g1', categoryId: 'c1', name: 'Group1', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'g2', categoryId: 'c2', name: 'Group2', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'g3', categoryId: 'c3', name: 'Group3', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);

    await putAll('webpages', [
      { id: 'w1', title: 'Web1', url: 'https://a.com', category: 'c1', subcategoryId: 'g1', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'w2', title: 'Web2', url: 'https://b.com', category: 'c2', subcategoryId: 'g2', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'w3', title: 'Web3', url: 'https://c.com', category: 'c3', subcategoryId: 'g3', createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);

    render(
      <OrganizationsProvider>
        <TestHarness />
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('2');
    });

    // Delete o_work organization
    const deleteBtn = screen.getByTestId('delete-o_work');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    // Verify cascade soft-delete in database
    const orgsInDb = (await getAll('organizations' as any)) as any[];
    expect(orgsInDb.length).toBe(2); // Both orgs exist
    const workOrg = orgsInDb.find((o: any) => o.id === 'o_work');
    expect(workOrg.deleted).toBe(true);
    expect(workOrg.deletedAt).toBeTruthy();

    const catsInDb = (await getAll('categories')) as any[];
    expect(catsInDb.length).toBe(3); // All 3 categories exist
    const workCat2 = catsInDb.find((c: any) => c.id === 'c2');
    const workCat3 = catsInDb.find((c: any) => c.id === 'c3');
    expect(workCat2.deleted).toBe(true); // c2 (org_work) is soft-deleted
    expect(workCat3.deleted).toBe(true); // c3 (org_work) is soft-deleted
    const activeCats = catsInDb.filter((c: any) => !c.deleted);
    expect(activeCats.length).toBe(1);
    expect(activeCats[0].id).toBe('c1');

    const groupsInDb = (await getAll('subcategories' as any)) as any[];
    expect(groupsInDb.length).toBe(3); // All 3 groups exist
    const activeGroups = groupsInDb.filter((g: any) => !g.deleted);
    expect(activeGroups.length).toBe(1);
    expect(activeGroups[0].id).toBe('g1');

    const webpagesInDb = (await getAll('webpages')) as any[];
    expect(webpagesInDb.length).toBe(3); // All 3 webpages exist
    const activeWebpages = webpagesInDb.filter((w: any) => !w.deleted);
    expect(activeWebpages.length).toBe(1);
    expect(webpagesInDb[0].id).toBe('w1');
  });

  it('switches to another organization after deleting current one', async () => {
    await putAll('organizations' as any, [
      { id: 'o_a', name: 'Org A', order: 0 },
      { id: 'o_b', name: 'Org B', order: 1 },
    ] as any);

    const TestWithSelection: React.FC = () => {
      const { organizations, selectedOrgId, actions } = useOrganizations();
      return (
        <div>
          <div data-testid="selected">{selectedOrgId}</div>
          <div data-testid="count">{organizations.length}</div>
          <button
            data-testid="delete-selected"
            onClick={() => { void actions.remove(selectedOrgId).catch(() => {}); }}
          >
            Delete Current
          </button>
        </div>
      );
    };

    render(
      <OrganizationsProvider>
        <TestWithSelection />
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('2');
    });

    const initialSelected = screen.getByTestId('selected').textContent;
    expect(['o_a', 'o_b'].includes(initialSelected!)).toBe(true);

    // Delete current organization
    fireEvent.click(screen.getByTestId('delete-selected'));

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    // Should auto-switch to remaining organization
    await waitFor(() => {
      const newSelected = screen.getByTestId('selected').textContent;
      expect(newSelected).not.toBe(initialSelected);
      expect(['o_a', 'o_b'].includes(newSelected!)).toBe(true);
    });
  });
});
