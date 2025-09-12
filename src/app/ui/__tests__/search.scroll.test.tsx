import { describe, it, expect, vi } from 'vitest';
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

describe('SearchBox scrolls to card and highlights', () => {
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

    const input = screen.getByLabelText('Search') as HTMLInputElement;
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
    expect(
      card?.classList.contains('ring-2') ||
        card?.classList.contains('outline')
    ).toBe(true);
  });
});

