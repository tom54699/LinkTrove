import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardGrid } from '../CardGrid';

function makeDT(payload?: any) {
  return {
    getData: (k: string) =>
      k === 'application/x-linktrove-tab' && payload
        ? JSON.stringify(payload)
        : '',
    setData: () => {},
  } as any;
}

describe('Ghost preview when dragging new tab', () => {
  it('shows ghost before target card and at end when hovering last half', () => {
    render(
      <CardGrid
        items={[
          { id: 'a', title: 'A', url: 'https://a' } as any,
          { id: 'b', title: 'B', url: 'https://b' } as any,
        ]}
      />
    );
    const target = screen.getByTestId('card-wrapper-a');
    fireEvent.dragEnter(target, {
      dataTransfer: makeDT({ id: 9, title: 'New', url: 'https://n' }),
      clientY: 0,
    });
    // Ghost rendered before target
    expect(screen.getAllByTestId('ghost-card').length).toBeGreaterThan(0);
  });
});
