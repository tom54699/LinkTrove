import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WebpageCard, type WebpageCardData } from '../WebpageCard';

const sample: WebpageCardData = {
  id: 'w1',
  title: 'Example',
  url: 'https://example.com',
  description: '',
  note: 'Initial note',
  favicon: '',
};

describe('WebpageCard inline note editing (task 6.2)', () => {
  it('enters edit mode and auto-saves on blur', () => {
    const onEdit = vi.fn();
    render(<WebpageCard data={sample} onEdit={onEdit} />);
    // Click the note to start editing
    fireEvent.click(screen.getByText('Initial note'));
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveFocus();

    // Change text
    fireEvent.change(textarea, { target: { value: 'Updated note' } });
    // Blur to trigger auto-save
    fireEvent.blur(textarea);

    expect(onEdit).toHaveBeenCalledWith('w1', 'Updated note');
  });

  it('shows editing visual state while editing', () => {
    render(<WebpageCard data={sample} />);
    fireEvent.click(screen.getByText('Initial note'));
    const card = screen.getByTestId('webpage-card');
    expect(card.getAttribute('data-editing')).toBe('true');
  });
});
