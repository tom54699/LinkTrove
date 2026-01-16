import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchBox } from '../SearchBox';

vi.mock('../../webpages/WebpagesProvider', async () => {
  return {
    useWebpages: () => ({
      items: [
        { id: 'w_1', title: 'Hello World', url: 'https://example.com', category: 'c1', subcategoryId: 'g1', favicon: '' },
      ],
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

describe('SearchBox scrolls to card and highlights', () => {
  beforeEach(() => {
    setupChromeStub();
  });

  it('expands and scrolls to the matched card', async () => {
    const container = document.createElement('div');
    // Simulate content area scroll container
    container.setAttribute('aria-label', 'Content Area');
    Object.assign(container.style, { overflowY: 'auto', height: '300px' });
    // Make scrollTo spy
    const scrollSpy = vi.fn();
    (container as any).scrollTo = scrollSpy;
    document.body.appendChild(container);

    render(<SearchBox />, { container });

    const openBtn = screen.getByRole('button', { name: /open search/i });
    fireEvent.click(openBtn);
    const input = await screen.findByRole('textbox');
    fireEvent.change(input, { target: { value: 'hello' } });

    // Click the first result
    const btn = await screen.findByRole('button', { name: /hello world/i });

    // Defer creation of the target card to simulate async render
    setTimeout(() => {
      const card = document.createElement('div');
      card.id = 'card-w_1';
      // Give it some size and position by inserting after some spacer
      const spacer = document.createElement('div');
      spacer.style.height = '1000px';
      container.appendChild(spacer);
      container.appendChild(card);
    }, 50);

    await act(async () => {
      fireEvent.click(btn);
    });

    // Wait a bit for retry loop
    await new Promise((r) => setTimeout(r, 600));

    // Expect scroll called at least once
    expect(scrollSpy).toHaveBeenCalled();

    // And card should have highlight classes eventually
    const card = container.querySelector('#card-w_1') as HTMLElement | null;
    expect(card).toBeTruthy();
    expect(card?.style.outline).toContain('2px solid');
  });
});
