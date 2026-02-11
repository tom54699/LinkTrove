import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { CardRow } from '../CardRow';
import type { WebpageCardData } from '../WebpageCard';
import { TobyLikeCard } from '../TobyLikeCard';

// Mock TobyLikeCard
vi.mock('../TobyLikeCard', () => ({
  TobyLikeCard: vi.fn(({ title }) => <div data-testid="toby-card">{title}</div>),
}));

const MockedTobyLikeCard = vi.mocked(TobyLikeCard);

describe('CardRow', () => {
  const mockItem: WebpageCardData = {
    id: 'test-1',
    title: 'Test Card',
    description: 'Test description',
    url: 'https://example.com',
    favicon: 'https://example.com/favicon.ico',
    category: 'cat-1',
    subcategory: 'sub-1',
    order: 0,
    meta: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockHandlers = {
    onToggleSelect: vi.fn(),
    onOpen: vi.fn(),
    onDelete: vi.fn(),
    onUpdateTitle: vi.fn(),
    onUpdateUrl: vi.fn(),
    onUpdateDescription: vi.fn(),
    onUpdateMeta: vi.fn(),
    onModalOpenChange: vi.fn(),
    onSave: vi.fn(),
  };

  it('should be wrapped with React.memo', () => {
    // React.memo 包裹的組件會有特殊的 $$typeof
    expect(CardRow.$$typeof).toBe(Symbol.for('react.memo'));
  });

  it('should render TobyLikeCard with correct props', () => {
    const { getByTestId } = render(
      <CardRow
        item={mockItem}
        selected={false}
        ghost={false}
        {...mockHandlers}
      />
    );

    expect(getByTestId('toby-card')).toHaveTextContent('Test Card');
  });

  it('should create stable callbacks that bind item.id', () => {
    MockedTobyLikeCard.mockClear();

    render(
      <CardRow
        item={mockItem}
        selected={false}
        ghost={false}
        {...mockHandlers}
      />
    );

    // 獲取傳給 TobyLikeCard 的 props
    const passedProps = MockedTobyLikeCard.mock.calls[0][0];

    // 調用 onToggleSelect callback
    passedProps.onToggleSelect();
    expect(mockHandlers.onToggleSelect).toHaveBeenCalledWith('test-1');

    // 調用 onOpen callback
    passedProps.onOpen({ ctrlKey: true });
    expect(mockHandlers.onOpen).toHaveBeenCalledWith('test-1', { ctrlKey: true });

    // 調用 onDelete callback
    passedProps.onDelete();
    expect(mockHandlers.onDelete).toHaveBeenCalledWith('test-1');

    // 調用 onUpdateTitle callback
    passedProps.onUpdateTitle('New Title');
    expect(mockHandlers.onUpdateTitle).toHaveBeenCalledWith('test-1', 'New Title');
  });

  it('should compute faviconText from URL', () => {
    MockedTobyLikeCard.mockClear();

    const itemWithUrl = { ...mockItem, url: 'https://www.github.com/test' };

    render(
      <CardRow
        item={itemWithUrl}
        selected={false}
        ghost={false}
        {...mockHandlers}
      />
    );

    const passedProps = MockedTobyLikeCard.mock.calls[0][0];
    expect(passedProps.faviconText).toBe('GI'); // "github.com" -> "GI"
  });

  it('should use fallback faviconText when URL is empty', () => {
    MockedTobyLikeCard.mockClear();

    const itemWithoutUrl = { ...mockItem, url: '' };

    render(
      <CardRow
        item={itemWithoutUrl}
        selected={false}
        ghost={false}
        {...mockHandlers}
      />
    );

    const passedProps = MockedTobyLikeCard.mock.calls[0][0];
    expect(passedProps.faviconText).toBe('WW'); // fallback
  });

  it('should not re-render when props are stable', () => {
    MockedTobyLikeCard.mockClear();

    const { rerender } = render(
      <CardRow
        item={mockItem}
        selected={false}
        ghost={false}
        {...mockHandlers}
      />
    );

    const initialRenderCount = MockedTobyLikeCard.mock.calls.length;
    expect(initialRenderCount).toBe(1);

    // Rerender with same props
    rerender(
      <CardRow
        item={mockItem}
        selected={false}
        ghost={false}
        {...mockHandlers}
      />
    );

    // React.memo should prevent re-render
    expect(MockedTobyLikeCard.mock.calls.length).toBe(initialRenderCount);
  });

  it('should re-render when item changes', () => {
    MockedTobyLikeCard.mockClear();

    const { rerender } = render(
      <CardRow
        item={mockItem}
        selected={false}
        ghost={false}
        {...mockHandlers}
      />
    );

    expect(MockedTobyLikeCard.mock.calls.length).toBe(1);

    // Rerender with different item
    const updatedItem = { ...mockItem, title: 'Updated Title' };
    rerender(
      <CardRow
        item={updatedItem}
        selected={false}
        ghost={false}
        {...mockHandlers}
      />
    );

    // Should re-render because item changed
    expect(MockedTobyLikeCard.mock.calls.length).toBe(2);
    expect(MockedTobyLikeCard.mock.calls[1][0].title).toBe('Updated Title');
  });

  it('should re-render when selected changes', () => {
    MockedTobyLikeCard.mockClear();

    const { rerender } = render(
      <CardRow
        item={mockItem}
        selected={false}
        ghost={false}
        {...mockHandlers}
      />
    );

    expect(MockedTobyLikeCard.mock.calls.length).toBe(1);

    // Rerender with different selected
    rerender(
      <CardRow
        item={mockItem}
        selected={true}
        ghost={false}
        {...mockHandlers}
      />
    );

    // Should re-render because selected changed
    expect(MockedTobyLikeCard.mock.calls.length).toBe(2);
    expect(MockedTobyLikeCard.mock.calls[1][0].selected).toBe(true);
  });
});
