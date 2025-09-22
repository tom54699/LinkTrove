import React from 'react';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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

vi.mock('../../webpages/WebpagesProvider', () => ({
  useWebpages: () => ({
    items: [],
    actions: {
      load: loadSpy,
      addFromTab: addFromTabSpy,
      updateCategory: updateCategorySpy,
      reorder: reorderSpy,
      moveToEnd: moveToEndSpy,
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

const addTabToGroupSpy = vi.fn();
vi.mock('../../../background/webpageService', () => ({
  createWebpageService: () => ({
    addTabToGroup: addTabToGroupSpy,
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
    updateCardSubcategorySpy.mockReset();
    listSubcategoriesMock.mockClear();
    addTabToGroupSpy.mockReset();
  });

  it('uses atomic API addTabToGroup when dropping a tab into CardGrid', async () => {
    addTabToGroupSpy.mockResolvedValue({ id: 'w1', category: 'c1', subcategoryId: 'g1', url: 'https://ex.com/' });
    render(<GroupsView categoryId="c1" />);
    // 等待 group 載入
    await screen.findByText('group');
    const dropZone = await screen.findByTestId('drop-zone');
    const tabPayload = JSON.stringify({ id: 99, title: 'Ex', url: 'https://ex.com' });
    const dt = makeDataTransfer({ 'application/x-linktrove-tab': tabPayload });
    fireEvent.dragEnter(dropZone, { dataTransfer: dt });
    fireEvent.dragOver(dropZone, { dataTransfer: dt });
    fireEvent.drop(dropZone, { dataTransfer: dt });
    await waitFor(() => expect(addTabToGroupSpy).toHaveBeenCalled());
    // 應帶入目標 collection/group
    const args = addTabToGroupSpy.mock.calls[0];
    expect(args[1]).toBe('c1');
    expect(args[2]).toBe('g1');
    // 完成後會 load 一次
    await waitFor(() => expect(loadSpy).toHaveBeenCalled());
    // 不走 fallback
    expect(addFromTabSpy).not.toHaveBeenCalled();
  });

  it('does not handle drop on header anymore', async () => {
    addTabToGroupSpy.mockResolvedValue({ id: 'w1', category: 'c1', subcategoryId: 'g1', url: 'https://ex.com/' });
    render(<GroupsView categoryId="c1" />);
    const header = await screen.findByText('group');
    const tabPayload = JSON.stringify({ id: 1, title: 'Ex', url: 'https://ex.com' });
    const dt = makeDataTransfer({ 'application/x-linktrove-tab': tabPayload });
    // 嘗試對 header 派 drop，不應觸發 addTabToGroup 或 fallback
    fireEvent.drop(header, { dataTransfer: dt });
    await new Promise((r) => setTimeout(r, 10));
    expect(addTabToGroupSpy).not.toHaveBeenCalled();
    expect(addFromTabSpy).not.toHaveBeenCalled();
  });

  it('falls back to legacy flow when atomic API is unavailable', async () => {
    // 改變 mock：讓 atomic 不存在
    const mod = await import('../../../background/webpageService');
    (mod as any).createWebpageService = () => ({}) as any;

    render(<GroupsView categoryId="c1" />);
    await screen.findByText('group');
    const dropZone = await screen.findByTestId('drop-zone');
    const tabPayload = JSON.stringify({ id: 42, title: 'Ex2', url: 'https://ex2.com' });
    const dt = makeDataTransfer({ 'application/x-linktrove-tab': tabPayload });
    fireEvent.drop(dropZone, { dataTransfer: dt });
    // 走舊流程：addFromTab → updateCategory → updateCardSubcategory
    await waitFor(() => expect(addFromTabSpy).toHaveBeenCalled());
  });
});

