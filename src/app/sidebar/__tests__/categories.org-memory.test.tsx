import React, { useEffect } from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { CategoriesProvider, useCategories } from '../categories';
import { OrgsCtx } from '../organizations';
import { createStorageService } from '../../../background/storageService';
import * as db from '../../../background/idb/db';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../background/storageService');
vi.mock('../../../background/idb/db');

describe('Categories Organization Memory', () => {
  let mockStorage: any;
  let mockSetMeta: any;
  let mockGetMeta: any;
  let mockTx: any;

  beforeEach(() => {
    mockStorage = {
      listSubcategories: vi.fn().mockResolvedValue([]),
      createSubcategory: vi.fn().mockResolvedValue({}),
      loadFromSync: vi.fn().mockResolvedValue([]),
    };
    (createStorageService as any).mockReturnValue(mockStorage);

    mockSetMeta = vi.fn();
    mockGetMeta = vi.fn();
    mockTx = vi.fn();
    (db.setMeta as any) = mockSetMeta;
    (db.getMeta as any) = mockGetMeta;
    (db.tx as any) = mockTx;

    // Mock chrome.storage.local
    const storageData: Record<string, any> = {};
    global.chrome = {
      storage: {
        local: {
          get: vi.fn((keys, cb) => {
            const result: any = {};
            if (Array.isArray(keys)) {
              keys.forEach(k => result[k] = storageData[k]);
            } else if (typeof keys === 'object') {
              Object.keys(keys).forEach(k => result[k] = storageData[k] ?? keys[k]);
            } else if (typeof keys === 'string') {
              result[keys] = storageData[keys];
            }
            cb(result);
          }),
          set: vi.fn((items, cb) => {
            Object.assign(storageData, items);
            if (cb) cb();
          }),
        },
      },
    } as any;
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    // Mock OrgsCtx to control selectedOrgId
    return (
      <OrgsCtx.Provider value={{
        organizations: [],
        selectedOrgId: 'org_A',
        setCurrentOrganization: vi.fn(),
        actions: {} as any
      }}>
        <CategoriesProvider>{children}</CategoriesProvider>
      </OrgsCtx.Provider>
    );
  };

  const TestConsumer = ({ onState }: { onState: (s: any) => void }) => {
    const state = useCategories();
    useEffect(() => {
      onState(state);
    }, [state, onState]);
    return null;
  };

  it('should remember selected category per organization', async () => {
    // Setup mock categories for Org A
    mockTx.mockResolvedValue([
      { id: 'cat_A1', name: 'Cat A1', organizationId: 'org_A', order: 0 },
      { id: 'cat_A2', name: 'Cat A2', organizationId: 'org_A', order: 1 },
    ]);

    let currentState: any = null;
    render(
      <Wrapper>
        <TestConsumer onState={(s) => currentState = s} />
      </Wrapper>
    );

    // Wait for initialization (CategoriesProvider to render children and hook to run)
    await waitFor(() => {
      expect(currentState).not.toBeNull();
      // Wait until categories are loaded (not default)
      expect(currentState.categories).toHaveLength(2);
    });

    // Default to first one
    expect(currentState.selectedId).toBe('cat_A1');

    // Switch to Cat A2
    act(() => {
      currentState.setCurrentCategory('cat_A2');
    });
    
    // Wait for update
    await waitFor(() => expect(currentState.selectedId).toBe('cat_A2'));

    // Verify persistence
    expect(chrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
      'selectedCategoryId:org_A': 'cat_A2',
      'selectedCategoryId': 'cat_A2'
    }));
  });
});
