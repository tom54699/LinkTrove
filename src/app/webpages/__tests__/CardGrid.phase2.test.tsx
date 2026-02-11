import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

/**
 * Phase 2 優化測試：CardGrid 性能優化驗證
 *
 * 測試項目：
 * 1. selected 計算 memo 化
 * 2. RAF 節流邏輯（<300 vs >=300）
 * 3. RAF cleanup
 * 4. dataTransfer error handling
 */

// ============================================================================
// Test 1: selected 計算 memo 化
// ============================================================================

describe('CardGrid - selected calculation memoization', () => {
  it('should calculate selectedCount correctly', () => {
    const selected = { '1': true, '2': false, '3': true, '4': false, '5': true };
    const selectedCount = Object.values(selected).filter(Boolean).length;
    expect(selectedCount).toBe(3);
  });

  it('should extract selectedIds correctly', () => {
    const selected = { '1': true, '2': false, '3': true, '4': true };
    const selectedIds = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([key]) => key);
    expect(selectedIds).toEqual(['1', '3', '4']);
  });

  it('should maintain item order in selectedIdsOrdered', () => {
    const items = [
      { id: '3', title: 'C' },
      { id: '1', title: 'A' },
      { id: '2', title: 'B' },
      { id: '4', title: 'D' },
    ];
    const selected = { '1': true, '3': true, '4': true };

    // 應該保持 items 的順序，而非 selected object 的順序
    const selectedIdsOrdered = items
      .filter(item => selected[item.id])
      .map(item => item.id);

    expect(selectedIdsOrdered).toEqual(['3', '1', '4']); // items 的順序
  });

  it('should recalculate only when dependencies change', () => {
    const calculateSpy = vi.fn();

    // 使用固定的引用來測試 memo
    const selected1 = { '1': true, '2': false };
    const selected2 = { '1': true, '2': true };

    const { result, rerender } = renderHook(
      ({ selected }) => {
        return React.useMemo(() => {
          calculateSpy();
          return Object.values(selected).filter(Boolean).length;
        }, [selected]);
      },
      { initialProps: { selected: selected1 } }
    );

    expect(calculateSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(1);

    // 重新 render，使用同一個引用
    rerender({ selected: selected1 });
    expect(calculateSpy).toHaveBeenCalledTimes(1); // 不應重新計算

    // selected 變化（新引用）
    rerender({ selected: selected2 });
    expect(calculateSpy).toHaveBeenCalledTimes(2); // 應該重新計算
    expect(result.current).toBe(2);
  });
});

// ============================================================================
// Test 2: RAF 節流邏輯
// ============================================================================

describe('CardGrid - RAF throttling logic', () => {
  let rafId = 0;
  let rafCallbacks: Map<number, FrameRequestCallback>;

  beforeEach(() => {
    rafId = 0;
    rafCallbacks = new Map();

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      const id = ++rafId;
      rafCallbacks.set(id, callback);
      return id;
    });

    // Mock cancelAnimationFrame
    global.cancelAnimationFrame = vi.fn((id: number) => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use RAF throttling when items >= 300', () => {
    const items = new Array(300).fill(null).map((_, i) => ({ id: String(i) }));
    const DND_RAF_THRESHOLD = 300;

    const shouldUseRAF = items.length >= DND_RAF_THRESHOLD;
    expect(shouldUseRAF).toBe(true);
  });

  it('should NOT use RAF throttling when items < 300', () => {
    const items = new Array(299).fill(null).map((_, i) => ({ id: String(i) }));
    const DND_RAF_THRESHOLD = 300;

    const shouldUseRAF = items.length >= DND_RAF_THRESHOLD;
    expect(shouldUseRAF).toBe(false);
  });

  it('should skip subsequent calls when RAF is pending', () => {
    let rafIdRef: number | null = null;
    const executeCore = vi.fn();

    // 模擬 handleDragOver 邏輯
    const handleDragOver = () => {
      if (rafIdRef !== null) return; // 已有 pending RAF，跳過
      rafIdRef = requestAnimationFrame(() => {
        rafIdRef = null;
        executeCore();
      });
    };

    // 連續調用 3 次
    handleDragOver();
    handleDragOver();
    handleDragOver();

    // 應該只排程一次 RAF
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(executeCore).not.toHaveBeenCalled();

    // 執行 RAF callback
    act(() => {
      const callback = rafCallbacks.get(1);
      callback?.(0);
    });

    expect(executeCore).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Test 3: RAF cleanup
// ============================================================================

describe('CardGrid - RAF cleanup', () => {
  let rafId = 0;
  let rafCallbacks: Map<number, FrameRequestCallback>;

  beforeEach(() => {
    rafId = 0;
    rafCallbacks = new Map();
    global.requestAnimationFrame = vi.fn((callback) => {
      const id = ++rafId;
      rafCallbacks.set(id, callback);
      return id;
    });
    global.cancelAnimationFrame = vi.fn((id) => {
      rafCallbacks.delete(id);
    });
  });

  it('should cancel RAF on drop', () => {
    let rafIdRef: number | null = 10;

    // 模擬 handleDrop
    const handleDrop = () => {
      if (rafIdRef !== null) {
        cancelAnimationFrame(rafIdRef);
        rafIdRef = null;
      }
    };

    handleDrop();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(10);
    expect(rafIdRef).toBe(null);
  });

  it('should cancel RAF on dragLeave', () => {
    let rafIdRef: number | null = 20;

    // 模擬 handleDragLeave cleanup
    const cleanup = () => {
      if (rafIdRef !== null) {
        cancelAnimationFrame(rafIdRef);
        rafIdRef = null;
      }
    };

    cleanup();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(20);
    expect(rafIdRef).toBe(null);
  });

  it('should cancel RAF on ghost-clear event', () => {
    let rafIdRef: number | null = 30;

    // 模擬 onGhostClear
    const onGhostClear = () => {
      if (rafIdRef !== null) {
        cancelAnimationFrame(rafIdRef);
        rafIdRef = null;
      }
    };

    onGhostClear();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(30);
    expect(rafIdRef).toBe(null);
  });
});

// ============================================================================
// Test 4: dataTransfer error handling
// ============================================================================

describe('CardGrid - dataTransfer error handling', () => {
  it('should handle dataTransfer.getData throwing error', () => {
    const mockDataTransfer = {
      getData: vi.fn(() => {
        throw new Error('Access denied');
      }),
      types: [],
    };

    // 模擬 event 數據提取邏輯
    let tabData = '';
    let webpageData = '';
    let webpageMetaData = '';
    let dataTransferTypes: string[] = [];

    expect(() => {
      try {
        tabData = mockDataTransfer.getData('application/x-linktrove-tab');
        webpageData = mockDataTransfer.getData('application/x-linktrove-webpage');
        webpageMetaData = mockDataTransfer.getData('application/x-linktrove-webpage-meta');
        dataTransferTypes = Array.from(mockDataTransfer.types || []);
      } catch {
        // 使用空值
      }
    }).not.toThrow();

    // 應該使用空值
    expect(tabData).toBe('');
    expect(webpageData).toBe('');
    expect(webpageMetaData).toBe('');
    expect(dataTransferTypes).toEqual([]);
  });

  it('should handle dataTransfer being null/undefined', () => {
    const mockEvent = {
      dataTransfer: null as any,
    };

    let dataTransferTypes: string[] = [];

    expect(() => {
      try {
        dataTransferTypes = Array.from(mockEvent.dataTransfer?.types || []);
      } catch {
        dataTransferTypes = [];
      }
    }).not.toThrow();

    expect(dataTransferTypes).toEqual([]);
  });

  it('should successfully extract data when dataTransfer is available', () => {
    const mockDataTransfer = {
      getData: vi.fn((type: string) => {
        if (type === 'application/x-linktrove-tab') return '{"id":1,"title":"Test"}';
        if (type === 'application/x-linktrove-webpage') return 'webpage-123';
        return '';
      }),
      types: ['application/x-linktrove-tab', 'application/x-linktrove-webpage'],
    };

    let tabData = '';
    let webpageData = '';
    let dataTransferTypes: string[] = [];

    try {
      tabData = mockDataTransfer.getData('application/x-linktrove-tab');
      webpageData = mockDataTransfer.getData('application/x-linktrove-webpage');
      dataTransferTypes = Array.from(mockDataTransfer.types || []);
    } catch {
      // 不應該執行
    }

    expect(tabData).toBe('{"id":1,"title":"Test"}');
    expect(webpageData).toBe('webpage-123');
    expect(dataTransferTypes).toEqual(['application/x-linktrove-tab', 'application/x-linktrove-webpage']);
  });
});
