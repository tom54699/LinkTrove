import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { WebpagesProvider, useWebpages } from '../WebpagesProvider';

vi.mock('../../sidebar/categories', () => ({
  useCategories: () => ({
    selectedId: 'c1',
    categories: [],
    actions: {},
  }),
}));

type MockWebpage = {
  id: string;
  title: string;
  url: string;
  favicon: string;
  note: string;
  category: string;
  subcategoryId?: string;
  meta: Record<string, string>;
  templateId?: string;
  templateData?: any;
};

const makeItem = (id: string, category = 'c1', groupId = 'g1'): MockWebpage => ({
  id,
  title: `Title ${id}`,
  url: `https://example.com/${id}`,
  favicon: '',
  note: '',
  category,
  subcategoryId: groupId,
  meta: {},
});

let onChangedListener: ((changes: any, areaName: string) => void) | null = null;

beforeEach(() => {
  onChangedListener = null;
  (globalThis as any).chrome = {
    storage: {
      onChanged: {
        addListener: vi.fn((cb: any) => {
          onChangedListener = cb;
        }),
        removeListener: vi.fn(),
      },
    },
  };
});

afterEach(() => {
  delete (globalThis as any).chrome;
});

describe('WebpagesProvider.moveCardToGroup', () => {
  it('updates items from service response without extra load', async () => {
    const loadWebpages = vi.fn(async () => [makeItem('w0')]);
    const moveCardToGroup = vi.fn(async () => [makeItem('w1')]);
    const service = {
      loadWebpages,
      moveCardToGroup,
    } as any;

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <WebpagesProvider svc={service}>{children}</WebpagesProvider>
    );

    const { result } = renderHook(() => useWebpages(), { wrapper });

    await waitFor(() => expect(loadWebpages).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.actions.moveCardToGroup('w1', 'c1', 'g1');
    });

    expect(moveCardToGroup).toHaveBeenCalledWith('w1', 'c1', 'g1', undefined);
    expect(loadWebpages).toHaveBeenCalledTimes(1);
    expect(result.current.items.map((item) => item.id)).toEqual(['w1']);
  });

  it('skips load when storage change happens within lock window', async () => {
    const loadWebpages = vi.fn(async () => [makeItem('w0')]);
    const moveCardToGroup = vi.fn(async () => [makeItem('w2')]);
    const service = {
      loadWebpages,
      moveCardToGroup,
    } as any;

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <WebpagesProvider svc={service}>{children}</WebpagesProvider>
    );

    const { result } = renderHook(() => useWebpages(), { wrapper });

    await waitFor(() => expect(loadWebpages).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.actions.moveCardToGroup('w2', 'c1', 'g1');
    });

    expect(onChangedListener).toBeTruthy();
    act(() => {
      onChangedListener?.({ webpages: { newValue: [] } }, 'local');
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(loadWebpages).toHaveBeenCalledTimes(1);
  });
});
