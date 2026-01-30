import React, { createContext, useContext, useMemo, useState } from 'react';
import type { TabItemData, NativeTabGroup } from './types';

interface OpenTabsCtx {
  tabs: TabItemData[]; // visible tabs for active window (if set)
  allTabs: TabItemData[]; // all tabs across windows
  nativeTabGroups: NativeTabGroup[];
  totalTabCount: number;
  activeWindowId: number | null;
  actions: {
    setTabs: (tabs: TabItemData[]) => void;
    addTab: (tab: TabItemData) => void;
    removeTab: (id: number) => void;
    updateTab: (id: number, patch: Partial<TabItemData>) => void;
    setActiveWindow: (windowId: number | null) => void;
    setWindowLabel: (windowId: number, name: string) => void;
    getWindowLabel: (windowId: number) => string | undefined;
    refresh: () => void;
  };
}

const Ctx = createContext<OpenTabsCtx | null>(null);

export const OpenTabsProvider: React.FC<{
  children: React.ReactNode;
  initialTabs?: TabItemData[];
  expose?: (ctx: OpenTabsCtx) => void; // for tests
}> = ({ children, initialTabs = [], expose }) => {
  const [allTabs, setTabsState] = useState<TabItemData[]>(initialTabs);
  const [nativeTabGroups, setNativeTabGroups] = useState<NativeTabGroup[]>([]);
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
      refresh: () => {
        if (chrome.tabs?.query) {
          chrome.tabs.query({}, (tabs) => {
             const mapped = tabs.map(t => ({
               id: t.id!,
               title: t.title,
               url: t.url,
               favIconUrl: t.favIconUrl,
               index: t.index,
               windowId: t.windowId,
               nativeGroupId: t.groupId > 0 ? t.groupId : undefined,
             }));
             setTabsState(sortByIndex(mapped));
             
             // Also refresh groups while we are at it
             if (chrome.tabGroups?.query) {
                chrome.tabGroups.query({}, (groups) => {
                  setNativeTabGroups(groups.map(g => ({
                    id: g.id,
                    title: g.title,
                    color: g.color,
                    windowId: g.windowId,
                    collapsed: g.collapsed,
                  })));
                });
             }
          });
        }
      }
    }),
    [windowLabels]
  );

  const tabs = useMemo(() => {
    if (!activeWindowId) return sortByIndex(allTabs);
    const filtered = allTabs.filter((t) => t.windowId === activeWindowId);
    return sortByIndex(filtered);
  }, [allTabs, activeWindowId]);

  const totalTabCount = useMemo(() => allTabs.length, [allTabs]);

  const value = useMemo<OpenTabsCtx>(
    () => ({ tabs, allTabs, nativeTabGroups, totalTabCount, activeWindowId, actions }),
    [tabs, allTabs, nativeTabGroups, totalTabCount, activeWindowId, actions]
  );
  const actionsRef = React.useRef(actions);
  React.useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);
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
        if (Array.isArray(msg.nativeGroups)) setNativeTabGroups(msg.nativeGroups);
        if (Array.isArray(msg.windowIds)) setWindowIds(msg.windowIds);
        if (typeof msg.activeWindowId === 'number')
          setActiveWindowId(msg.activeWindowId);
      } else if (msg?.kind === 'groups-update' && Array.isArray(msg.groups)) {
        setNativeTabGroups(msg.groups);
      } else if (msg?.kind === 'tab-event' && msg.evt) {
        const evt = msg.evt;
        
        setTabsState((prev) => {
          const sort = (arr: TabItemData[]) =>
            [...arr].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

          if (evt.type === 'created' && evt.payload) {
            const newTab = evt.payload;
            const others = prev.filter((t) => t.id !== newTab.id);
            const winTabs = others.filter((t) => t.windowId === newTab.windowId);
            const shifted = winTabs.map((t) => {
              if ((t.index ?? 0) >= (newTab.index ?? 9999))
                return { ...t, index: (t.index ?? 0) + 1 };
              return t;
            });
            const nonWinTabs = others.filter(
              (t) => t.windowId !== newTab.windowId
            );
            return sort([...nonWinTabs, ...shifted, newTab]);
          } else if (evt.type === 'removed') {
            const { tabId } = evt.payload;
            const target = prev.find((t) => t.id === tabId);
            if (!target) return prev;

            const others = prev.filter((t) => t.id !== tabId);
            const winTabs = others.filter((t) => t.windowId === target.windowId);
            const shifted = winTabs.map((t) => {
              if ((t.index ?? 0) > (target.index ?? 0))
                return { ...t, index: (t.index ?? 0) - 1 };
              return t;
            });
            const nonWinTabs = others.filter(
              (t) => t.windowId !== target.windowId
            );
            return sort([...nonWinTabs, ...shifted]);
          } else if (evt.type === 'updated') {
            const { tabId, changeInfo } = evt.payload;
            const patch = { ...changeInfo };
            if ('groupId' in patch) {
              patch.nativeGroupId =
                patch.groupId > 0 ? patch.groupId : undefined;
              
              // If this group ID is unknown to us, trigger a refresh
              if (patch.nativeGroupId && !nativeTabGroups.some(g => g.id === patch.nativeGroupId)) {
                 if (chrome.tabGroups?.query) {
                    chrome.tabGroups.query({}, (groups) => {
                       setNativeTabGroups(groups.map(g => ({
                         id: g.id,
                         title: g.title,
                         color: g.color,
                         windowId: g.windowId,
                         collapsed: g.collapsed,
                       })));
                    });
                 }
              }

              delete patch.groupId;
            }
            return sort(
              prev.map((t) => (t.id === tabId ? { ...t, ...patch } : t))
            );
          } else if (evt.type === 'moved') {
            const { tabId, fromIndex, toIndex, windowId } = evt.payload;
            return sort(
              prev.map((t) => {
                if (t.windowId !== windowId) return t;
                if (t.id === tabId) return { ...t, index: toIndex };
                const idx = t.index ?? 0;
                if (fromIndex < toIndex) {
                  if (idx > fromIndex && idx <= toIndex)
                    return { ...t, index: idx - 1 };
                } else {
                  if (idx >= toIndex && idx < fromIndex)
                    return { ...t, index: idx + 1 };
                }
                return t;
              })
            );
          } else if (evt.type === 'detached') {
            const { tabId, oldWindowId, oldPosition } = evt.payload;
            return sort(
              prev.map((t) => {
                if (t.id === tabId) return t;
                if (t.windowId === oldWindowId && (t.index ?? 0) > oldPosition) {
                  return { ...t, index: (t.index ?? 0) - 1 };
                }
                return t;
              })
            );
          } else if (evt.type === 'attached') {
            const { tabId, newWindowId, newPosition } = evt.payload;
            return sort(
              prev.map((t) => {
                if (t.id === tabId)
                  return { ...t, windowId: newWindowId, index: newPosition };
                if (
                  t.windowId === newWindowId &&
                  (t.index ?? 0) >= newPosition
                ) {
                  return { ...t, index: (t.index ?? 0) + 1 };
                }
                return t;
              })
            );
          } else if (evt.type === 'replaced') {
             // Handle replaced separately via actions to keep async logic simple
             // We return prev here and let the side-effect below handle it?
             // No, the side effect below is outside setTabsState.
             // We can just return prev and run the logic below.
             return prev;
          }
          return prev;
        });
        
        // Handle side effects and 'replaced' logic
        if (evt.type === 'attached') {
          setWindowIds((prev) =>
            Array.from(new Set([...(prev || []), evt.payload.newWindowId]))
          );
        } else if (evt.type === 'replaced') {
          actionsRef.current.removeTab(evt.payload.removedTabId);
          if (evt.payload.addedTabId) {
            try {
              chrome.tabs.get(evt.payload.addedTabId, (tab) => {
                if (tab && !chrome.runtime.lastError) {
                  actionsRef.current.addTab({
                    id: tab.id!,
                    title: tab.title,
                    url: tab.url,
                    favIconUrl: tab.favIconUrl,
                    index: tab.index,
                    windowId: tab.windowId,
                    nativeGroupId: tab.groupId > 0 ? tab.groupId : undefined,
                  });
                }
              });
            } catch {}
          }
        }
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
