import { describe, it, expect, beforeEach, vi } from 'vitest';

// Minimal chrome API mock types
type Listener<T extends any[] = any[]> = (...args: T) => void;

function createEvent<T extends any[] = any[]>() {
  const listeners = new Set<Listener<T>>();
  return {
    addListener: (fn: Listener<T>) => listeners.add(fn),
    removeListener: (fn: Listener<T>) => listeners.delete(fn),
    hasListener: (fn: Listener<T>) => listeners.has(fn),
    _emit: (...args: T) => listeners.forEach((fn) => fn(...args)),
    _count: () => listeners.size,
  };
}

// Lazy import after setting global chrome
let createTabsManager: any;

declare global {
  var chrome: any;
}

beforeEach(async () => {
  // Fresh chrome mock each test
  globalThis.chrome = {
    permissions: {
      contains: vi.fn((query: any, cb: (res: boolean) => void) => cb(true)),
    },
    tabs: {
      onCreated: createEvent<[any]>(),
      onRemoved: createEvent<[number, any]>(),
      onUpdated: createEvent<[number, any, any]>(),
      onActivated: createEvent<[any]>(),
      onReplaced: createEvent<[number, number]>(),
      onMoved:
        createEvent<
          [number, { windowId: number; fromIndex: number; toIndex: number }]
        >(),
      onAttached:
        createEvent<[number, { newWindowId: number; newPosition: number }]>(),
      onDetached:
        createEvent<[number, { oldWindowId: number; oldPosition: number }]>(),
    },
  };

  // Reset module cache and import after setting chrome
  const mod = await import('../tabsManager');
  createTabsManager = mod.createTabsManager;
});

describe('tabsManager permissions', () => {
  it('returns false when tabs permission missing', async () => {
    chrome.permissions.contains.mockImplementationOnce((q: any, cb: any) =>
      cb(false)
    );
    const mgr = createTabsManager({ onChange: vi.fn() });
    const ok = await mgr.hasRequiredPermissions();
    expect(ok).toBe(false);
  });

  it('returns true when tabs permission present', async () => {
    const mgr = createTabsManager({ onChange: vi.fn() });
    const ok = await mgr.hasRequiredPermissions();
    expect(ok).toBe(true);
  });
});

describe('tabsManager listeners', () => {
  it('attaches and detaches listeners with start/stop', async () => {
    const mgr = createTabsManager({ onChange: vi.fn() });
    await mgr.start();
    expect(chrome.tabs.onCreated._count()).toBe(1);
    expect(chrome.tabs.onRemoved._count()).toBe(1);
    expect(chrome.tabs.onUpdated._count()).toBe(1);
    expect(chrome.tabs.onActivated._count()).toBe(1);
    expect(chrome.tabs.onReplaced._count()).toBe(1);
    expect(chrome.tabs.onMoved._count()).toBe(1);
    expect(chrome.tabs.onAttached._count()).toBe(1);
    expect(chrome.tabs.onDetached._count()).toBe(1);

    mgr.stop();
    expect(chrome.tabs.onCreated._count()).toBe(0);
    expect(chrome.tabs.onRemoved._count()).toBe(0);
    expect(chrome.tabs.onUpdated._count()).toBe(0);
    expect(chrome.tabs.onActivated._count()).toBe(0);
    expect(chrome.tabs.onReplaced._count()).toBe(0);
    expect(chrome.tabs.onMoved._count()).toBe(0);
    expect(chrome.tabs.onAttached._count()).toBe(0);
    expect(chrome.tabs.onDetached._count()).toBe(0);
  });

  it('emits onChange for tab events', async () => {
    const onChange = vi.fn();
    const mgr = createTabsManager({ onChange });
    await mgr.start();

    chrome.tabs.onCreated._emit({ id: 1, title: 'A' });
    chrome.tabs.onRemoved._emit(2, { isWindowClosing: false });
    chrome.tabs.onUpdated._emit(3, { status: 'complete' }, { id: 3 });
    chrome.tabs.onActivated._emit({ tabId: 4, windowId: 1 });
    chrome.tabs.onReplaced._emit(5, 6);
    chrome.tabs.onMoved._emit(7, { windowId: 1, fromIndex: 1, toIndex: 3 });
    chrome.tabs.onAttached._emit(8, { newWindowId: 2, newPosition: 0 });
    chrome.tabs.onDetached._emit(9, { oldWindowId: 1, oldPosition: 2 });

    expect(onChange).toHaveBeenCalledWith({
      type: 'created',
      payload: { id: 1, title: 'A' },
    });
    expect(onChange).toHaveBeenCalledWith({
      type: 'removed',
      payload: { tabId: 2 },
    });
    expect(onChange).toHaveBeenCalledWith({
      type: 'updated',
      payload: { tabId: 3, changeInfo: { status: 'complete' } },
    });
    expect(onChange).toHaveBeenCalledWith({
      type: 'activated',
      payload: { tabId: 4, windowId: 1 },
    });
    expect(onChange).toHaveBeenCalledWith({
      type: 'replaced',
      payload: { addedTabId: 5, removedTabId: 6 },
    });
    expect(onChange).toHaveBeenCalledWith({
      type: 'moved',
      payload: { tabId: 7, windowId: 1, fromIndex: 1, toIndex: 3 },
    });
    expect(onChange).toHaveBeenCalledWith({
      type: 'attached',
      payload: { tabId: 8, newWindowId: 2, newPosition: 0 },
    });
    expect(onChange).toHaveBeenCalledWith({
      type: 'detached',
      payload: { tabId: 9, oldWindowId: 1, oldPosition: 2 },
    });
  });
});
