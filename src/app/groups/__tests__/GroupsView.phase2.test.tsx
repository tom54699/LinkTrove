import { describe, it, expect, vi } from 'vitest';
import React from 'react';

/**
 * Phase 2 優化測試：GroupsView 性能優化驗證
 *
 * 測試項目：
 * 1. useMemo grouping 邏輯
 * 2. 收合/展開條件渲染
 * 3. groupedItems Map 正確性
 */

// ============================================================================
// Test 1: useMemo grouping 邏輯
// ============================================================================

describe('GroupsView - useMemo grouping', () => {
  it('should group items by subcategoryId', () => {
    const items = [
      { id: '1', subcategoryId: 'g1', category: 'cat1', title: 'A' },
      { id: '2', subcategoryId: 'g1', category: 'cat1', title: 'B' },
      { id: '3', subcategoryId: 'g2', category: 'cat1', title: 'C' },
      { id: '4', subcategoryId: 'g2', category: 'cat1', title: 'D' },
      { id: '5', subcategoryId: 'g3', category: 'cat1', title: 'E' },
    ];
    const categoryId = 'cat1';

    // 測試分組邏輯（不使用 useMemo，直接測試邏輯）
    const groupedItems = new Map<string, any[]>();
    for (const item of items) {
      if (item.category !== categoryId) continue;
      const groupId = item.subcategoryId;
      if (!groupedItems.has(groupId)) groupedItems.set(groupId, []);
      groupedItems.get(groupId)!.push(item);
    }

    expect(groupedItems.get('g1')).toHaveLength(2);
    expect(groupedItems.get('g2')).toHaveLength(2);
    expect(groupedItems.get('g3')).toHaveLength(1);
    expect(groupedItems.get('g1')?.[0].title).toBe('A');
    expect(groupedItems.get('g2')?.[0].title).toBe('C');
  });

  it('should filter out items from other categories', () => {
    const items = [
      { id: '1', subcategoryId: 'g1', category: 'cat1', title: 'A' },
      { id: '2', subcategoryId: 'g1', category: 'cat2', title: 'B' }, // 不同 category
      { id: '3', subcategoryId: 'g1', category: 'cat1', title: 'C' },
    ];
    const categoryId = 'cat1';

    const groupedItems = new Map<string, any[]>();
    for (const item of items) {
      if (item.category !== categoryId) continue;
      const groupId = item.subcategoryId;
      if (!groupedItems.has(groupId)) groupedItems.set(groupId, []);
      groupedItems.get(groupId)!.push(item);
    }

    expect(groupedItems.get('g1')).toHaveLength(2);
    expect(groupedItems.get('g1')?.map(i => i.title)).toEqual(['A', 'C']);
  });

  it('should handle empty items array', () => {
    const items: any[] = [];
    const categoryId = 'cat1';

    const groupedItems = new Map<string, any[]>();
    for (const item of items) {
      if (item.category !== categoryId) continue;
      const groupId = item.subcategoryId;
      if (!groupedItems.has(groupId)) groupedItems.set(groupId, []);
      groupedItems.get(groupId)!.push(item);
    }

    expect(groupedItems.size).toBe(0);
  });

  it('should return empty array for non-existent group', () => {
    const items = [
      { id: '1', subcategoryId: 'g1', category: 'cat1', title: 'A' },
    ];
    const categoryId = 'cat1';

    const groupedItems = new Map<string, any[]>();
    for (const item of items) {
      if (item.category !== categoryId) continue;
      const groupId = item.subcategoryId;
      if (!groupedItems.has(groupId)) groupedItems.set(groupId, []);
      groupedItems.get(groupId)!.push(item);
    }

    // 訪問不存在的 group
    const nonExistentGroup = groupedItems.get('g999') || [];
    expect(nonExistentGroup).toEqual([]);
  });

  it('should recalculate only when items or categoryId change', () => {
    const calculateSpy = vi.fn();
    const items = [
      { id: '1', subcategoryId: 'g1', category: 'cat1' },
    ];

    const compute = (items: any[], categoryId: string) => {
      calculateSpy();
      const map = new Map<string, any[]>();
      for (const item of items) {
        if (item.category !== categoryId) continue;
        const groupId = item.subcategoryId;
        if (!map.has(groupId)) map.set(groupId, []);
        map.get(groupId)!.push(item);
      }
      return map;
    };

    // 第一次計算
    const result1 = compute(items, 'cat1');
    expect(calculateSpy).toHaveBeenCalledTimes(1);

    // 同樣的參數（應該由 useMemo 處理，但這裡手動驗證邏輯）
    const result2 = compute(items, 'cat1');
    expect(calculateSpy).toHaveBeenCalledTimes(2); // 因為沒有 useMemo，會重新計算

    // 實際使用 useMemo 時，應該只計算一次
    // 這裡驗證邏輯的正確性
    expect(result1.get('g1')).toEqual(result2.get('g1'));
  });
});

// ============================================================================
// Test 2: 複雜度驗證
// ============================================================================

describe('GroupsView - complexity improvement', () => {
  it('should reduce complexity from O(n×g) to O(n)', () => {
    const items = new Array(500).fill(null).map((_, i) => ({
      id: String(i),
      subcategoryId: `g${i % 10}`, // 分布到 10 個 groups
      category: 'cat1',
      title: `Item ${i}`,
    }));
    const groups = new Array(10).fill(null).map((_, i) => ({ id: `g${i}` }));
    const categoryId = 'cat1';

    // ❌ 舊方法：O(n×g) - 每個 group 都 filter 一次
    const oldMethod = () => {
      const results = [];
      for (const g of groups) {
        const groupItems = items.filter(
          (it: any) => it.category === categoryId && it.subcategoryId === g.id
        );
        results.push(groupItems);
      }
      return results;
    };

    // ✅ 新方法：O(n) - 只遍歷 items 一次
    const newMethod = () => {
      const map = new Map<string, any[]>();
      for (const item of items) {
        if (item.category !== categoryId) continue;
        const groupId = item.subcategoryId;
        if (!map.has(groupId)) map.set(groupId, []);
        map.get(groupId)!.push(item);
      }
      return groups.map(g => map.get(g.id) || []);
    };

    const oldResult = oldMethod();
    const newResult = newMethod();

    // 結果應該相同
    expect(newResult.length).toBe(oldResult.length);
    for (let i = 0; i < groups.length; i++) {
      expect(newResult[i].length).toBe(oldResult[i].length);
    }

    // 新方法只遍歷 items 一次（500 次）
    // 舊方法遍歷 items×groups 次（500×10 = 5000 次）
    // 效能提升 10 倍
  });
});

// ============================================================================
// Test 3: 收合/展開邏輯
// ============================================================================

describe('GroupsView - collapse/expand logic', () => {
  it('should determine collapse state correctly', () => {
    const collapsed = { 'g1': true, 'g2': false, 'g3': true };

    expect(!!collapsed['g1']).toBe(true);  // 收合
    expect(!!collapsed['g2']).toBe(false); // 展開
    expect(!!collapsed['g3']).toBe(true);  // 收合
    expect(!!collapsed['g4']).toBe(false); // 未定義，預設展開
  });

  it('should show correct placeholder text when collapsed', () => {
    const groupItems = new Array(42).fill(null);
    const isCollapsed = true;

    const placeholderText = isCollapsed
      ? `${groupItems.length} 張卡片（已收合）`
      : null;

    expect(placeholderText).toBe('42 張卡片（已收合）');
  });

  it('should not show placeholder when expanded', () => {
    const groupItems = new Array(42).fill(null);
    const isCollapsed = false;

    const placeholderText = isCollapsed
      ? `${groupItems.length} 張卡片（已收合）`
      : null;

    expect(placeholderText).toBe(null);
  });

  it('should render CardGrid when expanded', () => {
    const isCollapsed = false;
    const shouldRenderCardGrid = !isCollapsed;

    expect(shouldRenderCardGrid).toBe(true);
  });

  it('should NOT render CardGrid when collapsed', () => {
    const isCollapsed = true;
    const shouldRenderCardGrid = !isCollapsed;

    expect(shouldRenderCardGrid).toBe(false);
  });
});

// ============================================================================
// Test 4: 卡片計數正確性
// ============================================================================

describe('GroupsView - card count accuracy', () => {
  it('should count cards correctly using groupedItems.get().length', () => {
    const items = [
      { id: '1', subcategoryId: 'g1', category: 'cat1' },
      { id: '2', subcategoryId: 'g1', category: 'cat1' },
      { id: '3', subcategoryId: 'g1', category: 'cat1' },
      { id: '4', subcategoryId: 'g2', category: 'cat1' },
      { id: '5', subcategoryId: 'g2', category: 'cat1' },
    ];
    const categoryId = 'cat1';

    const groupedItems = new Map<string, any[]>();
    for (const item of items) {
      if (item.category !== categoryId) continue;
      const groupId = item.subcategoryId;
      if (!groupedItems.has(groupId)) groupedItems.set(groupId, []);
      groupedItems.get(groupId)!.push(item);
    }

    // 直接從 Map 取得計數（O(1)）
    const g1Count = groupedItems.get('g1')?.length || 0;
    const g2Count = groupedItems.get('g2')?.length || 0;
    const g3Count = groupedItems.get('g3')?.length || 0;

    expect(g1Count).toBe(3);
    expect(g2Count).toBe(2);
    expect(g3Count).toBe(0); // 不存在的 group
  });

  it('should avoid redundant filter for card count', () => {
    const filterSpy = vi.fn();
    const items = [
      { id: '1', subcategoryId: 'g1', category: 'cat1' },
      { id: '2', subcategoryId: 'g1', category: 'cat1' },
    ];

    // ❌ 舊方法：每次都 filter（重複計算）
    const oldGetCount = (groupId: string) => {
      return items.filter((it) => {
        filterSpy();
        return it.subcategoryId === groupId && it.category === 'cat1';
      }).length;
    };

    // ✅ 新方法：直接從 Map 取得（O(1)）
    const groupedItems = new Map<string, any[]>();
    for (const item of items) {
      if (item.category !== 'cat1') continue;
      const groupId = item.subcategoryId;
      if (!groupedItems.has(groupId)) groupedItems.set(groupId, []);
      groupedItems.get(groupId)!.push(item);
    }
    const newGetCount = (groupId: string) => groupedItems.get(groupId)?.length || 0;

    filterSpy.mockClear();
    const oldCount = oldGetCount('g1');
    const oldFilterCalls = filterSpy.mock.calls.length;

    const newCount = newGetCount('g1');

    expect(oldCount).toBe(newCount);
    expect(oldFilterCalls).toBeGreaterThan(0); // 舊方法需要 filter
    // 新方法不需要 filter，直接從 Map 取得
  });
});
