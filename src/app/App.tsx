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
import {
  createExportImportService,
  type ExportImportService,
} from './data/exportImport';
import { createStorageService } from '../background/storageService';
import { useFeedback } from './ui/feedback';

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

export const Settings: React.FC<{ ei?: ExportImportService }> = ({ ei }) => {
  const svc = React.useMemo(
    () => ei ?? createExportImportService({ storage: createStorageService() }),
    [ei]
  );
  const { showToast, setLoading } = useFeedback();
  const [text, setText] = React.useState('');
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <div className="space-y-4">
        <div>
          <button
            className="text-sm px-2 py-1 rounded border border-slate-600 hover:bg-slate-800"
            onClick={async () => {
              setLoading(true);
              try {
                const json = await svc.exportJson();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'linktrove-export.json';
                a.click();
                URL.revokeObjectURL(url);
                showToast('Export ready', 'success');
              } catch {
                showToast('Export failed', 'error');
              } finally {
                setLoading(false);
              }
            }}
          >
            Export JSON
          </button>
        </div>
        <div>
          <label className="block text-sm mb-1">Import JSON</label>
          <textarea
            aria-label="Import JSON"
            className="w-full h-32 rounded border border-slate-700 bg-slate-900 p-2 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-2">
            <button
              className="text-sm px-2 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30"
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await svc.importJsonMerge(text);
                  showToast(
                    `Imported: ${res.addedPages} pages, ${res.addedCategories} categories`,
                    'success'
                  );
                } catch (e: any) {
                  showToast(e?.message || 'Import failed', 'error');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Import JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
