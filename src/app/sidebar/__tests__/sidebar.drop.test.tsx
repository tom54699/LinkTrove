import React from 'react';
import { describe, it, expect, vi } from 'vitest';
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

function makeDT(data: Record<string, string>) {
  return {
    getData: (k: string) => (data as any)[k] || '',
    setData: vi.fn(),
    dropEffect: 'move',
    effectAllowed: 'all',
  } as any;
}

describe('Sidebar drop behavior', () => {
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
