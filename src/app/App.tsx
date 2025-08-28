import React from 'react';
import { Link, Outlet } from 'react-router-dom';
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

export const AppLayout: React.FC = () => {
  const { theme, setTheme } = useApp();
  return (
    <FeedbackProvider>
      <ErrorBoundary>
        <OpenTabsProvider>
          <CategoriesProvider>
            <TemplatesProvider>
              <WebpagesProvider>
        <div className="toby-mode min-h-screen bg-[var(--bg)] text-[var(--fg)]">
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
  const { selectedId, actions: catActions, setCurrentCategory } = useCategories();
  // Simplify to a single view; remove density switching
  const [collapsed, setCollapsed] = React.useState(false);
  const { showToast } = useFeedback();
  const [showAddCat, setShowAddCat] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState('');
  const [newCatColor, setNewCatColor] = React.useState('#64748b');
  const viewItems = React.useMemo(
    () => items.filter((it: any) => it.category === selectedId),
    [items, selectedId]
  );
  return (
    <div>
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
                <button className="link" title="Drag and Drop">DRAG &amp; DROP</button>
                <div className="inline-block align-middle mr-2">
                  <SearchBox />
                </div>
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
                <button className="primary" title="Add Collection" onClick={() => { setNewCatName(''); setNewCatColor('#64748b'); setShowAddCat(true); }}>+ ADD COLLECTION</button>
              </div>
            </div>
            <CardGrid
              items={viewItems}
              onSave={async (id, patch)=>{
                try {
                  await actions.updateCard(id, patch);
                  showToast('Saved', 'success');
                } catch {
                  showToast('Save failed', 'error');
                }
              }}
              // single view retained; no density prop
              collapsed={collapsed}
              onReorder={(fromId, toId) => actions.reorder(fromId, toId)}
              onUpdateTitle={(id, title) => actions.updateTitle(id, title)}
              onUpdateUrl={(id, url) => actions.updateUrl(id, url)}
              onUpdateCategory={(id, cat) => actions.updateCategory(id, cat)}
              onUpdateMeta={(id, meta) => actions.updateMeta(id, meta)}
              onDropTab={async (tab, beforeId?: string) => {
                try {
                  const id = (await actions.addFromTab(tab as any)) as unknown as string;
                  await actions.updateCategory(id, selectedId);
                  if (beforeId) await actions.reorder(id, beforeId);
                  showToast('Saved from tab', 'success');
                } catch (e) {
                  showToast('Save failed', 'error');
                }
              }}
              onDeleteMany={async (ids) => {
                await actions.deleteMany(ids);
                showToast('Deleted selected', 'success');
              }}
              onDeleteOne={async (id) => {
                await actions.deleteOne(id);
                showToast('Deleted', 'success');
              }}
              onEditDescription={async (id, description) => {
                await actions.updateDescription(id, description);
                showToast('Saved note', 'success');
              }}
            />
          </div>
        }
        tabsPanel={<TabsPanel />}
      />
      {showAddCat && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={() => setShowAddCat(false)}>
          <div className="rounded border border-slate-700 bg-[var(--panel)] p-5 w-[420px] max-w-[90vw]" onClick={(e)=>e.stopPropagation()} role="dialog" aria-label="Add Collection">
            <div className="text-lg font-medium mb-3">New Collection</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm" value={newCatName} onChange={(e)=>setNewCatName(e.target.value)} placeholder="My Collection" />
              </div>
              <div>
                <label className="block text-sm mb-1">Color</label>
                <input type="color" className="rounded border border-slate-700 bg-slate-900 p-1" value={newCatColor} onChange={(e)=>setNewCatColor(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Template</label>
                <TemplatePicker />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={()=>setShowAddCat(false)}>Cancel</button>
              <button className="px-3 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-50" disabled={!newCatName.trim()} onClick={async ()=>{
                const cat = await catActions.addCategory(newCatName.trim(), newCatColor);
                const sel = (document.getElementById('tpl-select') as HTMLSelectElement | null)?.value || '';
                if (sel) await catActions.setDefaultTemplate(cat.id, sel);
                setCurrentCategory(cat.id);
                setShowAddCat(false);
              }}>Create</button>
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
    <select id="tpl-select" className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm">
      <option value="">None</option>
      {templates.map((t)=> (
        <option key={t.id} value={t.id}>{t.name}</option>
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
