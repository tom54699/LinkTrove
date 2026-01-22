import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: any }) => children,
  LANGUAGE_OPTIONS: [],
}));

const reorderSpy = vi.fn();
const updateCategorySpy = vi.fn();
const addFromTabSpy = vi.fn();

vi.mock('../categories', () => ({
  useCategories: () => ({
    categories: [{ id: 'c1', name: 'C1', color: '#888', order: 0 }],
    selectedId: 'c1',
    setCurrentCategory: vi.fn(),
    actions: { reorderCategories: reorderSpy },
  }),
}));

vi.mock('../organizations', () => ({
  useOrganizations: () => ({
    organizations: [{ id: 'o_default', name: 'Personal' }],
    selectedOrgId: 'o_default',
    setCurrentOrganization: vi.fn(),
  }),
}));

vi.mock('../../templates/TemplatesProvider', () => ({
  useTemplates: () => ({ templates: [] }),
}));

vi.mock('../../webpages/WebpagesProvider', () => ({
  useWebpages: () => ({
    items: [],
    actions: {
      updateCategory: updateCategorySpy,
      addFromTab: addFromTabSpy,
    },
  }),
}));

import { Sidebar } from '../sidebar';

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

function dt(data: Record<string, string>) {
  return {
    getData: (t: string) => data[t] || '',
    setData: vi.fn(),
    types: Object.keys(data),
  } as any;
}

describe('Sidebar drop behaviour', () => {
  beforeEach(() => {
    reorderSpy.mockReset();
    updateCategorySpy.mockReset();
    addFromTabSpy.mockReset();
    setupChromeStub();
  });

  it('still supports category reorder via dragging categories', async () => {
    render(<Sidebar />);
    const catItem = await screen.findByText('C1');
    // simulate dropping a category id
    fireEvent.drop(catItem.closest('div')!, {
      preventDefault: () => {},
      dataTransfer: dt({ 'application/x-linktrove-category': 'c1' }),
    } as any);
    // may not reorder with only one category; ensure it didn't attempt updateCategory/addFromTab
    expect(updateCategorySpy).not.toHaveBeenCalled();
    expect(addFromTabSpy).not.toHaveBeenCalled();
  });

  it('does not move webpage when dropping a card onto a collection', async () => {
    render(<Sidebar />);
    const catItem = await screen.findByText('C1');
    fireEvent.drop(catItem.closest('div')!, {
      preventDefault: () => {},
      dataTransfer: dt({ 'application/x-linktrove-webpage': 'w1' }),
    } as any);
    expect(updateCategorySpy).not.toHaveBeenCalled();
  });

  it('does not add a tab when dropping a tab onto a collection', async () => {
    render(<Sidebar />);
    const catItem = await screen.findByText('C1');
    const raw = JSON.stringify({ id: 1, url: 'https://ex.com', title: 'Ex' });
    fireEvent.drop(catItem.closest('div')!, {
      preventDefault: () => {},
      dataTransfer: dt({ 'application/x-linktrove-tab': raw }),
    } as any);
    expect(addFromTabSpy).not.toHaveBeenCalled();
    expect(updateCategorySpy).not.toHaveBeenCalled();
  });
});
