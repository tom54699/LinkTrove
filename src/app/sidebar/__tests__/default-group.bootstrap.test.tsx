import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoriesProvider } from '../../sidebar/categories';
import { getAll } from '../../../background/idb/db';
import { DEFAULT_GROUP_NAME } from '../../../utils/defaults';

// Minimal Chrome API stubs for tests (callback-style)
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
  if (!g.chrome.storage.sync)
    g.chrome.storage.sync = {
      get: (defaults: any, cb: (res: any) => void) => cb({ ...defaults }),
      set: (_items: any, _cb?: () => void) => _cb?.(),
      clear: (_cb?: () => void) => _cb?.(),
    } as any;
}

describe('bootstrap default group for Default collection', () => {
  it('creates a default "group" when none exists', async () => {
    setupChromeStub();
    render(
      <CategoriesProvider>
        <div data-testid="ready">ok</div>
      </CategoriesProvider>
    );
    // Wait until provider mounted
    await screen.findByTestId('ready');
    const { createStorageService } = await import(
      '../../../background/storageService'
    );
    const svc: any = createStorageService();
    // Wait for auto-creation to complete
    // Using polling with time budget
    let list: any[] = [];
    const deadline = Date.now() + 2000;
    while (true) {
      const cats = (await getAll('categories')) as any[];
      const defCat = cats.find((c) => c.isDefault) || cats[0];
      if (defCat?.id) {
        list = ((await svc.listSubcategories?.(defCat.id)) as any[]) || [];
      } else {
        list = [];
      }
      if (Array.isArray(list) && list.length > 0) break;
      if (Date.now() > deadline) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    // ensure the default group name matches "group"
    const names = list.map((x) => String(x.name || '').toLowerCase());
    expect(names).toContain(DEFAULT_GROUP_NAME.toLowerCase());
  });
});
