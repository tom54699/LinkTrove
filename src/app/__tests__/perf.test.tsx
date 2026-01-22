import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CardGrid } from '../webpages/CardGrid';
import { FeedbackProvider } from '../ui/feedback';

vi.mock('../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: any }) => children,
  LANGUAGE_OPTIONS: [],
}));

describe('Perf sanity (task 12)', () => {
  it('renders 300 cards without crashing', () => {
    const items = Array.from({ length: 300 }, (_, i) => ({
      id: `id${i}`,
      title: `Title ${i}`,
      url: `https://ex/${i}`,
      favicon: '',
      note: '',
    }));
    render(
      <FeedbackProvider>
        <CardGrid items={items} />
      </FeedbackProvider>
    );
    // spot check some titles
    expect(screen.getByText('Title 0')).toBeInTheDocument();
    expect(screen.getByText('Title 299')).toBeInTheDocument();
  });
});
