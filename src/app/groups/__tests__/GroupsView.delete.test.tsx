import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { GroupsView } from '../GroupsView';
import { putAll, getAll, tx } from '../../../background/idb/db';

// Mock dependencies
const showToastMock = vi.fn();

vi.mock('../../sidebar/categories', () => ({
  useCategories: () => ({
    categories: [{ id: 'c1', name: 'Collection 1', color: '#888', order: 0, organizationId: 'o_default' }],
    selectedId: 'c1',
    actions: {},
    setCurrentCategory: () => {},
  }),
}));

vi.mock('../../webpages/WebpagesProvider', () => ({
  useWebpages: () => ({
    items: [],
    actions: {
      load: vi.fn(),
      deleteMany: vi.fn(),
      deleteOne: vi.fn(),
      updateDescription: vi.fn(),
      updateCard: vi.fn(),
      updateTitle: vi.fn(),
      updateUrl: vi.fn(),
      updateMeta: vi.fn(),
      addFromTab: vi.fn(),
      updateCategory: vi.fn(),
      reorder: vi.fn(),
      moveToEnd: vi.fn(),
    },
  }),
}));

vi.mock('../../ui/feedback', () => ({
  useFeedback: () => ({
    showToast: showToastMock,
    setLoading: vi.fn(),
  }),
}));

const listSubcategoriesMock = vi.fn();
const deleteSubcategoryAndPagesMock = vi.fn();

vi.mock('../../../background/storageService', () => ({
  createStorageService: () => ({
    listSubcategories: (...args: any[]) => listSubcategoriesMock(...args),
    deleteSubcategoryAndPages: (...args: any[]) => deleteSubcategoryAndPagesMock(...args),
    deleteSubcategory: vi.fn(),
    renameSubcategory: vi.fn(),
    reorderSubcategories: vi.fn(),
    createSubcategory: vi.fn(),
  }),
}));

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

async function resetDb() {
  try {
    await new Promise((res, rej) => {
      const req = indexedDB.deleteDatabase('linktrove');
      req.onsuccess = () => res(null);
      req.onerror = () => rej(req.error);
    });
  } catch {}
}

describe('GroupsView Delete Protection', () => {
  beforeEach(async () => {
    await resetDb();
    setupChromeStub();
    showToastMock.mockClear();
    listSubcategoriesMock.mockReset();
    deleteSubcategoryAndPagesMock.mockReset();
    listSubcategoriesMock.mockImplementation(async (categoryId: string) => {
      const subs = (await getAll('subcategories' as any)) as any[];
      return subs.filter((s: any) => s.categoryId === categoryId);
    });
    deleteSubcategoryAndPagesMock.mockImplementation(async (id: string) => {
      await tx(['subcategories' as any, 'webpages'], 'readwrite', async (t) => {
        const ss = t.objectStore('subcategories' as any);
        const ws = t.objectStore('webpages');
        const webs: any[] = await new Promise((resolve, reject) => {
          const req = ws.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        for (const web of webs.filter((w: any) => w.subcategoryId === id)) {
          ws.delete(web.id);
        }
        ss.delete(id);
      });
    });
  });

  it('prevents deleting the last group in a collection', async () => {
    // Setup: category with only one group
    await putAll('categories', [
      { id: 'c1', name: 'Collection 1', color: '#888', order: 0, organizationId: 'o_default' },
    ] as any);

    await putAll('subcategories' as any, [
      { id: 'g1', categoryId: 'c1', name: 'Group 1', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);

    render(<GroupsView categoryId="c1" />);

    // Wait for group to load
    await waitFor(() => {
      expect(screen.getByText('Group 1')).toBeInTheDocument();
    });

    const moreButtons = screen.getAllByLabelText('更多操作');
    fireEvent.click(moreButtons[0]);

    const deleteOption = await screen.findByText('刪除');
    fireEvent.click(deleteOption);

    const dialog = await screen.findByRole('dialog');
    const confirmDelete = within(dialog).getByRole('button', { name: '刪除' });
    fireEvent.click(confirmDelete);

    // Should show error toast
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('刪除失敗：至少需要保留一個 Group', 'error');
    });

    // Group should still exist in database
    const groupsInDb = (await getAll('subcategories' as any)) as any[];
    expect(groupsInDb.length).toBe(1);
    expect(groupsInDb[0].id).toBe('g1');
  });

  it('allows deleting when multiple groups exist', async () => {
    await putAll('categories', [
      { id: 'c1', name: 'Collection 1', color: '#888', order: 0, organizationId: 'o_default' },
    ] as any);

    await putAll('subcategories' as any, [
      { id: 'g1', categoryId: 'c1', name: 'Group 1', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'g2', categoryId: 'c1', name: 'Group 2', order: 1, createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);

    render(<GroupsView categoryId="c1" />);

    await waitFor(() => {
      expect(screen.getByText('Group 1')).toBeInTheDocument();
      expect(screen.getByText('Group 2')).toBeInTheDocument();
    });

    const moreButtons = screen.getAllByLabelText('更多操作');
    fireEvent.click(moreButtons[0]);

    const deleteOption = await screen.findByText('刪除');
    fireEvent.click(deleteOption);

    const dialog = await screen.findByRole('dialog');
    const confirmDelete = within(dialog).getByRole('button', { name: '刪除' });
    fireEvent.click(confirmDelete);

    // Should show success toast
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('已刪除 Group 與其書籤', 'success');
    });

    // One group should be deleted
    await waitFor(async () => {
      const groupsInDb = (await getAll('subcategories' as any)) as any[];
      expect(groupsInDb.length).toBe(1);
    });
  });

  it('cascades delete to all webpages in the group', async () => {
    await putAll('categories', [
      { id: 'c1', name: 'Collection 1', color: '#888', order: 0, organizationId: 'o_default' },
    ] as any);

    await putAll('subcategories' as any, [
      { id: 'g1', categoryId: 'c1', name: 'Group 1', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'g2', categoryId: 'c1', name: 'Group 2', order: 1, createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);

    await putAll('webpages', [
      { id: 'w1', title: 'Web 1', url: 'https://a.com', category: 'c1', subcategoryId: 'g1', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'w2', title: 'Web 2', url: 'https://b.com', category: 'c1', subcategoryId: 'g1', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'w3', title: 'Web 3', url: 'https://c.com', category: 'c1', subcategoryId: 'g2', createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);

    render(<GroupsView categoryId="c1" />);

    await waitFor(() => {
      expect(screen.getByText('Group 1')).toBeInTheDocument();
    });

    const moreButtons = screen.getAllByLabelText('更多操作');
    fireEvent.click(moreButtons[0]);

    const deleteOption = await screen.findByText('刪除');
    fireEvent.click(deleteOption);

    const dialog = await screen.findByRole('dialog');
    const confirmDelete = within(dialog).getByRole('button', { name: '刪除' });
    fireEvent.click(confirmDelete);

    // Wait for deletion
    await waitFor(async () => {
      const groupsInDb = (await getAll('subcategories' as any)) as any[];
      expect(groupsInDb.length).toBe(1);
      expect(groupsInDb[0].id).toBe('g2');
    });

    // Verify webpages in g1 are deleted, but w3 in g2 remains
    const webpagesInDb = (await getAll('webpages')) as any[];
    expect(webpagesInDb.length).toBe(1);
    expect(webpagesInDb[0].id).toBe('w3');
    expect(webpagesInDb[0].subcategoryId).toBe('g2');
  });

  it('logs error to console when delete fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await putAll('categories', [
      { id: 'c1', name: 'Collection 1', color: '#888', order: 0, organizationId: 'o_default' },
    ] as any);

    await putAll('subcategories' as any, [
      { id: 'g1', categoryId: 'c1', name: 'Group 1', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'g2', categoryId: 'c1', name: 'Group 2', order: 1, createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);

    deleteSubcategoryAndPagesMock.mockRejectedValueOnce(new Error('Database error'));

    render(<GroupsView categoryId="c1" />);

    await waitFor(() => {
      expect(screen.getByText('Group 1')).toBeInTheDocument();
    });

    const moreButtons = screen.getAllByLabelText('更多操作');
    fireEvent.click(moreButtons[0]);

    const deleteOption = await screen.findByText('刪除');
    fireEvent.click(deleteOption);

    const dialog = await screen.findByRole('dialog');
    const confirmDelete = within(dialog).getByRole('button', { name: '刪除' });
    fireEvent.click(confirmDelete);

    // Should log error and show error toast
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Delete group error:', expect.any(Error));
    });

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('刪除失敗', 'error');
    });

    consoleErrorSpy.mockRestore();
  });
});
