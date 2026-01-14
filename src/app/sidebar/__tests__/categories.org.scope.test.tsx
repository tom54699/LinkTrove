import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrganizationsProvider } from '../organizations';
import { CategoriesProvider, useCategories } from '../categories';
import { putAll } from '../../../background/idb/db';

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

const Probe: React.FC = () => {
  const { categories, actions } = useCategories();
  return (
    <div>
      <pre data-testid="cats">{JSON.stringify(categories)}</pre>
      <button onClick={() => actions.addCategory('New Cat')}>add</button>
    </div>
  );
};

describe('Categories scoped by Organization', () => {
  it('filters categories by selected org and adds into current org', async () => {
    setupChromeStub();
    await putAll('organizations' as any, [
      { id: 'o_default', name: 'Personal', order: 0 },
      { id: 'o_b', name: 'Team', order: 1 },
    ] as any);
    await putAll('categories', [
      { id: 'c1', name: 'A', color: '#aaa', order: 0, organizationId: 'o_default' },
      { id: 'c2', name: 'B', color: '#bbb', order: 1, organizationId: 'o_default' },
      { id: 'c3', name: 'X', color: '#ccc', order: 0, organizationId: 'o_b' },
    ] as any);

    render(
      <OrganizationsProvider>
        <CategoriesProvider>
          <Probe />
        </CategoriesProvider>
      </OrganizationsProvider>
    );
    // default org should show c1,c2
    const catsEl = await screen.findByTestId('cats');
    const cats = JSON.parse(catsEl.textContent || '[]');
    expect(cats.map((c: any) => c.id)).toEqual(['c1', 'c2']);
    // Add a new category in default org
    fireEvent.click(screen.getByText('add'));
    await waitFor(() => {
      const cats2 = JSON.parse((screen.getByTestId('cats').textContent || '[]'));
      expect(cats2.length).toBe(3);
    });
  });
});
