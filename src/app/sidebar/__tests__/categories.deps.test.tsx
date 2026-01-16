import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoriesProvider, useCategories } from '../categories';

const dbMocks = vi.hoisted(() => ({
  tx: vi.fn(async () => ([
    { id: 'c1', name: 'A', color: '#aaa', order: 0, organizationId: 'o_default' },
    { id: 'c2', name: 'B', color: '#bbb', order: 1, organizationId: 'o_default' },
  ])),
  getMeta: vi.fn(async () => undefined),
  setMeta: vi.fn(async () => undefined),
}));

vi.mock('../../../background/idb/db', () => dbMocks);

const storageMocks = vi.hoisted(() => ({
  listSubcategories: vi.fn(async () => [{ id: 'g1' }]),
  createSubcategory: vi.fn(async () => {}),
}));

vi.mock('../../../background/storageService', () => ({
  createStorageService: () => ({
    listSubcategories: storageMocks.listSubcategories,
    createSubcategory: storageMocks.createSubcategory,
  }),
}));

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
  const { selectedId, setCurrentCategory } = useCategories();
  return (
    <div>
      <div data-testid="selected">{selectedId}</div>
      <button onClick={() => setCurrentCategory('c2')}>Set C2</button>
    </div>
  );
};

describe('CategoriesProvider dependency safety', () => {
  beforeEach(() => {
    setupChromeStub();
    dbMocks.tx.mockClear();
    storageMocks.listSubcategories.mockClear();
    storageMocks.createSubcategory.mockClear();
  });

  it('does not reload categories when selectedId changes', async () => {
    render(
      <CategoriesProvider>
        <Probe />
      </CategoriesProvider>
    );

    await waitFor(() => {
      expect(dbMocks.tx).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByTestId('selected').textContent).toBe('c1');
    });

    fireEvent.click(screen.getByText('Set C2'));

    await waitFor(() => {
      expect(screen.getByTestId('selected').textContent).toBe('c2');
    });

    expect(dbMocks.tx).toHaveBeenCalledTimes(1);
  });
});
