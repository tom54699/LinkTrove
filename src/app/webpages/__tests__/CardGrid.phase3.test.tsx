import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { CardGrid } from '../CardGrid';
import type { WebpageCardData } from '../WebpageCard';
import { TobyLikeCard } from '../TobyLikeCard';
import { CardRow } from '../CardRow';

// Mock dependencies
vi.mock('../TobyLikeCard', () => ({
  TobyLikeCard: vi.fn(() => <div data-testid="toby-card">Card</div>),
}));

vi.mock('../CardRow', () => ({
  CardRow: vi.fn(() => <div data-testid="card-row">Row</div>),
}));

const MockedTobyLikeCard = vi.mocked(TobyLikeCard);
const MockedCardRow = vi.mocked(CardRow);

vi.mock('../../ui/feedback', () => ({
  useFeedback: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string, args?: any[]) => {
      if (args) return `${key}:${args.join(',')}`;
      return key;
    },
  }),
}));

vi.mock('../../dnd/dragContext', () => ({
  getDragTab: vi.fn(),
  getDragWebpage: vi.fn(),
  setDragWebpage: vi.fn(),
  broadcastGhostActive: vi.fn(),
}));

describe('CardGrid - Phase 3 useCallback optimization', () => {
  const mockItems: WebpageCardData[] = [
    {
      id: 'card-1',
      title: 'Card 1',
      description: 'Description 1',
      url: 'https://example.com/1',
      favicon: 'https://example.com/favicon1.ico',
      category: 'cat-1',
      subcategory: 'sub-1',
      order: 0,
      meta: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'card-2',
      title: 'Card 2',
      description: 'Description 2',
      url: 'https://example.com/2',
      favicon: 'https://example.com/favicon2.ico',
      category: 'cat-1',
      subcategory: 'sub-1',
      order: 1,
      meta: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const mockHandlers = {
    onDropTab: vi.fn(),
    onDeleteMany: vi.fn(),
    onDeleteOne: vi.fn(),
    onEditDescription: vi.fn(),
    onSave: vi.fn(),
    onDropExistingCard: vi.fn(),
    onUpdateTitle: vi.fn(),
    onUpdateUrl: vi.fn(),
    onUpdateCategory: vi.fn(),
    onUpdateMeta: vi.fn(),
    onMoveCardToGroup: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass stable handler references to CardRow', () => {
    MockedCardRow.mockClear();

    const { rerender } = render(
      <CardGrid
        groupId="group-1"
        items={mockItems}
        {...mockHandlers}
      />
    );

    // Get first render handlers
    const firstCallProps = MockedCardRow.mock.calls[0]?.[0];
    const firstHandlers = {
      onToggleSelect: firstCallProps?.onToggleSelect,
      onOpen: firstCallProps?.onOpen,
      onDelete: firstCallProps?.onDelete,
      onUpdateTitle: firstCallProps?.onUpdateTitle,
      onUpdateUrl: firstCallProps?.onUpdateUrl,
      onUpdateDescription: firstCallProps?.onUpdateDescription,
      onUpdateMeta: firstCallProps?.onUpdateMeta,
      onSave: firstCallProps?.onSave,
    };

    // Force re-render by updating a prop
    rerender(
      <CardGrid
        groupId="group-1"
        items={mockItems}
        {...mockHandlers}
      />
    );

    // Get second render handlers
    const secondCallProps = MockedCardRow.mock.calls[2]?.[0]; // 第3次調用 (0-indexed)
    const secondHandlers = {
      onToggleSelect: secondCallProps?.onToggleSelect,
      onOpen: secondCallProps?.onOpen,
      onDelete: secondCallProps?.onDelete,
      onUpdateTitle: secondCallProps?.onUpdateTitle,
      onUpdateUrl: secondCallProps?.onUpdateUrl,
      onUpdateDescription: secondCallProps?.onUpdateDescription,
      onUpdateMeta: secondCallProps?.onUpdateMeta,
      onSave: secondCallProps?.onSave,
    };

    // Handlers should have stable references (same function objects)
    expect(firstHandlers.onToggleSelect).toBe(secondHandlers.onToggleSelect);
    expect(firstHandlers.onOpen).toBe(secondHandlers.onOpen);
    expect(firstHandlers.onDelete).toBe(secondHandlers.onDelete);
    expect(firstHandlers.onUpdateTitle).toBe(secondHandlers.onUpdateTitle);
    expect(firstHandlers.onUpdateUrl).toBe(secondHandlers.onUpdateUrl);
    expect(firstHandlers.onUpdateDescription).toBe(secondHandlers.onUpdateDescription);
    expect(firstHandlers.onUpdateMeta).toBe(secondHandlers.onUpdateMeta);
    expect(firstHandlers.onSave).toBe(secondHandlers.onSave);
  });

  it('should call onDeleteOne when handleDelete is invoked', () => {
    MockedCardRow.mockClear();

    render(
      <CardGrid
        groupId="group-1"
        items={mockItems}
        {...mockHandlers}
      />
    );

    // Get the handleDelete callback passed to CardRow
    const cardRowProps = MockedCardRow.mock.calls[0][0];
    const handleDelete = cardRowProps.onDelete;

    // Invoke handleDelete with an id
    handleDelete('card-1');

    // Should call onDeleteOne with the same id
    expect(mockHandlers.onDeleteOne).toHaveBeenCalledWith('card-1');
  });

  it('should call onUpdateTitle when handleUpdateTitle is invoked', () => {
    MockedCardRow.mockClear();

    render(
      <CardGrid
        groupId="group-1"
        items={mockItems}
        {...mockHandlers}
      />
    );

    const cardRowProps = MockedCardRow.mock.calls[0][0];
    const handleUpdateTitle = cardRowProps.onUpdateTitle;

    handleUpdateTitle('card-1', 'New Title');

    expect(mockHandlers.onUpdateTitle).toHaveBeenCalledWith('card-1', 'New Title');
  });

  it('should call onUpdateUrl when handleUpdateUrl is invoked', () => {
    MockedCardRow.mockClear();

    render(
      <CardGrid
        groupId="group-1"
        items={mockItems}
        {...mockHandlers}
      />
    );

    const cardRowProps = MockedCardRow.mock.calls[0][0];
    const handleUpdateUrl = cardRowProps.onUpdateUrl;

    handleUpdateUrl('card-1', 'https://new-url.com');

    expect(mockHandlers.onUpdateUrl).toHaveBeenCalledWith('card-1', 'https://new-url.com');
  });

  it('should call onEditDescription when handleUpdateDescription is invoked', () => {
    MockedCardRow.mockClear();

    render(
      <CardGrid
        groupId="group-1"
        items={mockItems}
        {...mockHandlers}
      />
    );

    const cardRowProps = MockedCardRow.mock.calls[0][0];
    const handleUpdateDescription = cardRowProps.onUpdateDescription;

    handleUpdateDescription('card-1', 'New description');

    expect(mockHandlers.onEditDescription).toHaveBeenCalledWith('card-1', 'New description');
  });

  it('should call onUpdateMeta when handleUpdateMeta is invoked', () => {
    MockedCardRow.mockClear();

    render(
      <CardGrid
        groupId="group-1"
        items={mockItems}
        {...mockHandlers}
      />
    );

    const cardRowProps = MockedCardRow.mock.calls[0][0];
    const handleUpdateMeta = cardRowProps.onUpdateMeta;

    const newMeta = { key: 'value' };
    handleUpdateMeta('card-1', newMeta);

    expect(mockHandlers.onUpdateMeta).toHaveBeenCalledWith('card-1', newMeta);
  });

  it('should call onSave when handleSave is invoked with onSave prop', () => {
    MockedCardRow.mockClear();

    render(
      <CardGrid
        groupId="group-1"
        items={mockItems}
        {...mockHandlers}
      />
    );

    const cardRowProps = MockedCardRow.mock.calls[0][0];
    const handleSave = cardRowProps.onSave;

    const patch = { title: 'Updated Title' };
    handleSave('card-1', patch);

    expect(mockHandlers.onSave).toHaveBeenCalledWith('card-1', patch);
  });

  it('should use fallback logic in handleSave when onSave is not provided', () => {
    MockedCardRow.mockClear();

    const handlersWithoutSave = { ...mockHandlers, onSave: undefined };

    render(
      <CardGrid
        groupId="group-1"
        items={mockItems}
        {...handlersWithoutSave}
      />
    );

    const cardRowProps = MockedCardRow.mock.calls[0][0];
    const handleSave = cardRowProps.onSave;

    const patch = {
      title: 'Updated Title',
      url: 'https://updated.com',
      description: 'Updated description',
      meta: { key: 'value' },
    };
    handleSave('card-1', patch);

    // Should call individual update handlers
    expect(mockHandlers.onUpdateTitle).toHaveBeenCalledWith('card-1', 'Updated Title');
    expect(mockHandlers.onUpdateUrl).toHaveBeenCalledWith('card-1', 'https://updated.com');
    expect(mockHandlers.onEditDescription).toHaveBeenCalledWith('card-1', 'Updated description');
    expect(mockHandlers.onUpdateMeta).toHaveBeenCalledWith('card-1', { key: 'value' });
  });

  it('should update handler references when dependencies change', () => {
    MockedCardRow.mockClear();

    const { rerender } = render(
      <CardGrid
        groupId="group-1"
        items={mockItems}
        {...mockHandlers}
      />
    );

    const firstCallProps = MockedCardRow.mock.calls[0][0];
    const firstHandleOpen = firstCallProps.onOpen;

    // Update items (handleOpen depends on items)
    const updatedItems = [...mockItems, {
      id: 'card-3',
      title: 'Card 3',
      description: 'Description 3',
      url: 'https://example.com/3',
      favicon: 'https://example.com/favicon3.ico',
      category: 'cat-1',
      subcategory: 'sub-1',
      order: 2,
      meta: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }];

    rerender(
      <CardGrid
        groupId="group-1"
        items={updatedItems}
        {...mockHandlers}
      />
    );

    const secondCallProps = MockedCardRow.mock.calls[3][0]; // 第4次調用 (新增了一張卡)
    const secondHandleOpen = secondCallProps.onOpen;

    // handleOpen should have new reference because items changed
    expect(firstHandleOpen).not.toBe(secondHandleOpen);
  });
});
