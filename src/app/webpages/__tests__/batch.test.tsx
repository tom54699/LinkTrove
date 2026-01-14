import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CardGrid } from '../CardGrid';
import { FeedbackProvider } from '../../ui/feedback';
import type { WebpageCardData } from '../WebpageCard';

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
    await screen.findByText(/2 tabs selected/i);

    // Trigger batch delete
    fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));
    const dialog = screen.getByRole('dialog', {
      name: /confirm delete selected/i,
    });
    expect(dialog).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    expect(onDeleteMany).toHaveBeenCalledWith(['a', 'b']);
  });
});
