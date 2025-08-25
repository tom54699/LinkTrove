import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useApp } from './AppContext';

export const AppLayout: React.FC = () => {
  const { theme, setTheme } = useApp();
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <header className="p-4 flex items-center justify-between border-b border-slate-700">
        <nav className="space-x-4">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/settings" className="hover:underline">Settings</Link>
        </nav>
        <button
          className="text-sm px-2 py-1 rounded border border-slate-600 hover:bg-slate-800"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          Theme: {theme}
        </button>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
};

export const Home: React.FC = () => (
  <div>
    <h1 className="text-xl font-semibold">LinkTrove Home</h1>
    <p className="opacity-80">Task 3.1: routing and dark theme ready.</p>
  </div>
);

export const Settings: React.FC = () => (
  <div>
    <h1 className="text-xl font-semibold">Settings</h1>
  </div>
);

