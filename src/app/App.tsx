import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from './AppContext';
import { ThreeColumnLayout } from './layout/ThreeColumn';
import { OpenTabsProvider } from './tabs/OpenTabsProvider';
import { TemplatesProvider } from './templates/TemplatesProvider';
import { TabsPanel } from './tabs/TabsPanel';
import { CardGrid } from './webpages/CardGrid';
import { CategoriesProvider, useCategories } from './sidebar/categories';
import { Sidebar } from './sidebar/sidebar';
import { FeedbackProvider, ErrorBoundary } from './ui/feedback';
import { SearchBox } from './ui/SearchBox';
import {
  createExportImportService,
  type ExportImportService,
} from './data/exportImport';
import { createStorageService } from '../background/storageService';
import { useFeedback } from './ui/feedback';
import { WebpagesProvider, useWebpages } from './webpages/WebpagesProvider';
import { TemplatesManager } from './templates/TemplatesManager';
import { useTemplates } from './templates/TemplatesProvider';
import { GroupsView } from './groups/GroupsView';

export const AppLayout: React.FC = () => {
  const { theme, setTheme } = useApp();
  return (
    <FeedbackProvider>
      <ErrorBoundary>
        <OpenTabsProvider>
          <CategoriesProvider>
            <TemplatesProvider>
              <WebpagesProvider>
                <div className="toby-mode h-screen flex flex-col bg-[var(--bg)] text-[var(--fg)]">
                  <header className="p-4 flex items-center justify-between border-b border-slate-700 flex-shrink-0">
                    <nav
                      aria-label="Primary"
                      className="inline-flex items-center gap-1 p-1 rounded-lg border border-slate-700 bg-[var(--panel)]"
                    >
                      <NavLink
                        to="/"
                        end
                        className={({ isActive }) =>
                          `px-3 py-1.5 rounded-md text-sm ${
                            isActive
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          } focus:outline-none focus:ring-2 focus:ring-emerald-600/60`
                        }
                        aria-label="Home"
                      >
                        Home
                      </NavLink>
                      <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                          `px-3 py-1.5 rounded-md text-sm ${
                            isActive
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          } focus:outline-none focus:ring-2 focus:ring-emerald-600/60`
                        }
                        aria-label="Settings"
                      >
                        Settings
                      </NavLink>
                    </nav>
                    <button
                      className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-800 inline-flex items-center justify-center"
                      onClick={() =>
                        setTheme(theme === 'dracula' ? 'gruvbox' : 'dracula')
                      }
                      aria-label={`Switch to ${theme === 'dracula' ? 'gruvbox' : 'dracula'} theme`}
                      title={`Theme: ${theme} — click to switch`}
                    >
                      {theme === 'dracula' ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-5 h-5 text-violet-300"
                          aria-hidden="true"
                        >
                          <path d="M21 12.79A9 9 0 1111.21 3c.03 0 .06 0 .09 0a7 7 0 109.7 9.7c0 .03 0 .06 0 .09z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="w-5 h-5 text-amber-300"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                        </svg>
                      )}
                      <span className="sr-only">Toggle theme</span>
                    </button>
                  </header>
          <main className="p-6 flex-1 overflow-auto min-h-0">
            <Outlet />
          </main>
                </div>
              </WebpagesProvider>
            </TemplatesProvider>
          </CategoriesProvider>
        </OpenTabsProvider>
      </ErrorBoundary>
    </FeedbackProvider>
  );
};

export const Home: React.FC = () => <HomeInner />;

const HomeInner: React.FC = () => {
  const { actions, items } = useWebpages();
  const {
    selectedId,
    actions: catActions,
    setCurrentCategory,
  } = useCategories();
  // Simplify to a single view; remove density switching
  const [collapsed, setCollapsed] = React.useState(false);
  const { showToast } = useFeedback();
  const [creatingGroup, setCreatingGroup] = React.useState(false);
  const [showAddCat, setShowAddCat] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState('');
  const [newCatColor, setNewCatColor] = React.useState('#64748b');
  const viewItems = React.useMemo(
    () => items.filter((it: any) => it.category === selectedId),
    [items, selectedId]
  );
  return (
    <div className="h-full min-h-0">
      <ThreeColumnLayout
        sidebar={<Sidebar />}
        content={
          <div>
            <div className="toby-board-header">
              <div className="title-group">
                <h1>LinkTrove Home</h1>
                <div className="subtext">{viewItems.length} collections</div>
              </div>
              <div className="toby-board-actions">
                <button className="link" title="Drag and Drop">
                  DRAG &amp; DROP
                </button>
                <div className="inline-block align-middle mr-2">
                  <SearchBox />
                </div>
                <button
                  className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-800 mr-2"
                  title="新增 group"
                  aria-label="新增 group"
                  disabled={creatingGroup}
                  onClick={async () => {
                    try {
                      if (creatingGroup) return;
                      setCreatingGroup(true);
                      const hasChrome =
                        typeof (globalThis as any).chrome !== 'undefined' &&
                        !!(globalThis as any).chrome?.storage?.local;
                      if (!hasChrome) {
                        showToast('僅於擴充環境可用', 'info');
                        return; 
                      }
                      const { createStorageService } = await import('../background/storageService');
                      const s = createStorageService();
                      await (s as any).createSubcategory?.(selectedId, 'group');
                      try { window.dispatchEvent(new CustomEvent('groups:changed')); } catch {}
                      showToast('已新增 group', 'success');
                    } catch (e) {
                      showToast('新增失敗', 'error');
                    } finally {
                      setCreatingGroup(false);
                    }
                  }}
                >
                  新增 group
                </button>
                {/* Single view only: density control removed */}
                <button
                  className="link muted"
                  title="Expand"
                  onClick={() => setCollapsed(false)}
                >
                  EXPAND
                </button>
                <button
                  className="link muted"
                  title="Collapse"
                  onClick={() => setCollapsed(true)}
                >
                  COLLAPSE
                </button>
                <button
                  className="primary"
                  title="Add Collection"
                  onClick={() => {
                    setNewCatName('');
                    setNewCatColor('#64748b');
                    setShowAddCat(true);
                  }}
                >
                  + ADD COLLECTION
                </button>
              </div>
            </div>
            {/* 以 group 分段呈現卡片 */}
            <GroupsView categoryId={selectedId} />
          </div>
        }
        tabsPanel={<TabsPanel />}
      />
      {showAddCat && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
          onClick={() => setShowAddCat(false)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--panel)] p-5 w-[420px] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Add Collection"
          >
            <div className="text-lg font-medium mb-3">New Collection</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="My Collection"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Color</label>
                <input
                  type="color"
                  className="rounded border border-slate-700 bg-slate-900 p-1"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Template</label>
                <TemplatePicker />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => setShowAddCat(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-50"
                disabled={!newCatName.trim()}
                onClick={async () => {
                  const cat = await catActions.addCategory(
                    newCatName.trim(),
                    newCatColor
                  );
                  const sel =
                    (
                      document.getElementById(
                        'tpl-select'
                      ) as HTMLSelectElement | null
                    )?.value || '';
                  if (sel) await catActions.setDefaultTemplate(cat.id, sel);
                  setCurrentCategory(cat.id);
                  setShowAddCat(false);
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TemplatePicker: React.FC = () => {
  const { templates } = useTemplates();
  return (
    <select
      id="tpl-select"
      className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
    >
      <option value="">None</option>
      {templates.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
};

export const Settings: React.FC<{ ei?: ExportImportService }> = ({ ei }) => {
  const svc = React.useMemo(
    () => ei ?? createExportImportService({ storage: createStorageService() }),
    [ei]
  );
  const { showToast, setLoading } = useFeedback();
  const [text, setText] = React.useState('');
  const { actions: pagesActions } = useWebpages();
  const { actions: catActions } = useCategories() as any;
  const { actions: tplActions } = useTemplates() as any;
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <div className="space-y-8">
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
                  // Reload in-memory views without manual refresh
                  try {
                    await pagesActions.load();
                  } catch {}
                  try {
                    await catActions?.reload?.();
                  } catch {}
                  try {
                    await tplActions?.reload?.();
                  } catch {}
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
        <TemplatesManager />
      </div>
    </div>
  );
};
