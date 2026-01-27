import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

import { WebpagesProvider, useWebpages } from '../WebpagesProvider';
import type { TabItemData } from '../../tabs/types';

const metaFixture = {
  description: 'Auto Desc',
  siteName: 'AutoSite',
  author: 'AutoAuthor',
  bookTitle: '書名A',
  serialStatus: '連載中',
  genre: '奇幻',
  wordCount: '123456',
  latestChapter: '第10章 測試',
  coverImage: 'https://img.example/cover.jpg',
  bookUrl: 'https://example.com/book',
  lastUpdate: '2025-01-02T03:04:05.000Z',
};

vi.mock('../../../background/pageMeta', () => ({
  waitForTabComplete: vi.fn(async () => {}),
  extractMetaForTab: vi.fn(async () => metaFixture),
}));

function flushPromises() {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 0);
  });
}

type MockOptions = {
  withTemplateFields?: boolean;
};

function createMockService({ withTemplateFields = true }: MockOptions = {}) {
  const data: any[] = [];
  const categories = [
    {
      id: 'c1',
      name: 'Bookmarks',
      color: '#111',
      order: 0,
      defaultTemplateId: withTemplateFields ? 'tpl-1' : undefined,
    },
  ];
  const templates = withTemplateFields
    ? [
        {
          id: 'tpl-1',
          name: 'Book Template',
          fields: [
            { key: 'siteName', type: 'text' },
            { key: 'author', type: 'text' },
          ],
        },
      ]
    : [];

  const service: any = {
    async addWebpageFromTab(tab: TabItemData & { url: string }) {
      const now = new Date().toISOString();
      const item = {
        id: `w_${Math.random().toString(36).slice(2, 11)}`,
        title: tab.title ?? 'Untitled',
        url: tab.url,
        favicon: tab.favIconUrl ?? '',
        note: '',
        category: 'c1',
        subcategoryId: undefined,
        meta: {},
        createdAt: now,
        updatedAt: now,
      };
      data.unshift(item);
      return item;
    },
    async updateWebpage(id: string, patch: any) {
      const idx = data.findIndex((w) => w.id === id);
      if (idx === -1) throw new Error('not found');
      const prev = data[idx];
      const next = {
        ...prev,
        ...patch,
        note: patch.note !== undefined ? patch.note : prev.note,
        meta: patch.meta !== undefined ? { ...patch.meta } : prev.meta,
        updatedAt: new Date().toISOString(),
      };
      data[idx] = next;
      return next;
    },
    async deleteWebpage() {},
    async loadWebpages() {
      return data;
    },
    async reorderWebpages() {
      return data;
    },
    async moveWebpageToEnd() {
      return data;
    },
    async moveCardToGroup() {
      return data;
    },
    async loadFromSync() {
      return categories;
    },
    async loadTemplates() {
      return templates;
    },
  };

  return { service, data };
}

describe('WebpagesProvider.addFromTab meta enrichment', () => {
beforeEach(() => {
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: (_req: any, cb: (res: any) => void) => cb({}),
        set: () => {},
      },
    },
  };
  vi.clearAllMocks();
});

afterEach(() => {
  delete (globalThis as any).chrome;
  vi.restoreAllMocks();
});

  it('fills all available meta fields regardless of template', async () => {
    const { service } = createMockService({ withTemplateFields: true });
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <WebpagesProvider svc={service}>{children}</WebpagesProvider>
    );

    const { result } = renderHook(() => useWebpages(), { wrapper });

    let createdId = '';
    await act(async () => {
      createdId = await result.current.actions.addFromTab({
        id: 42,
        url: 'https://example.com/page',
        title: 'Example',
      } as TabItemData);
    });

    await act(async () => {
      await flushPromises();
      await flushPromises();
      await new Promise(resolve => setTimeout(resolve, 100)); // Additional wait for async enrichment
      await flushPromises();
    });

    const card = result.current.items.find((it) => it.id === createdId);
    expect(card).toBeTruthy();
    expect(card?.description).toBe(metaFixture.description);
    expect(card?.meta).toMatchObject({
      // All fields should be filled regardless of template
      siteName: metaFixture.siteName,
      author: metaFixture.author,
      bookTitle: metaFixture.bookTitle,
      serialStatus: metaFixture.serialStatus,
      genre: metaFixture.genre,
      wordCount: metaFixture.wordCount,
      latestChapter: metaFixture.latestChapter,
      coverImage: metaFixture.coverImage,
      bookUrl: metaFixture.bookUrl,
      lastUpdate: metaFixture.lastUpdate,
    });
  });

  it('fills all meta fields even when no template is attached', async () => {
    const { service } = createMockService({ withTemplateFields: false });
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <WebpagesProvider svc={service}>{children}</WebpagesProvider>
    );

    const { result } = renderHook(() => useWebpages(), { wrapper });

    let createdId = '';
    await act(async () => {
      createdId = await result.current.actions.addFromTab({
        id: 7,
        url: 'https://novel.example/book',
        title: 'Novel Page',
      } as TabItemData);
    });

    await act(async () => {
      await flushPromises();
      await flushPromises();
      await new Promise(resolve => setTimeout(resolve, 100)); // Additional wait for async enrichment
      await flushPromises();
    });

    const card = result.current.items.find((it) => it.id === createdId);
    expect(card).toBeTruthy();
    expect(card?.meta).toMatchObject({
      // All fields should be filled even without template
      siteName: metaFixture.siteName,
      author: metaFixture.author,
      bookTitle: metaFixture.bookTitle,
      serialStatus: metaFixture.serialStatus,
      genre: metaFixture.genre,
      wordCount: metaFixture.wordCount,
      latestChapter: metaFixture.latestChapter,
      coverImage: metaFixture.coverImage,
      bookUrl: metaFixture.bookUrl,
      lastUpdate: metaFixture.lastUpdate,
    });
  });
});
