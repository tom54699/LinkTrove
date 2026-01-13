import React, { createContext, useContext, useMemo, useState } from 'react';
import type { TabItemData } from './types';

interface OpenTabsCtx {
  tabs: TabItemData[]; // visible tabs for active window (if set)
  allTabs: TabItemData[]; // all tabs across windows
  activeWindowId: number | null;
  actions: {
    setTabs: (tabs: TabItemData[]) => void;
    addTab: (tab: TabItemData) => void;
    removeTab: (id: number) => void;
    updateTab: (id: number, patch: Partial<TabItemData>) => void;
    setActiveWindow: (windowId: number | null) => void;
    setWindowLabel: (windowId: number, name: string) => void;
    getWindowLabel: (windowId: number) => string | undefined;
  };
}

const Ctx = createContext<OpenTabsCtx | null>(null);

export const OpenTabsProvider: React.FC<{
  children: React.ReactNode;
  initialTabs?: TabItemData[];
  expose?: (ctx: OpenTabsCtx) => void; // for tests
}> = ({ children, initialTabs = [], expose }) => {
  const [allTabs, setTabsState] = useState<TabItemData[]>(initialTabs);
  const [activeWindowId, setActiveWindowId] = useState<number | null>(null);
  const [_windowIds, setWindowIds] = useState<number[]>([]);
  const [windowLabels, setWindowLabels] = useState<Record<number, string>>({});

  const sortByIndex = (arr: TabItemData[]) =>
    [...arr].sort(
      (a, b) =>
        (a.index ?? Number.MAX_SAFE_INTEGER) -
        (b.index ?? Number.MAX_SAFE_INTEGER)
    );

  const actions = useMemo(
    () => ({
      setTabs: (t: TabItemData[]) => setTabsState(sortByIndex(t)),
      addTab: (tab: TabItemData) =>
        setTabsState((prev) => {
          const exists = prev.some((p) => p.id === tab.id);
          return exists
            ? sortByIndex(
                prev.map((p) => (p.id === tab.id ? { ...p, ...tab } : p))
              )
            : sortByIndex([...prev, tab]);
        }),
      removeTab: (id: number) =>
        setTabsState((prev) => prev.filter((t) => t.id !== id)),
      updateTab: (id: number, patch: Partial<TabItemData>) =>
        setTabsState((prev) =>
          sortByIndex(prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
        ),
      setActiveWindow: (wid: number | null) => setActiveWindowId(wid),
      setWindowLabel: (wid: number, name: string) =>
        setWindowLabels((m) => ({ ...m, [wid]: name })),
      getWindowLabel: (wid: number) => windowLabels[wid],
    }),
    [windowLabels]
  );

  const tabs = useMemo(() => {
    if (!activeWindowId) return sortByIndex(allTabs);
    const filtered = allTabs.filter((t) => t.windowId === activeWindowId);
    return sortByIndex(filtered);
  }, [allTabs, activeWindowId]);

  const value = useMemo<OpenTabsCtx>(
    () => ({ tabs, allTabs, activeWindowId, actions }),
    [tabs, allTabs, activeWindowId, actions]
  );
  React.useEffect(() => {
    expose?.(value);
  }, [expose, value]);

  // Connect to background to receive real Chrome tabs when running in extension
  React.useEffect(() => {
    // Load window labels from storage (if available)
    const st = (globalThis as any)?.chrome?.storage?.local;
    try {
      st?.get?.({ windowLabels: {} }, (res: any) => {
        if (res && res.windowLabels) setWindowLabels(res.windowLabels);
      });
    } catch {}
  }, []);

  React.useEffect(() => {
    // Persist window labels
    const st = (globalThis as any)?.chrome?.storage?.local;
    try {
      st?.set?.({ windowLabels });
    } catch {}
  }, [windowLabels]);

  React.useEffect(() => {
    const rt: any = (globalThis as any)?.chrome?.runtime;
    if (!rt?.connect) return;
    const port = rt.connect({ name: 'openTabs' });
    const onMsg = (msg: any) => {
      if (msg?.kind === 'init' && Array.isArray(msg.tabs)) {
        setTabsState(sortByIndex(msg.tabs));
        if (Array.isArray(msg.windowIds)) setWindowIds(msg.windowIds);
        if (typeof msg.activeWindowId === 'number')
          setActiveWindowId(msg.activeWindowId);
      } else if (msg?.kind === 'tab-event' && msg.evt) {
        const evt = msg.evt;
        if (evt.type === 'created' && evt.payload) actions.addTab(evt.payload);
        else if (evt.type === 'removed') actions.removeTab(evt.payload.tabId);
        else if (evt.type === 'updated')
          actions.updateTab(evt.payload.tabId, evt.payload.changeInfo);
        else if (evt.type === 'moved')
          actions.updateTab(evt.payload.tabId, {
            index: evt.payload.toIndex,
            windowId: evt.payload.windowId,
          });
        else if (evt.type === 'attached') {
          actions.updateTab(evt.payload.tabId, {
            index: evt.payload.newPosition,
            windowId: evt.payload.newWindowId,
          });
          // ensure window id exists in group list
          setWindowIds((prev) =>
            Array.from(new Set([...(prev || []), evt.payload.newWindowId]))
          );
        }
        // detached will be followed by attached; ignore interim
        else if (evt.type === 'replaced')
          actions.removeTab(evt.payload.removedTabId);
      } else if (msg?.kind === 'window-focus') {
        if (typeof msg.windowId === 'number' && msg.windowId > 0)
          setActiveWindowId(msg.windowId);
      } else if (msg?.kind === 'window-event' && msg.evt) {
        const e = msg.evt;
        if (e.type === 'created' && typeof e.windowId === 'number')
          setWindowIds((prev) => Array.from(new Set([...prev, e.windowId])));
        else if (e.type === 'removed' && typeof e.windowId === 'number')
          setWindowIds((prev) => prev.filter((id) => id !== e.windowId));
      }
    };
    port.onMessage.addListener(onMsg);
    // Handshake: Signal readiness to background to trigger init data
    try { port.postMessage({ kind: 'ready' }); } catch {}

    return () => {
      try {
        port.onMessage.removeListener(onMsg);
        port.disconnect();
      } catch {}
    };
  }, []);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useOpenTabs() {
  const v = useContext(Ctx);
  if (!v) throw new Error('OpenTabsProvider missing');
  return v;
}
