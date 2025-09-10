import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardGrid } from '../CardGrid';

function makeDT(fromId: string) {
  return {
    getData: (k: string) => (k === 'application/x-linktrove-webpage' ? fromId : ''),
    setData: vi.fn(),
  } as any;
}

describe('CardGrid ghost → drop uses visible ghost position', () => {
  it('dropping on container inserts before the ghost preview (not end)', () => {
    const onDropExistingCard = vi.fn();
    const items = [
      { id: 'a', title: 'A', url: 'https://a' } as any,
      { id: 'b', title: 'B', url: 'https://b' } as any,
      { id: 'c', title: 'C', url: 'https://c' } as any,
    ];
    render(<CardGrid items={items} onDropExistingCard={onDropExistingCard} />);

    // 1) Simulate dragOver on the second card wrapper to position the ghost before it
    const wrapB = screen.getByTestId('card-wrapper-b');
    fireEvent.dragOver(wrapB, { dataTransfer: makeDT('a') });

    // 2) Drop on the container (not on a specific card wrapper)
    const zone = screen.getByTestId('drop-zone');
    fireEvent.drop(zone, { dataTransfer: makeDT('a') });

    // Expect the existing-card drop to request insertion before 'b' (the ghost position)
    expect(onDropExistingCard).toHaveBeenCalledWith('a', 'b');
  });
});

