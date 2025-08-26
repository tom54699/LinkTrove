import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardGrid } from '../CardGrid';
import { FeedbackProvider } from '../../ui/feedback';
import type { WebpageCardData } from '../WebpageCard';

const items: WebpageCardData[] = [
  { id: 'a', title: 'A', url: 'https://a', favicon: '', note: '' },
  { id: 'b', title: 'B', url: 'https://b', favicon: '', note: '' },
];

describe('Batch operations (task 8)', () => {
  it('supports selecting multiple cards and batch delete with confirmation', () => {
    const onDeleteMany = vi.fn();
    render(
      <FeedbackProvider>
        <CardGrid items={items} onDeleteMany={onDeleteMany} />
      </FeedbackProvider>
    );

    // Enter selection mode
    fireEvent.click(screen.getByRole('button', { name: /select/i }));

    // Checkboxes should appear
    const cbs = screen.getAllByRole('checkbox');
    expect(cbs.length).toBe(2);

    // Select both
    fireEvent.click(cbs[0]);
    fireEvent.click(cbs[1]);
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    // Trigger batch delete
    fireEvent.click(screen.getByRole('button', { name: /delete selected/i }));
    const dialog = screen.getByRole('dialog', {
      name: /confirm delete selected/i,
    });
    expect(dialog).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(onDeleteMany).toHaveBeenCalledWith(['a', 'b']);
  });
});
