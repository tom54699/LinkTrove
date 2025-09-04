import React, { createContext, useContext, useMemo, useState } from 'react';
import { setMeta } from '../background/idb/db';

type Theme = 'dracula' | 'gruvbox';

interface AppState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<AppState | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>('dracula');

  // Load theme from chrome.storage on mount
  React.useEffect(() => {
    try {
      chrome.storage?.local?.get?.({ theme: 'dracula' }, (r) => {
        let t = r?.theme as any;
        // Backward-compat: map old 'dark'/'light' to 'dracula'
        if (t === 'dark' || t === 'light' || !t) t = 'dracula';
        if (t !== 'dracula' && t !== 'gruvbox') t = 'dracula';
        setTheme(t);
      });
    } catch {}
  }, []);

  // Apply theme class to <html>
  React.useEffect(() => {
    const el = document.documentElement;
    el.classList.remove('theme-dracula', 'theme-gruvbox', 'dark');
    // Keep removing legacy 'dark' to avoid clashes; now use explicit theme classes
    el.classList.add(theme === 'dracula' ? 'theme-dracula' : 'theme-gruvbox');
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
