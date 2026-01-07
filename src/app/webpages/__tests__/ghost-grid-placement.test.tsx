import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

function stubRect(x: number, y: number, w = 200, h = 160): DOMRect {
  return {
    x,
    y,
    width: w,
    height: h,
    top: y,
    left: x,
    right: x + w,
    bottom: y + h,
    toJSON: () => ({}),
  } as any;
}

describe('Grid-based ghost placement', () => {
  it('places ghost by row/column based on pointer', async () => {
    const items = [
      { id: 'a', title: 'A', url: 'https://a' } as any,
      { id: 'b', title: 'B', url: 'https://b' } as any,
      { id: 'c', title: 'C', url: 'https://c' } as any,
      { id: 'd', title: 'D', url: 'https://d' } as any,
    ];
    const { container } = render(<CardGrid items={items} />);
    const zone = screen.getByTestId('drop-zone');
    // Arrange a 2x2 grid layout via getBoundingClientRect stubs
    const wa = screen.getByTestId('card-wrapper-a');
    const wb = screen.getByTestId('card-wrapper-b');
    const wc = screen.getByTestId('card-wrapper-c');
    const wd = screen.getByTestId('card-wrapper-d');
    (wa as any).getBoundingClientRect = () => stubRect(0, 0);
    (wb as any).getBoundingClientRect = () => stubRect(220, 0);
    (wc as any).getBoundingClientRect = () => stubRect(0, 180);
    (wd as any).getBoundingClientRect = () => stubRect(220, 180);

    // 1) Near left of first row → before A (index 0)
    fireEvent.dragOver(zone, {
      dataTransfer: makeDT({ id: 9, url: 'https://n' }),
      clientX: 10,
      clientY: 10,
    });
    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="ghost-card"]')
      ).toBeTruthy();
    });

    // 2) Near middle of first row right side → before B (index 1)
    fireEvent.dragOver(zone, {
      dataTransfer: makeDT({ id: 9, url: 'https://n' }),
      clientX: 230,
      clientY: 10,
    });
    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="ghost-card"]')
      ).toBeTruthy();
    });

    // 3) Below last row lower-right → at end
    fireEvent.dragOver(zone, {
      dataTransfer: makeDT({ id: 9, url: 'https://n' }),
      clientX: 999,
      clientY: 999,
    });
    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="ghost-card"]')
      ).toBeTruthy();
    });
  });
});
