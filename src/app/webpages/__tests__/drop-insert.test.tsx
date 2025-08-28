import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardGrid } from '../CardGrid';

const makeDT = () => ({
  getData: (k: string) => {
    if (k === 'application/x-linktrove-tab') return JSON.stringify({ id: 9, title: 'N', url: 'https://n' });
    return '';
  },
  setData: vi.fn(),
}) as any;

describe('Drop insert before a card', () => {
  it('calls onDropTab with beforeId when dropping on a card', () => {
    const onDropTab = vi.fn();
    render(
      <CardGrid
        items={[{ id: 'a', title: 'A', url: 'https://a' } as any, { id: 'b', title: 'B', url: 'https://b' } as any]}
        onDropTab={onDropTab as any}
      />
    );
    const wrapper = screen.getByTestId('card-wrapper-b');
    fireEvent.drop(wrapper, { dataTransfer: makeDT() });
    expect(onDropTab).toHaveBeenCalledWith({ id: 9, title: 'N', url: 'https://n' }, 'b');
  });
});

