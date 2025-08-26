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

describe('WebpageCard context menu (task 8)', () => {
  it('shows context menu on right-click and allows delete with confirmation', () => {
    const onDelete = vi.fn();
    render(<WebpageCard data={sample} onDelete={onDelete} />);

    const card = screen.getByTestId('webpage-card');
    fireEvent.contextMenu(card);

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    const del = screen.getByRole('menuitem', { name: /delete/i });
    fireEvent.click(del);

    // Confirm dialog appears
    const dialog = screen.getByRole('dialog', { name: /confirm delete/i });
    expect(dialog).toBeInTheDocument();
    const confirmBtn = within(dialog).getByRole('button', { name: /delete/i });
    fireEvent.click(confirmBtn);

    expect(onDelete).toHaveBeenCalledWith('w1');
  });
});
