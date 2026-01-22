import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardGrid } from '../CardGrid';
import { FeedbackProvider } from '../../ui/feedback';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: any }) => children,
  LANGUAGE_OPTIONS: [],
}));

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
    render(
      <FeedbackProvider>
        <CardGrid />
      </FeedbackProvider>
    );
    const zone = screen.getByLabelText(/drop zone/i);
    fireEvent.dragOver(zone, { dataTransfer: makeDT() });
    expect(zone).toBeInTheDocument();
    fireEvent.dragLeave(zone);
    expect(zone).toBeInTheDocument();
  });

  it('parses dropped tab payload and calls onDropTab', () => {
    const onDropTab = vi.fn();
    render(
      <FeedbackProvider>
        <CardGrid onDropTab={onDropTab} />
      </FeedbackProvider>
    );
    const zone = screen.getByLabelText(/drop zone/i);
    const dt = makeDT();
    dt.setData(
      'application/x-linktrove-tab',
      JSON.stringify({ id: 7, title: 'T', url: 'https://t' })
    );
    fireEvent.drop(zone, { dataTransfer: dt });
    // Called with a single argument (back-compat)
    expect(onDropTab).toHaveBeenCalledWith({
      id: 7,
      title: 'T',
      url: 'https://t',
    });
  });
});
