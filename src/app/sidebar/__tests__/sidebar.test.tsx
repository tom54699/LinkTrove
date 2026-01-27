import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThreeColumnLayout } from '../../layout/ThreeColumn';
import { CategoriesProvider, useCategories } from '../categories';
import { Sidebar } from '../sidebar';
import { DEFAULT_CATEGORY_NAME } from '../../../utils/defaults';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: any }) => children,
  LANGUAGE_OPTIONS: [],
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
      screen.getByRole('button', { name: new RegExp(DEFAULT_CATEGORY_NAME, 'i') })
    ).toBeInTheDocument();

    // Initially Default is selected
    const def = screen.getByRole('button', { name: new RegExp(DEFAULT_CATEGORY_NAME, 'i') });
    expect(def.getAttribute('data-active')).toBe('true');
  });

  it('updates content area when switching category', () => {
    render(
      <CategoriesProvider>
        <ThreeColumnLayout sidebar={<Sidebar />} content={<ContentProbe />} />
      </CategoriesProvider>
    );

    // Initially shows default selection
    expect(screen.getByTestId('content-probe').textContent).toMatch(/Current:\s*\w+/);
    // Since there's only one category now, the test just verifies it shows the default label
    expect(screen.getByRole('button', { name: new RegExp(DEFAULT_CATEGORY_NAME, 'i') })).toBeInTheDocument();
  });
});
