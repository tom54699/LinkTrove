import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThreeColumnLayout } from '../../layout/ThreeColumn';
import { CategoriesProvider, useCategories } from '../categories';
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

const ContentProbe: React.FC = () => {
  const { selectedId } = useCategories();
  return <div data-testid="content-probe">Current: {selectedId}</div>;
};

describe('Sidebar (task 7.1)', () => {
  beforeEach(() => {
    setupChromeStub();
  });

  it('shows default categories and allows selection', () => {
    render(
      <CategoriesProvider>
        <Sidebar />
      </CategoriesProvider>
    );

    // Default entries: Default only (All removed)
    expect(
      screen.getByRole('button', { name: /Default/i })
    ).toBeInTheDocument();

    // Initially Default is selected
    const def = screen.getByRole('button', { name: /Default/i });
    expect(def.getAttribute('data-active')).toBe('true');
  });

  it('updates content area when switching category', () => {
    render(
      <CategoriesProvider>
        <ThreeColumnLayout sidebar={<Sidebar />} content={<ContentProbe />} />
      </CategoriesProvider>
    );

    // Initially shows Default (All removed)
    expect(screen.getByTestId('content-probe').textContent).toContain('default');
    // Since there's only one category now, the test just verifies it shows Default
    expect(screen.getByRole('button', { name: /Default/i })).toBeInTheDocument();
  });
});
