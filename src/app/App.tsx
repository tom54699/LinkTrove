import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useApp } from './AppContext';
import { ThreeColumnLayout } from './layout/ThreeColumn';
import { OpenTabsProvider } from './tabs/OpenTabsProvider';
import { TabsPanel } from './tabs/TabsPanel';
import { CardGrid } from './webpages/CardGrid';
import { CategoriesProvider } from './sidebar/categories';
import { Sidebar } from './sidebar/sidebar';
import { FeedbackProvider, ErrorBoundary } from './ui/feedback';

export const AppLayout: React.FC = () => {
  const { theme, setTheme } = useApp();
  return (
    <FeedbackProvider>
      <ErrorBoundary>
        <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
          <header className="p-4 flex items-center justify-between border-b border-slate-700">
            <nav className="space-x-4">
              <Link to="/" className="hover:underline">
                Home
              </Link>
              <Link to="/settings" className="hover:underline">
                Settings
              </Link>
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
      </ErrorBoundary>
    </FeedbackProvider>
  );
};

export const Home: React.FC = () => (
  <OpenTabsProvider>
    <CategoriesProvider>
      <div>
        <h1 className="text-xl font-semibold mb-4">LinkTrove Home</h1>
        <ThreeColumnLayout
          sidebar={<Sidebar />}
          content={<CardGrid />}
          tabsPanel={<TabsPanel />}
        />
      </div>
    </CategoriesProvider>
  </OpenTabsProvider>
);

export const Settings: React.FC = () => (
  <div>
    <h1 className="text-xl font-semibold">Settings</h1>
  </div>
);
