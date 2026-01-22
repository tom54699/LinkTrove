import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CardGrid } from '../CardGrid';
import { FeedbackProvider } from '../../ui/feedback';
import type { WebpageCardData } from '../WebpageCard';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: any }) => children,
  LANGUAGE_OPTIONS: [],
}));

const items: WebpageCardData[] = [
  { id: 'a', title: 'A', url: 'https://a', favicon: '', description: '' },
  { id: 'b', title: 'B', url: 'https://b', favicon: '', description: '' },
];

describe('Batch operations (task 8)', () => {
  it('supports selecting multiple cards and batch delete with confirmation', async () => {
    const onDeleteMany = vi.fn();
    render(
      <FeedbackProvider>
        <CardGrid items={items} onDeleteMany={onDeleteMany} />
      </FeedbackProvider>
    );

    // Checkboxes should appear
    const cbs = screen.getAllByRole('checkbox', { hidden: true });
    expect(cbs.length).toBe(2);

    // Select both
    fireEvent.click(cbs[0].parentElement ?? cbs[0]);
    fireEvent.click(cbs[1].parentElement ?? cbs[1]);
    await screen.findByText('batch_selected');

    // Trigger batch delete
    fireEvent.click(screen.getByRole('button', { name: 'batch_delete' }));
    const dialog = screen.getByRole('dialog', {
      name: 'confirm_delete_selected_title',
    });
    expect(dialog).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'menu_delete' }));

    expect(onDeleteMany).toHaveBeenCalledWith(['a', 'b']);
  });
});
