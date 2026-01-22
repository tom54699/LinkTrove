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
    getData: (k: string) => {
      if (k === 'application/x-linktrove-tab')
        return JSON.stringify({ id: 9, title: 'N', url: 'https://n' });
      return '';
    },
    setData: vi.fn(),
  }) as any;

describe('Drop insert before a card', () => {
  it('calls onDropTab with beforeId when dropping on a card', () => {
    const onDropTab = vi.fn();
    render(
      <CardGrid
        items={[
          { id: 'a', title: 'A', url: 'https://a' } as any,
          { id: 'b', title: 'B', url: 'https://b' } as any,
        ]}
        onDropTab={onDropTab as any}
      />
    );
    const wrapper = screen.getByText('B').closest('.toby-card-flex') as HTMLElement;
    fireEvent.drop(wrapper, { dataTransfer: makeDT() });
    const call = onDropTab.mock.calls[0];
    expect(call[0]).toEqual({ id: 9, title: 'N', url: 'https://n' });
  });
});
