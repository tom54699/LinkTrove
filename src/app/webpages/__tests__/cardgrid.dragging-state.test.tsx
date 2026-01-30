import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardGrid } from '../CardGrid';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: any }) => children,
  LANGUAGE_OPTIONS: [],
}));

const makeDT = () =>
  ({
    setData: vi.fn(),
    getData: vi.fn(),
    effectAllowed: 'all',
    dropEffect: 'move',
    items: [] as any,
    files: [] as any,
    types: [] as any,
  }) as DataTransfer;

describe('CardGrid dragging state', () => {
  it('toggles data-dragging and preserves flip after drag end', () => {
    render(
      <CardGrid
        items={[{ id: 'w1', title: 'Card A', url: 'https://a.test' } as any]}
      />
    );

    const title = screen.getByText('Card A');
    const wrapper = title.closest('.toby-card-flex') as HTMLElement;
    expect(wrapper).toBeTruthy();

    fireEvent.dragStart(wrapper, { dataTransfer: makeDT() });
    expect(wrapper.getAttribute('data-dragging')).toBe('true');

    fireEvent.dragEnd(wrapper, { dataTransfer: makeDT() });
    expect(wrapper.getAttribute('data-dragging')).toBeNull();

    const flipBtn = screen.getByTitle('card_time_toggle');
    fireEvent.click(flipBtn);
    const card = title.closest('.card') as HTMLElement;
    expect(card.className).toContain('is-flipped');
  });
});
