import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WebpageCard, type WebpageCardData } from '../WebpageCard';

const sample: WebpageCardData = {
  id: 'w1',
  title: 'Example Title',
  url: 'https://example.com',
  description: 'A short description',
  note: 'My note',
  favicon: '',
};

describe('WebpageCard (task 5.1)', () => {
  it('renders title, description, and note', () => {
    render(<WebpageCard data={sample} />);
    expect(screen.getByText('Example Title')).toBeInTheDocument();
    expect(screen.getByText('A short description')).toBeInTheDocument();
    expect(screen.getByText('My note')).toBeInTheDocument();
  });

  it('invokes onOpen when clicked', () => {
    const onOpen = vi.fn();
    const { getByTestId } = render(<WebpageCard data={sample} onOpen={onOpen} />);
    const card = getByTestId('webpage-card');
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledWith('https://example.com');
  });

  it('has hover style classes', () => {
    const { getByTestId } = render(<WebpageCard data={sample} />);
    const card = getByTestId('webpage-card');
    expect(card.className).toContain('hover:');
  });
});
