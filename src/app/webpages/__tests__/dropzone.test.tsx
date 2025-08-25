import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardGrid } from '../CardGrid';

function makeDT() {
  const data: Record<string, string> = {};
  return {
    setData: (t: string, v: string) => (data[t] = v),
    getData: (t: string) => data[t],
    dropEffect: 'move',
    effectAllowed: 'all',
    files: [] as any,
    items: [] as any,
    types: [] as any,
  } as DataTransfer;
}

describe('CardGrid drop zone (task 5.2)', () => {
  it('highlights on drag over and unhighlights on leave', () => {
    render(<CardGrid />);
    const zone = screen.getByTestId('drop-zone');
    fireEvent.dragOver(zone, { dataTransfer: makeDT() });
    expect(zone.className).toContain('ring-emerald-500');
    fireEvent.dragLeave(zone);
    expect(zone.className).not.toContain('ring-emerald-500');
  });

  it('parses dropped tab payload and calls onDropTab', () => {
    const onDropTab = vi.fn();
    render(<CardGrid onDropTab={onDropTab} />);
    const zone = screen.getByTestId('drop-zone');
    const dt = makeDT();
    dt.setData('application/x-linktrove-tab', JSON.stringify({ id: 7, title: 'T', url: 'https://t' }));
    fireEvent.drop(zone, { dataTransfer: dt });
    expect(onDropTab).toHaveBeenCalledWith({ id: 7, title: 'T', url: 'https://t' });
  });
});

