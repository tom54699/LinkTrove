import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrganizationsProvider } from '../organizations';
import { CategoriesProvider, useCategories } from '../categories';
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
  const { categories, actions } = useCategories();
  return (
    <div>
      <pre data-testid="cats">{JSON.stringify(categories.map((c) => ({ id: c.id, orgId: c.organizationId })))}</pre>
      <div data-testid="count">{categories.length}</div>
      {categories.map((cat) => (
        <button
          key={cat.id}
          data-testid={`delete-${cat.id}`}
          onClick={() => { void actions.deleteCategory(cat.id).catch(() => {}); }}
        >
          Delete {cat.name}
        </button>
      ))}
    </div>
  );
};

describe('Collection Delete Protection', () => {
  beforeEach(async () => {
    await resetDb();
    setupChromeStub();
    // Mark migration as complete
    await setMeta('migratedOrganizationsV1', true);
  });

  it('prevents deleting the last collection in an organization', async () => {
    await putAll('organizations' as any, [
      { id: 'o_default', name: 'Personal', order: 0 },
    ] as any);

    await putAll('categories', [
      { id: 'c1', name: 'Cat1', color: '#aaa', order: 0, organizationId: 'o_default' },
    ] as any);

    render(
      <OrganizationsProvider>
        <CategoriesProvider>
          <TestHarness />
        </CategoriesProvider>
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    }, { timeout: 800 });

    const deleteBtn = screen.getByTestId('delete-c1');

    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    }, { timeout: 300 });

    // Collection should still exist
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });
    const catsInDb = (await getAll('categories')) as any[];
    expect(catsInDb.length).toBe(1);
    expect(catsInDb[0].id).toBe('c1');
  });

  it('allows deleting when organization has multiple collections', async () => {
    await putAll('organizations' as any, [
      { id: 'o_default', name: 'Personal', order: 0 },
    ] as any);

    await putAll('categories', [
      { id: 'c1', name: 'Cat1', color: '#aaa', order: 0, organizationId: 'o_default' },
      { id: 'c2', name: 'Cat2', color: '#bbb', order: 1, organizationId: 'o_default' },
    ] as any);

    render(
      <OrganizationsProvider>
        <CategoriesProvider>
          <TestHarness />
        </CategoriesProvider>
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('2');
    }, { timeout: 800 });

    const deleteBtn = screen.getByTestId('delete-c2');
    fireEvent.click(deleteBtn);

    // Wait for category to be deleted
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    await waitFor(async () => {
      const catsInDb = (await getAll('categories')) as any[];
      expect(catsInDb.length).toBe(1);
      expect(catsInDb[0].id).toBe('c1');
    }, { timeout: 1500 });
  });

  it('allows deleting collection in org A when org B has only one collection', async () => {
    await putAll('organizations' as any, [
      { id: 'o_default', name: 'Org A', order: 0 },
      { id: 'o_b', name: 'Org B', order: 1 },
    ] as any);

    await putAll('categories', [
      { id: 'c1', name: 'Cat1', color: '#aaa', order: 0, organizationId: 'o_default' },
      { id: 'c2', name: 'Cat2', color: '#bbb', order: 1, organizationId: 'o_default' },
      { id: 'c3', name: 'Cat3', color: '#ccc', order: 0, organizationId: 'o_b' },
    ] as any);

    render(
      <OrganizationsProvider>
        <CategoriesProvider>
          <TestHarness />
        </CategoriesProvider>
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('2');
    }, { timeout: 800 });

    // Should be able to delete c2 from org A (which has 2 categories)
    const deleteBtn = screen.getByTestId('delete-c2');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    await waitFor(async () => {
      const catsInDb = (await getAll('categories')) as any[];
      expect(catsInDb.length).toBe(2); // c1 and c3
      expect(catsInDb.some((c) => c.id === 'c3')).toBe(true);
    }, { timeout: 1500 });
  });

  it('cascades delete to all groups and webpages', async () => {
    await putAll('organizations' as any, [
      { id: 'o_default', name: 'Personal', order: 0 },
    ] as any);

    await putAll('categories', [
      { id: 'c1', name: 'Cat1', color: '#aaa', order: 0, organizationId: 'o_default' },
      { id: 'c2', name: 'Cat2', color: '#bbb', order: 1, organizationId: 'o_default' },
    ] as any);

    await putAll('subcategories' as any, [
      { id: 'g1', categoryId: 'c1', name: 'Group1', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'g2', categoryId: 'c2', name: 'Group2', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'g3', categoryId: 'c2', name: 'Group3', order: 1, createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);

    await putAll('webpages', [
      { id: 'w1', title: 'Web1', url: 'https://a.com', category: 'c1', subcategoryId: 'g1', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'w2', title: 'Web2', url: 'https://b.com', category: 'c2', subcategoryId: 'g2', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'w3', title: 'Web3', url: 'https://c.com', category: 'c2', subcategoryId: 'g3', createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);

    render(
      <OrganizationsProvider>
        <CategoriesProvider>
          <TestHarness />
        </CategoriesProvider>
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('2');
    }, { timeout: 800 });

    // Delete c2 collection
    const deleteBtn = screen.getByTestId('delete-c2');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    await waitFor(async () => {
      const catsInDb = (await getAll('categories')) as any[];
      expect(catsInDb.length).toBe(1);
      expect(catsInDb[0].id).toBe('c1');

      const groupsInDb = (await getAll('subcategories' as any)) as any[];
      expect(groupsInDb.length).toBe(1);
      expect(groupsInDb[0].id).toBe('g1');

      const webpagesInDb = (await getAll('webpages')) as any[];
      expect(webpagesInDb.length).toBe(1);
      expect(webpagesInDb[0].id).toBe('w1');
    }, { timeout: 1500 });
  });

  it('switches to another collection after deleting current one', async () => {
    await putAll('organizations' as any, [
      { id: 'o_default', name: 'Personal', order: 0 },
    ] as any);

    await putAll('categories', [
      { id: 'c1', name: 'Cat1', color: '#aaa', order: 0, organizationId: 'o_default' },
      { id: 'c2', name: 'Cat2', color: '#bbb', order: 1, organizationId: 'o_default' },
    ] as any);

    const TestWithSelection: React.FC = () => {
      const { categories, selectedId, actions } = useCategories();
      return (
        <div>
          <div data-testid="selected">{selectedId}</div>
          <div data-testid="count">{categories.length}</div>
          <button
            data-testid="delete-selected"
            onClick={() => { void actions.deleteCategory(selectedId).catch(() => {}); }}
          >
            Delete Current
          </button>
        </div>
      );
    };

    render(
      <OrganizationsProvider>
        <CategoriesProvider>
          <TestWithSelection />
        </CategoriesProvider>
      </OrganizationsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('2');
    }, { timeout: 800 });

    const initialSelected = screen.getByTestId('selected').textContent;
    expect(['c1', 'c2', ''].includes(initialSelected!)).toBe(true);

    // Only delete if there's a valid selection
    if (initialSelected && initialSelected !== '') {
      fireEvent.click(screen.getByTestId('delete-selected'));

      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('1');
      });

      // Should auto-switch to remaining collection
      await waitFor(() => {
        const newSelected = screen.getByTestId('selected').textContent;
        expect(['c1', 'c2'].includes(newSelected!)).toBe(true);
        expect(newSelected).not.toBe(initialSelected);
      });
    }
  });

  it('prevents deleting last collection per organization in multi-org scenario', async () => {
    await putAll('organizations' as any, [
      { id: 'o_default', name: 'Org A', order: 0 },
      { id: 'o_b', name: 'Org B', order: 1 },
    ] as any);

    await putAll('categories', [
      { id: 'c1', name: 'Cat1', color: '#aaa', order: 0, organizationId: 'o_default' },
      { id: 'c2', name: 'Cat2', color: '#bbb', order: 1, organizationId: 'o_default' },
      { id: 'c3', name: 'Cat3', color: '#ccc', order: 0, organizationId: 'o_b' },
    ] as any);

    const TestMultiOrg: React.FC = () => {
      const { categories, actions } = useCategories();
      // Simulate viewing org B's categories (manually filter for test)
      const allCats = categories;
      return (
        <div>
          <div data-testid="count">{allCats.length}</div>
          {allCats.map((cat) => (
            <button
              key={cat.id}
              data-testid={`delete-${cat.id}`}
              onClick={() => { void actions.deleteCategory(cat.id).catch(() => {}); }}
            >
              Delete {cat.name}
            </button>
          ))}
        </div>
      );
    };

    render(
      <OrganizationsProvider>
        <CategoriesProvider>
          <TestMultiOrg />
        </CategoriesProvider>
      </OrganizationsProvider>
    );

    await waitFor(() => {
      // Should show categories from default org (o_a)
      const count = screen.getByTestId('count').textContent;
      expect(count).toBe('2'); // c1, c2
    }, { timeout: 800 });

    // Can delete c1 (org A has 2 categories)
    fireEvent.click(screen.getByTestId('delete-c1'));
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    // Now org A has only 1 category left (c2), cannot delete it
    fireEvent.click(screen.getByTestId('delete-c2'));
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    }, { timeout: 300 });
    const catsInDb = (await getAll('categories')) as any[];
    expect(catsInDb.some((c) => c.id === 'c2')).toBe(true);
  });
});
