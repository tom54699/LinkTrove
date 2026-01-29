import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { OpenTabsProvider } from '../OpenTabsProvider';
import { TabsPanel } from '../TabsPanel';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: any }) => children,
  LANGUAGE_OPTIONS: [],
}));

describe('TabsPanel (task 4.1)', () => {
  it('renders list of tabs and updates on change', async () => {
    let actions: any;
    render(
      <OpenTabsProvider expose={(ctx) => (actions = ctx.actions)}>
        <TabsPanel />
      </OpenTabsProvider>
    );
    // Initially empty
    expect(screen.getByText(/No open tabs/i)).toBeInTheDocument();
    // Add a tab
    await act(async () => {
      actions.addTab({
        id: 1,
        title: 'Example',
        favIconUrl: '',
        url: 'https://example.com',
      });
    });
    expect(screen.queryByText(/No open tabs/i)).not.toBeInTheDocument();
    expect(screen.getByText('Example')).toBeInTheDocument();
    // Update title
    await act(async () => {
      actions.updateTab(1, { title: 'Updated' });
    });
    expect(screen.getByText('Updated')).toBeInTheDocument();
    // Remove
    await act(async () => {
      actions.removeTab(1);
    });
    expect(screen.getByText(/No open tabs/i)).toBeInTheDocument();
  });
});
