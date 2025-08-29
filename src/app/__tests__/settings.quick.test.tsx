import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../webpages/WebpagesProvider', () => {
  const addFromTab = vi.fn().mockResolvedValue('new1');
  const updateCategory = vi.fn().mockResolvedValue(undefined);
  return {
    useWebpages: () => ({ items: [{ id: 'a', title: 'A', url: 'https://a' }], actions: { addFromTab, updateCategory } }),
  } as any;
});

vi.mock('../sidebar/categories', () => ({
  useCategories: () => ({ categories: [{ id: 'default', name: 'Default' }], selectedId: 'default', setCurrentCategory: vi.fn(), actions: {} }),
}));

import { Settings } from '../App';

describe('Settings quick add and quick access', () => {
  it('renders quick add and adds via addFromTab', async () => {
    render(<Settings />);
    const input = screen.getByPlaceholderText('https://example.com') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://x' } });
    fireEvent.click(screen.getByText('Add'));
    const { useWebpages } = await import('../webpages/WebpagesProvider');
    const { actions } = useWebpages();
    expect(actions.addFromTab).toHaveBeenCalled();
  });

  it('shows quick access sections', () => {
    render(<Settings />);
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('Popular')).toBeInTheDocument();
  });
});

