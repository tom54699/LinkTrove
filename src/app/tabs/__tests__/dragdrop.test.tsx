import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

function createDataTransfer() {
  const data: Record<string, string> = {};
  return {
    setData: (type: string, val: string) => {
      data[type] = val;
    },
    getData: (type: string) => data[type],
    dropEffect: 'move',
    effectAllowed: 'all',
    files: [] as any,
    items: [] as any,
    types: [] as any,
  } as DataTransfer;
}

describe('TabItem drag and drop (task 4.2)', () => {
  it('sets dataTransfer payload and toggles visual state', () => {
    render(
      <OpenTabsProvider
        initialTabs={[
          { id: 42, title: 'Drag Me', url: 'https://ex', favIconUrl: '' },
        ]}
      >
        <TabsPanel />
      </OpenTabsProvider>
    );
    const item = screen.getByText('Drag Me').closest('div')!;
    const dt = createDataTransfer();

    fireEvent.dragStart(item, { dataTransfer: dt });
    expect(dt.getData('application/x-linktrove-tab')).toContain('"id":42');
    expect(item).toHaveAttribute('data-dragging', 'true');

    fireEvent.dragEnd(item);
    expect(item).not.toHaveAttribute('data-dragging');
  });
});
