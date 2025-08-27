import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { WebpageCard, type WebpageCardData } from '../WebpageCard';

const sample: WebpageCardData = {
  id: 'w1',
  title: 'Example',
  url: 'https://example.com',
  description: '',
  note: 'Note',
  favicon: '',
};

describe('WebpageCard icon actions (no right-click)', () => {
  it('deletes via top-right delete icon with confirmation', () => {
    const onDelete = vi.fn();
    render(<WebpageCard data={sample} onDelete={onDelete} />);

    // There should be no context menu on right click
    const card = screen.getByTestId('webpage-card');
    fireEvent.contextMenu(card);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Use the delete icon
    const delIcon = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(delIcon);

    // Confirm dialog appears
    const dialog = screen.getByRole('dialog', { name: /confirm delete/i });
    expect(dialog).toBeInTheDocument();
    const confirmBtn = within(dialog).getByRole('button', { name: /delete/i });
    fireEvent.click(confirmBtn);

    expect(onDelete).toHaveBeenCalledWith('w1');
  });
});
