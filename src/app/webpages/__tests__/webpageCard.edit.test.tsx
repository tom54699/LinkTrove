import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WebpageCard, type WebpageCardData } from '../WebpageCard';

const sample: WebpageCardData = {
  id: 'w1',
  title: 'Example',
  url: 'https://example.com',
  description: 'Initial description',
  favicon: '',
};

describe('WebpageCard inline description editing (task 6.2)', () => {
  it('does not enter inline edit mode on description click', () => {
    const onEdit = vi.fn();
    render(<WebpageCard data={sample} onEditDescription={onEdit} />);
    fireEvent.click(screen.getByText('Initial description'));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('does not set editing visual state on description click', () => {
    render(<WebpageCard data={sample} />);
    fireEvent.click(screen.getByText('Initial description'));
    const card = screen.getByTestId('webpage-card');
    expect(card.getAttribute('data-editing')).toBeNull();
  });
});
