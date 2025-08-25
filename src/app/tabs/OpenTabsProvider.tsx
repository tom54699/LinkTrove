import React, { createContext, useContext, useMemo, useState } from 'react';
import type { TabItemData } from './types';

interface OpenTabsCtx {
  tabs: TabItemData[];
  actions: {
    setTabs: (tabs: TabItemData[]) => void;
    addTab: (tab: TabItemData) => void;
    removeTab: (id: number) => void;
    updateTab: (id: number, patch: Partial<TabItemData>) => void;
  };
}

const Ctx = createContext<OpenTabsCtx | null>(null);

export const OpenTabsProvider: React.FC<{
  children: React.ReactNode;
  initialTabs?: TabItemData[];
  expose?: (ctx: OpenTabsCtx) => void; // for tests
}> = ({ children, initialTabs = [], expose }) => {
  const [tabs, setTabsState] = useState<TabItemData[]>(initialTabs);

  const actions = useMemo(() => ({
    setTabs: (t: TabItemData[]) => setTabsState(t),
    addTab: (tab: TabItemData) => setTabsState((prev) => {
      const exists = prev.some((p) => p.id === tab.id);
      return exists ? prev : [tab, ...prev];
    }),
    removeTab: (id: number) => setTabsState((prev) => prev.filter((t) => t.id !== id)),
    updateTab: (id: number, patch: Partial<TabItemData>) =>
      setTabsState((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
  }), []);

  const value = useMemo<OpenTabsCtx>(() => ({ tabs, actions }), [tabs, actions]);
  React.useEffect(() => { expose?.(value); }, [expose, value]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useOpenTabs() {
  const v = useContext(Ctx);
  if (!v) throw new Error('OpenTabsProvider missing');
  return v;
}

