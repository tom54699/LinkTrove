import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchBox } from '../SearchBox';

let mockItems: any[] = [];

vi.mock('../../webpages/WebpagesProvider', async () => {
  return {
    useWebpages: () => ({
      items: mockItems,
    }),
  } as any;
});

vi.mock('../../sidebar/categories', async () => {
  return {
    useCategories: () => ({
      setCurrentCategory: vi.fn(),
      categories: [{ id: 'c1', name: 'Cat 1', color: '#fff', order: 0 }],
    }),
  } as any;
});

vi.mock('opencc-js', () => {
  return {
    OpenCC: {
      Converter: ({ from, to }: { from: string; to: string }) => {
        if (from === 'cn' && to === 'tw') {
          return (input: string) =>
            input.replace(/网站/g, '網站').replace(/优化/g, '優化');
        }
        if (from === 'tw' && to === 'cn') {
          return (input: string) =>
            input.replace(/網站/g, '网站').replace(/優化/g, '优化');
        }
        return (input: string) => input;
      },
    },
  };
});

function setupChromeStub() {
  const g: any = globalThis as any;
  if (!g.chrome) g.chrome = {} as any;
  if (!g.chrome.storage) g.chrome.storage = {} as any;
  if (!g.chrome.storage.local)
    g.chrome.storage.local = {
      get: (defaults: any, cb: (res: any) => void) => cb({ ...defaults }),
      set: (_items: any, _cb?: () => void) => _cb?.(),
      clear: (_cb?: () => void) => _cb?.(),
    } as any;
}

let observers: any[] = [];

class MockIntersectionObserver {
  private cb: (entries: Array<{ isIntersecting: boolean }>) => void;
  private target: Element | null = null;
  constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
    this.cb = cb;
    observers.push(this);
  }
  observe(target: Element) {
    this.target = target;
  }
  disconnect() {}
  trigger(isIntersecting = true) {
    this.cb([{ isIntersecting }]);
  }
}

describe('SearchBox opencc + load more', () => {
  beforeEach(() => {
    setupChromeStub();
    observers = [];
    (globalThis as any).IntersectionObserver = MockIntersectionObserver;
  });

  it('matches simplified query against traditional data', async () => {
    mockItems = [
      {
        id: 'w1',
        title: '網站優化',
        url: 'https://example.com',
        category: 'c1',
        subcategoryId: 'g1',
        favicon: '',
      },
    ];

    render(<SearchBox />);

    const openBtn = screen.getByRole('button', { name: /open search/i });
    fireEvent.click(openBtn);

    const input = await screen.findByRole('textbox');
    fireEvent.change(input, { target: { value: '网站优化' } });

    const result = await screen.findByRole('button', { name: /網站優化/i });
    expect(result).toBeTruthy();
  });

  it('auto loads more when near bottom', async () => {
    mockItems = Array.from({ length: 25 }, (_v, i) => ({
      id: `w_${i + 1}`,
      title: `Test Item ${i + 1}`,
      url: `https://example.com/${i + 1}`,
      category: 'c1',
      subcategoryId: 'g1',
      favicon: '',
    }));

    render(<SearchBox />);

    const openBtn = screen.getByRole('button', { name: /open search/i });
    fireEvent.click(openBtn);

    const input = await screen.findByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    const firstBatch = await screen.findAllByRole('button', { name: /test item/i });
    expect(firstBatch.length).toBe(20);

    await act(async () => {
      const observer = observers[observers.length - 1];
      observer?.trigger(true);
    });

    const secondBatch = await screen.findAllByRole('button', { name: /test item/i });
    expect(secondBatch.length).toBe(25);
  });
});
