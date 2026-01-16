import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const updateCategory = vi.fn();
const addFromTab = vi.fn().mockResolvedValue('new_id');

vi.mock('../../webpages/WebpagesProvider', () => ({
  useWebpages: () => ({ actions: { updateCategory, addFromTab } }),
}));

vi.mock('../categories', () => ({
  useCategories: () => ({
    categories: [
      { id: 'default', name: 'Default', color: '#aaa', order: 0 },
      { id: 'c1', name: 'C1', color: '#bbb', order: 1 },
    ],
    selectedId: 'default',
    setCurrentCategory: vi.fn(),
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

function makeDT(data: Record<string, string>) {
  return {
    getData: (k: string) => (data as any)[k] || '',
    setData: vi.fn(),
    dropEffect: 'move',
    effectAllowed: 'all',
  } as any;
}

describe('Sidebar drop behavior', () => {
  beforeEach(() => {
    setupChromeStub();
  });

  it('ignores card drops (disabled feature)', () => {
    render(<Sidebar />);
    const btn = screen.getByText('C1');
    const dt = makeDT({ 'application/x-linktrove-webpage': 'w_1' });
    fireEvent.drop(btn, { dataTransfer: dt });
    expect(updateCategory).not.toHaveBeenCalled();
  });

  it('ignores tab drops (disabled feature)', async () => {
    render(<Sidebar />);
    const btn = screen.getByText('C1');
    const tab = { id: 9, title: 'T', url: 'https://e.com', favIconUrl: '' };
    const dt = makeDT({ 'application/x-linktrove-tab': JSON.stringify(tab) });
    await fireEvent.drop(btn, { dataTransfer: dt });
    expect(addFromTab).not.toHaveBeenCalled();
    expect(updateCategory).not.toHaveBeenCalled();
  });
});
