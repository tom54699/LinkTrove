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
import { LocalStorageCloudAdapter, LocalStorageFSAdapter } from './sync/adapters';
import { PassphraseBox } from '../background/crypto/CryptoBox';
import { backupWithEI, cloudSyncWithEI } from './sync/bridge';
import { buildLegacyStores } from './sync/legacy';
import { MigrationService } from '../background/migration/MigrationService';
import { createDatabaseManager } from '../background/db/createDatabase';

export const AppLayout: React.FC = () => {
  const { theme, setTheme } = useApp();
  return (
    <FeedbackProvider>
      <ErrorBoundary>
        <DiagnosticsBootstrap />
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
                  if (beforeId === '__END__') await actions.moveToEnd(id);
                  else if (beforeId) await actions.reorder(id, beforeId);
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
  const { items, actions } = useWebpages();
  const { categories, selectedId } = useCategories();
  const [qaUrl, setQaUrl] = React.useState('');
  const [qaTitle, setQaTitle] = React.useState('');
  const [qaCat, setQaCat] = React.useState<string>('');
  const recent = React.useMemo(() => items.slice(0,10), [items]);
  const popular = React.useMemo(() => {
    const { topPopular } = require('./metrics/visits');
    const urls = items.map((i:any)=>i.url).filter(Boolean);
    const top = topPopular(urls, 10);
    const byUrl = new Map(items.map((i:any)=>[i.url,i]));
    return top.map((u:string)=>byUrl.get(u)).filter(Boolean);
  }, [items]);
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <div className="space-y-8">
        <StorageBackendPanel />
        <MigrationPanel />
        <DiagnosticsPanel />
        <SyncPanel />
        <div>
          <div className="text-lg font-medium mb-2">Quick Add</div>
          <div className="flex gap-2 items-center flex-wrap">
            <input className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm min-w-[240px]" placeholder="https://example.com" value={qaUrl} onChange={(e)=>setQaUrl(e.target.value)} />
            <input className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm min-w-[160px]" placeholder="Title (optional)" value={qaTitle} onChange={(e)=>setQaTitle(e.target.value)} />
            <select className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm" value={qaCat} onChange={(e)=>setQaCat(e.target.value)}>
              <option value="">{`Use current (${selectedId})`}</option>
              {categories.map((c:any)=> (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <button className="text-sm px-2 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30" onClick={async ()=>{
              const url = qaUrl.trim(); if (!url) { showToast('URL required','error'); return; }
              try {
                const tab = { id: -1, url, title: qaTitle.trim() || url, favIconUrl: '' } as any;
                const id = await actions.addFromTab(tab);
                await actions.updateCategory(id, qaCat || selectedId);
                setQaUrl(''); setQaTitle('');
                showToast('Added','success');
              } catch {
                showToast('Add failed','error');
              }
            }}>Add</button>
          </div>
        </div>
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
          <div className="text-lg font-medium mb-2">Quick Access</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm opacity-80 mb-1">Recent</div>
              <ul className="space-y-1">
                {recent.map((i:any)=> (
                  <li key={i.id}><a className="hover:underline" href={i.url} target="_blank" rel="noreferrer">{i.title || i.url}</a></li>
                ))}
                {recent.length === 0 && (<li className="opacity-60 text-sm">No items</li>)}
              </ul>
            </div>
            <div>
              <div className="text-sm opacity-80 mb-1">Popular</div>
              <ul className="space-y-1">
                {popular.map((i:any)=> (
                  <li key={i.id}><a className="hover:underline" href={i.url} target="_blank" rel="noreferrer">{i.title || i.url}</a></li>
                ))}
                {popular.length === 0 && (<li className="opacity-60 text-sm">No data yet</li>)}
              </ul>
            </div>
          </div>
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

const DiagnosticsBootstrap: React.FC = () => {
  const { showToast } = useFeedback();
  React.useEffect(() => {
    (async () => { const { initDiagnostics } = await import('./diagnostics/init'); initDiagnostics((m)=>showToast(m, 'error')); })();
  }, [showToast]);
  return null;
};

const DiagnosticsPanel: React.FC = () => {
  const [logs, setLogs] = React.useState<any[]>([]);
  React.useEffect(() => {
    (async () => { const { ErrorLog } = await import('./diagnostics/ErrorLog'); setLogs(ErrorLog.list()); })();
  }, []);
  return (
    <div>
      <div className="text-lg font-medium mb-2">Diagnostics</div>
      <div className="mb-2 text-sm opacity-80">Recent errors (last {logs.length})</div>
      <div className="max-h-40 overflow-auto rounded border border-slate-700 bg-slate-900 p-2 text-xs">
        {logs.length === 0 ? (
          <div className="opacity-60">No errors</div>
        ) : (
          <ul className="space-y-2">
            {logs.map((e: any) => (
              <li key={e.id}>
                <div className="font-medium">{new Date(e.ts).toLocaleString()} — {e.message}</div>
                {e.stack && (<pre className="whitespace-pre-wrap opacity-80">{e.stack}</pre>)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <button className="text-sm px-2 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={async ()=>{
          const { ErrorLog } = await import('./diagnostics/ErrorLog');
          try {
            const data = ErrorLog.export();
            await navigator.clipboard.writeText(data);
          } catch {}
        }}>Copy JSON</button>
        <button className="text-sm px-2 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30" onClick={async ()=>{
          const { ErrorLog } = await import('./diagnostics/ErrorLog');
          ErrorLog.clear();
          setLogs([]);
        }}>Clear</button>
      </div>
    </div>
  );
};

const StorageBackendPanel: React.FC = () => {
  const { showToast } = useFeedback();
  const [backend, setBackend] = React.useState<string>(()=> localStorage.getItem('linktrove.backend') || 'storage');
  return (
    <div>
      <div className="text-lg font-medium mb-2">Storage Backend (experimental)</div>
      <div className="flex items-center gap-2">
        <select className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm" value={backend} onChange={(e)=>{
          const v = e.target.value; setBackend(v); localStorage.setItem('linktrove.backend', v); showToast('Saved. Please restart to apply.','info');
        }}>
          <option value="storage">Chrome Storage (current)</option>
          <option value="sqlite">SQLite (experimental)</option>
        </select>
        <span className="text-xs opacity-70">Switching requires restart. Data remains intact.</span>
      </div>
    </div>
  );
};

const MigrationPanel: React.FC = () => {
  const { showToast, setLoading } = useFeedback();
  const [report, setReport] = React.useState<string>('');
  const [enabled, setEnabled] = React.useState<string>(()=> localStorage.getItem('linktrove.backend') || 'storage');
  const [migrated, setMigrated] = React.useState<boolean>(()=> localStorage.getItem('migrated.v1') === 'true');
  const svc = React.useMemo(() => createExportImportService({ storage: createStorageService() }), []);
  return (
    <div>
      <div className="text-lg font-medium mb-2">Data Migration (to SQLite)</div>
      <div className="text-sm opacity-80 mb-2">只在後端選擇 SQLite 時需要遷移。建議先備份。</div>
      <div className="flex gap-2 items-center mb-2">
        <span className="text-xs px-2 py-1 rounded border border-slate-700">Backend: {enabled}</span>
        <span className="text-xs px-2 py-1 rounded border border-slate-700">Migrated: {migrated ? 'yes' : 'no'}</span>
      </div>
      <div className="flex gap-2 items-center mb-2">
        <button className="text-sm px-2 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={async ()=>{
          setLoading(true);
          try {
            const legacy = await buildLegacyStores(svc);
            const db = await createDatabaseManager('sqlite');
            const m = new MigrationService(db, legacy);
            const has = await m.detectLegacyData();
            if (!has) { setReport('無舊資料可遷移或已是 SQLite。'); setLoading(false); return; }
            const cats = (await legacy.loadCategories()).length;
            const pages = (await legacy.loadWebpages()).length;
            setReport(`Dry Run: categories=${cats}, bookmarks=${pages}`);
            showToast('Dry run 完成', 'success');
          } catch (e: any) {
            showToast(e?.message || 'Dry run 失敗', 'error');
          } finally { setLoading(false); }
        }}>Dry Run</button>
        <button className="text-sm px-2 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-50" disabled={enabled!=='sqlite'} onClick={async ()=>{
          setLoading(true);
          try {
            const legacy = await buildLegacyStores(svc);
            const db = await createDatabaseManager('sqlite');
            const m = new MigrationService(db, legacy);
            const res = await m.migrate({ onProgress: ()=>{} });
            const ok = await m.validate(res);
            // 建立分類映射（legacy 名稱 → DB 類別 id）
            const legacyCats = await legacy.loadCategories();
            const dbCats = await db.listCategories();
            const nameToDb = new Map(dbCats.map((c:any)=>[c.name, c.id]));
            const mapping: Record<string, number> = {};
            for (const c of legacyCats) {
              if (c?.name && nameToDb.has(c.name)) mapping[c.id] = nameToDb.get(c.name)!;
            }
            localStorage.setItem('linktrove.catmap', JSON.stringify(mapping));
            if (ok) {
              localStorage.setItem('migrated.v1', 'true'); setMigrated(true);
              setReport(`遷移完成：categories=${res.categories}, bookmarks=${res.bookmarks}, skipped=${res.skipped||0}, errors=${res.errors?.length||0}`);
              showToast('遷移完成', 'success');
            } else {
              setReport('遷移驗證失敗'); showToast('遷移驗證失敗','error');
            }
          } catch (e:any) {
            showToast(e?.message || '遷移失敗', 'error');
          } finally { setLoading(false); }
        }}>Execute Migration</button>
      </div>
      {report && (
        <div className="rounded border border-slate-700 bg-slate-900 p-2 text-xs whitespace-pre-wrap">{report}</div>
      )}
    </div>
  );
};

const SyncPanel: React.FC = () => {
  const { showToast } = useFeedback();
  const [logs, setLogs] = React.useState<string[]>([]);
  const [pass, setPass] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const onProgressFs = (p: any) => setLogs((l)=>[...l, `FS: ${p}`].slice(-10));
  const onProgressCloud = (p: any) => setLogs((l)=>[...l, `Cloud: ${p}`].slice(-10));
  const getEncryptor = React.useCallback(()=> pass.trim() ? new PassphraseBox(pass.trim()) : undefined, [pass]);
  const svc = React.useMemo(() => createExportImportService({ storage: createStorageService() }), []);
  return (
    <div>
      <div className="text-lg font-medium mb-2">Sync & Backup</div>
      <div className="mb-2 text-sm opacity-80">Demo adapters use localStorage as storage backend. This panel is non-invasive.</div>
      <div className="flex items-center gap-2 mb-2">
        <input className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm" placeholder="Passphrase (optional for E2E encryption)" value={pass} onChange={(e)=>setPass(e.target.value)} />
        <button className="text-sm px-2 py-1 rounded border border-slate-600 hover:bg-slate-800 disabled:opacity-50" disabled={busy} onClick={async ()=>{
          setBusy(true); setLogs([]);
          try {
            const fs = new LocalStorageFSAdapter();
            await backupWithEI(svc, (c)=>fs.writeFile('bundle.json', c), getEncryptor(), (p)=>onProgressFs(p));
            showToast('Backup saved (localStorage)', 'success');
          } catch { showToast('Backup failed','error'); } finally { setBusy(false); }
        }}>Backup Now</button>
        <button className="text-sm px-2 py-1 rounded border border-slate-600 hover:bg-slate-800 disabled:opacity-50" disabled={busy} onClick={async ()=>{
          setBusy(true); setLogs([]);
          try {
            const cloud = new LocalStorageCloudAdapter();
            const state = {
              async get() { try { return JSON.parse(localStorage.getItem('cloud.state')||'null'); } catch { return null; } },
              async set(v: any) { localStorage.setItem('cloud.state', JSON.stringify(v)); },
            };
            await cloudSyncWithEI(svc, {
              authorize: async ()=>{},
              stat: async ()=> cloud.stat('/linktrove.bundle.json'),
              download: async ()=> cloud.download('/linktrove.bundle.json'),
              upload: async (c)=> cloud.upload('/linktrove.bundle.json', c),
            }, state, getEncryptor(), (p)=>onProgressCloud(p));
            showToast('Cloud synced (localStorage)', 'success');
          } catch { showToast('Cloud sync failed','error'); } finally { setBusy(false); }
        }}>Sync Cloud</button>
      </div>
      <div className="max-h-32 overflow-auto rounded border border-slate-700 bg-slate-900 p-2 text-xs">
        {logs.length === 0 ? (<div className="opacity-60">No recent activity</div>) : (
          <ul className="space-y-1">{logs.map((l,idx)=>(<li key={idx}>{l}</li>))}</ul>
        )}
      </div>
    </div>
  );
};
