import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from './AppContext';
import { ThreeColumnLayout } from './layout/ThreeColumn';
import { OpenTabsProvider } from './tabs/OpenTabsProvider';
import { TemplatesProvider } from './templates/TemplatesProvider';
import { TabsPanel } from './tabs/TabsPanel';
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
  const { items, actions: pagesActions } = useWebpages();
  const {
    selectedId,
    actions: catActions,
    setCurrentCategory,
  } = useCategories();
  // Simplify to a single view; remove density switching
  const [_collapsed, setCollapsed] = React.useState(false);
  const { showToast, setLoading } = useFeedback();
  const [creatingGroup, setCreatingGroup] = React.useState(false);
  const [showAddCat, setShowAddCat] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState('');
  const [newCatColor, setNewCatColor] = React.useState('#64748b');
  // HTML import (new collection) modal state
  const [htmlImportFile, setHtmlImportFile] = React.useState<File | null>(null);
  const [htmlImportOpen, setHtmlImportOpen] = React.useState(false);
  const [htmlImportName, setHtmlImportName] = React.useState('');
  const [htmlImportMode, setHtmlImportMode] = React.useState<'multi' | 'flat'>('multi');
  const [htmlImportFlatName, setHtmlImportFlatName] = React.useState('Imported');
  const [htmlImportDedup, setHtmlImportDedup] = React.useState(true);
  const [htmlPreview, setHtmlPreview] = React.useState<{ groups: number; links: number } | null>(null);
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
                {/* Category-level HTML import (create a NEW collection; multi-group by H3) */}
                <input
                  id="html-cat-file"
                  type="file"
                  accept="text/html,.html"
                  aria-label="Import HTML bookmarks to collection"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.currentTarget.files?.[0];
                    e.currentTarget.value = '';
                    if (!f) return;
                    // Open pretty modal to capture optional collection name
                    setHtmlImportFile(f);
                    setHtmlImportName('');
                    setHtmlImportMode('multi');
                    setHtmlImportFlatName('Imported');
                    setHtmlImportDedup(true);
                    // parse preview
                    try {
                      const text = await f.text();
                      const mod = await import('../background/importers/html');
                      const map = mod.parseNetscapeGroups(text);
                      let groups = 0; let links = 0;
                      map.forEach((arr: any[]) => { groups++; links += (arr?.length || 0); });
                      setHtmlPreview({ groups, links });
                    } catch { setHtmlPreview(null); }
                    setHtmlImportOpen(true);
                  }}
                />
                <button
                  className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-800 mr-2"
                  title="匯入 HTML 書籤至新集合（依資料夾建立群組）"
                  aria-label="匯入 HTML 書籤（新集合）"
                  onClick={() => {
                    try { document.getElementById('html-cat-file')?.click(); } catch {}
                  }}
                >
                  匯入 HTML（新集合）
                </button>
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
                      // Generate a unique name: group, group 2, group 3...
                      const list = (((await (s as any).listSubcategories?.(selectedId)) as any[]) || []);
                      const lower = new Set(list.map((x:any)=>String(x.name||'').toLowerCase()));
                      let name = 'group';
                      let i = 2;
                      while (lower.has(name.toLowerCase())) name = `group ${i++}`;
                      await (s as any).createSubcategory?.(selectedId, name);
                      try { window.dispatchEvent(new CustomEvent('groups:changed')); } catch {}
                      showToast(`已新增 ${name}`, 'success');
                    } catch {
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
      {htmlImportOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
          onClick={() => setHtmlImportOpen(false)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--panel)] p-5 w-[420px] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Import HTML to new Collection"
          >
            <div className="text-lg font-medium mb-3">匯入 HTML（新集合）</div>
            <div className="space-y-3">
              <div className="text-sm opacity-80">檔案：{htmlImportFile?.name}</div>
              {htmlPreview && (
                <div className="text-xs opacity-80">預覽：群組 {htmlPreview.groups}、連結 {htmlPreview.links}</div>
              )}
              <div>
                <label className="block text-sm mb-1">集合名稱（可留空自動命名）</label>
                <input
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={htmlImportName}
                  onChange={(e) => setHtmlImportName(e.target.value)}
                  placeholder="Imported"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">匯入模式</label>
                <div className="flex items-center gap-4 text-sm">
                  <label className="inline-flex items-center gap-1">
                    <input type="radio" name="html-mode" checked={htmlImportMode==='multi'} onChange={() => setHtmlImportMode('multi')} />
                    <span>依資料夾建立多群組</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input type="radio" name="html-mode" checked={htmlImportMode==='flat'} onChange={() => setHtmlImportMode('flat')} />
                    <span>扁平匯入到單一群組</span>
                  </label>
                </div>
              </div>
              {htmlImportMode === 'flat' && (
                <div>
                  <label className="block text-sm mb-1">群組名稱</label>
                  <input
                    className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                    value={htmlImportFlatName}
                    onChange={(e) => setHtmlImportFlatName(e.target.value)}
                    placeholder="Imported"
                  />
                </div>
              )}
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={htmlImportDedup} onChange={(e)=>setHtmlImportDedup(e.currentTarget.checked)} />
                <span>略過集合內已存在的相同 URL</span>
              </label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => setHtmlImportOpen(false)}
              >
                取消
              </button>
              <button
                className="px-3 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-50"
                onClick={async () => {
                  if (!htmlImportFile) { setHtmlImportOpen(false); return; }
                  setHtmlImportOpen(false);
                  setLoading(true);
                  try {
                    const text = await htmlImportFile.text();
                    const { importNetscapeHtmlAsNewCategory } = await import('../background/importers/html');
                    const res = await importNetscapeHtmlAsNewCategory(text, { name: htmlImportName.trim() || undefined, mode: htmlImportMode, flatGroupName: htmlImportFlatName.trim() || undefined, dedupSkip: htmlImportDedup });
                    try { await pagesActions.load(); } catch {}
                    try { await catActions?.reload?.(); } catch {}
                    try { setCurrentCategory(res.categoryId); } catch {}
                    try { window.dispatchEvent(new CustomEvent('groups:changed')); } catch {}
                    showToast(`已匯入 HTML 至新集合「${res.categoryName}」：新增 ${res.pagesCreated} 筆，群組 ${res.groupsCreated}`, 'success');
                  } catch (err: any) {
                    const msg = (err && (err.message || String(err))) || '匯入失敗';
                    showToast(msg, 'error');
                  } finally {
                    setLoading(false);
                    setHtmlImportFile(null);
                    setHtmlImportName('');
                    setHtmlPreview(null);
                  }
                }}
              >
                開始匯入
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
  const [file, setFile] = React.useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [inlineMsg, setInlineMsg] = React.useState<
    null | { kind: 'success' | 'error'; text: string }
  >(null);
  const { actions: pagesActions } = useWebpages();
  const { actions: catActions } = useCategories() as any;
  const { actions: tplActions } = useTemplates() as any;

  function humanSize(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }


  async function performImport() {
    if (!file) {
      showToast('請選擇 JSON 檔案', 'error');
      return;
    }
    setConfirmOpen(false);
    setLoading(true);
    setInlineMsg(null);
    try {
      const text = await file.text();
      // Create a simple summary even without preview
      let pagesCount = 0;
      let catsCount = 0;
      try {
        const parsed = JSON.parse(text);
        pagesCount = Array.isArray(parsed?.webpages) ? parsed.webpages.length : 0;
        catsCount = Array.isArray(parsed?.categories) ? parsed.categories.length : 0;
      } catch {}
      if (ei) {
        await svc.importJsonMerge(text);
      } else {
        const storage = createStorageService();
        await (storage as any).importData(text);
      }
      try { await pagesActions.load(); } catch {}
      try { await catActions?.reload?.(); } catch {}
      try { await tplActions?.reload?.(); } catch {}
      const summary = `Imported: ${pagesCount} pages, ${catsCount} categories`;
      setInlineMsg({ kind: 'success', text: summary });
      showToast('Import success', 'success');
    } catch (e: any) {
      const msg = e?.message || 'Import failed';
      setInlineMsg({ kind: 'error', text: msg });
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <div className="space-y-8">
        <div className="rounded border border-slate-700 bg-[var(--panel)] p-4">
          <div className="mb-2 text-lg font-semibold">專案備份與還原（僅本專案）</div>
          <div className="text-sm opacity-80 mb-4">
            此區塊用於本專案格式的 JSON 備份與還原，僅適用於本專案資料的匯出/匯入。
            與「群組」的匯出/匯入不同（可對接外部來源或其他服務），這裡的匯入會完全取代目前資料，建議先匯出備份。
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">匯出備份（本專案格式）</div>
              <button
                className="text-sm px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
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

            <div className="border-t border-slate-700 pt-4">
              <div className="text-sm font-medium mb-2">還原（取代現有資料）</div>
              <div
                className="rounded border-2 border-dashed border-slate-600 hover:border-emerald-600/70 hover:bg-emerald-950/10 p-3 text-sm"
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) {
                    setFile(f);
                    try {
                      JSON.parse(await f.text());
                    } catch {
                      showToast('Invalid JSON', 'error');
                    }
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    id="import-json-file"
                    aria-label="Import JSON file"
                    type="file"
                    accept="application/json,.json"
                    className="text-sm"
                    onChange={async (e) => {
                      const f = e.currentTarget.files?.[0] ?? null;
                      setFile(f);
                      if (f) {
                        try {
                          JSON.parse(await f.text());
                        } catch {
                          showToast('Invalid JSON', 'error');
                        }
                      }
                    }}
                    onClick={(e) => {
                      (e.currentTarget as HTMLInputElement).value = '';
                    }}
                  />
                  {file && (
                    <div className="text-xs opacity-80">
                      {file.name} — {humanSize(file.size)}
                    </div>
                  )}
                  <button
                    className="ml-auto text-sm px-3 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-50"
                    disabled={!file}
                    onClick={() => {
                      if (!file) return showToast('請選擇 JSON 檔案', 'error');
                      if (ei) {
                        void performImport();
                      } else {
                        setConfirmOpen(true);
                      }
                    }}
                  >
                    Import JSON
                  </button>
                </div>
              </div>
            </div>
          </div>

          {inlineMsg && (
            <div
              className={`mt-3 text-sm px-3 py-2 rounded border ${
                inlineMsg.kind === 'success'
                  ? 'bg-emerald-900/30 border-emerald-700'
                  : 'bg-red-900/30 border-red-700'
              }`}
            >
              {inlineMsg.text}
            </div>
          )}

          {confirmOpen && (
            <div
              className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
              onClick={() => setConfirmOpen(false)}
            >
              <div
                className="rounded border border-slate-700 bg-[var(--panel)] w-[520px] max-w-[95vw]"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="Confirm Import"
              >
                <div className="px-5 py-4 border-b border-slate-700">
                  <div className="text-lg font-semibold">確認匯入</div>
                  <div className="text-xs opacity-80 mt-1">將取代現有資料。檔案：{file ? `${file.name} — ${humanSize(file.size)}` : ''}</div>
                </div>
                <div className="px-5 py-3 flex items-center justify-end gap-2">
                  <button
                    className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                    onClick={() => setConfirmOpen(false)}
                  >
                    取消
                  </button>
                  <button
                    className="px-3 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30"
                    onClick={performImport}
                  >
                    確認匯入
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <TemplatesManager />
      </div>
    </div>
  );
};
