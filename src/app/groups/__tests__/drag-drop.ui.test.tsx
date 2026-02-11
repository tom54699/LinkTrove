import React from 'react';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: any }) => children,
  LANGUAGE_OPTIONS: [],
}));

// Mocks
vi.mock('../../sidebar/categories', () => ({
  useCategories: () => ({
    categories: [{ id: 'c1', name: 'C1', color: '#888', order: 0 }],
    selectedId: 'c1',
    actions: {},
    setCurrentCategory: () => {},
  }),
}));

const loadSpy = vi.fn();
const addFromTabSpy = vi.fn();
const updateCategorySpy = vi.fn();
const reorderSpy = vi.fn();
const moveToEndSpy = vi.fn();
const moveCardToGroupSpy = vi.fn();

vi.mock('../../webpages/WebpagesProvider', () => ({
  useWebpages: () => ({
    items: [],
    actions: {
      load: loadSpy,
      addFromTab: addFromTabSpy,
      updateCategory: updateCategorySpy,
      reorder: reorderSpy,
      moveToEnd: moveToEndSpy,
      moveCardToGroup: moveCardToGroupSpy,
      deleteMany: vi.fn(),
      deleteOne: vi.fn(),
      updateDescription: vi.fn(),
      updateCard: vi.fn(),
      updateTitle: vi.fn(),
      updateUrl: vi.fn(),
      updateMeta: vi.fn(),
    },
  }),
}));

const updateCardSubcategorySpy = vi.fn();
const listSubcategoriesMock = vi.fn(async () => [
  { id: 'g1', categoryId: 'c1', name: 'group', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
]);

vi.mock('../../../background/storageService', () => ({
  createStorageService: () => ({
    listSubcategories: listSubcategoriesMock,
    updateCardSubcategory: updateCardSubcategorySpy,
  }),
}));

// Component under test
import { GroupsView } from '../GroupsView';

function makeDataTransfer(data: Record<string, string>) {
  return {
    getData: (type: string) => data[type] || '',
    setData: vi.fn(),
    types: Object.keys(data),
    dropEffect: 'move',
  } as any;
}

describe('GroupsView drag-and-drop (UI)', () => {
  beforeEach(() => {
    loadSpy.mockReset();
    addFromTabSpy.mockReset();
    updateCategorySpy.mockReset();
    reorderSpy.mockReset();
    moveToEndSpy.mockReset();
    moveCardToGroupSpy.mockReset();
    updateCardSubcategorySpy.mockReset();
    listSubcategoriesMock.mockClear();
  });

  it('adds a new card with group info when dropping a tab into CardGrid', async () => {
    render(<GroupsView categoryId="c1" />);
    // 等待 group 載入
    await screen.findByText('group');
    const dropZone = await screen.findByLabelText(/drop zone/i);
    const tabPayload = JSON.stringify({ id: 99, title: 'Ex', url: 'https://ex.com' });
    const dt = makeDataTransfer({ 'application/x-linktrove-tab': tabPayload });
    fireEvent.dragEnter(dropZone, { dataTransfer: dt });
    fireEvent.dragOver(dropZone, { dataTransfer: dt });
    fireEvent.drop(dropZone, { dataTransfer: dt });
    await waitFor(() => expect(addFromTabSpy).toHaveBeenCalled());
    expect(addFromTabSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 99, title: 'Ex', url: 'https://ex.com' }),
      expect.objectContaining({ categoryId: 'c1', subcategoryId: 'g1', beforeId: undefined })
    );
    expect(moveCardToGroupSpy).not.toHaveBeenCalled();
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('handles drop on header', async () => {
    render(<GroupsView categoryId="c1" />);
    const header = await screen.findByText('group');
    const tabPayload = JSON.stringify({ id: 1, title: 'Ex', url: 'https://ex.com' });
    const dt = makeDataTransfer({ 'application/x-linktrove-tab': tabPayload });
    // 嘗試對 header 派 drop，不應觸發 addTabToGroup 或 fallback
    fireEvent.drop(header, { dataTransfer: dt });
    await new Promise((r) => setTimeout(r, 10));
    expect(addFromTabSpy).toHaveBeenCalled();
  });

  it('moves existing card via moveCardToGroup when dropping into CardGrid', async () => {
    render(<GroupsView categoryId="c1" />);
    await screen.findByText('group');
    const dropZone = await screen.findByLabelText(/drop zone/i);
    const dt = makeDataTransfer({ 'application/x-linktrove-webpage': 'w2' });
    fireEvent.drop(dropZone, { dataTransfer: dt });
    await waitFor(() =>
      expect(moveCardToGroupSpy).toHaveBeenCalledWith('w2', 'c1', 'g1', '__END__')
    );
  });
});
