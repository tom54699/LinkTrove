import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardGrid } from '../CardGrid';

function makeDT(payload?: any) {
  return {
    getData: (k: string) => (k === 'application/x-linktrove-tab' && payload ? JSON.stringify(payload) : ''),
    setData: vi.fn(),
  } as any;
}

describe('Drop positioning behavior', () => {
  it('drops on container with existing items → adds at end by default', () => {
    const onDropTab = vi.fn();
    render(<CardGrid items={[{ id: 'a', title: 'A', url: 'https://a' } as any]} onDropTab={onDropTab} />);
    const zone = screen.getByTestId('drop-zone');
    fireEvent.drop(zone, { dataTransfer: makeDT({ id: 9, title: 'T', url: 'https://t' }) });
    expect(onDropTab).toHaveBeenCalledWith({ id: 9, title: 'T', url: 'https://t' }, '__END__');
  });

  it('adds when list is empty (back-compat)', () => {
    const onDropTab = vi.fn();
    render(<CardGrid items={[]} onDropTab={onDropTab} />);
    const zone = screen.getByTestId('drop-zone');
    fireEvent.drop(zone, { dataTransfer: makeDT({ id: 9, title: 'T', url: 'https://t' }) });
    expect(onDropTab).toHaveBeenCalled();
  });
});
