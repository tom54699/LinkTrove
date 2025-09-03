import React, { createContext, useContext, useMemo, useState } from 'react';
import { setMeta } from '../background/idb/db';

type Theme = 'dark' | 'light';

interface AppState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<AppState | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>('dark');

  // Load theme from chrome.storage on mount
  React.useEffect(() => {
    try {
      chrome.storage?.local?.get?.({ theme: 'dark' }, (r) => {
        const t = (r?.theme === 'light' || r?.theme === 'dark') ? r.theme : 'dark';
        setTheme(t);
      });
    } catch {}
  }, []);

  // Apply theme class to <html>
  React.useEffect(() => {
    const el = document.documentElement;
    if (theme === 'dark') el.classList.add('dark');
    else el.classList.remove('dark');
    try { chrome.storage?.local?.set?.({ theme }); } catch {}
    try { setMeta('settings.theme', theme); } catch {}
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppProvider missing');
  return v;
}
