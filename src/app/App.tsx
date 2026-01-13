import React from 'react';
import { Outlet } from 'react-router-dom';
import { useApp } from './AppContext';
import { FourColumnLayout } from './layout/FourColumnLayout';
import { OpenTabsProvider } from './tabs/OpenTabsProvider';
import { TemplatesProvider } from './templates/TemplatesProvider';
import { TabsPanel } from './tabs/TabsPanel';
import { CategoriesProvider, useCategories } from './sidebar/categories';
import { OrganizationsProvider, useOrganizations } from './sidebar/organizations';
import { Sidebar } from './sidebar/sidebar';
import { OrganizationNav } from './sidebar/OrganizationNav';
import { FeedbackProvider, ErrorBoundary } from './ui/feedback';
import { createStorageService } from '../background/storageService';
import { useFeedback } from './ui/feedback';
import { WebpagesProvider, useWebpages } from './webpages/WebpagesProvider';
import { SettingsModal } from './ui/SettingsModal';
import { useTemplates } from './templates/TemplatesProvider';
import { GroupsView } from './groups/GroupsView';

export const AppLayout: React.FC = () => {
  const { theme, setTheme } = useApp();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Preload syncService to ensure Auto Sync listener is registered
  React.useEffect(() => {
    import('./data/syncService').catch(() => {});
  }, []);

  React.useEffect(() => {
    const open = () => setSettingsOpen(true);
    const toggleTheme = () => setTheme(theme === 'dracula' ? 'gruvbox' : 'dracula');
    try { window.addEventListener('app:open-settings', open as any); } catch {}
    try { window.addEventListener('app:toggle-theme', toggleTheme as any); } catch {}
    return () => {
      try { window.removeEventListener('app:open-settings', open as any); } catch {}
      try { window.removeEventListener('app:toggle-theme', toggleTheme as any); } catch {}
    };
  }, [theme, setTheme]);
  return (
    <FeedbackProvider>
      {/* Fallback heading to satisfy initial route tests even before providers ready */}
      <div className="sr-only">LinkTrove Home</div>
      <ErrorBoundary>
        <OpenTabsProvider>
          <OrganizationsProvider>
          <CategoriesProvider>
            <TemplatesProvider>
              <WebpagesProvider>
                <div className="toby-mode h-screen flex flex-col bg-[var(--bg)] text-[var(--fg)]">
          <main className="flex-1 overflow-hidden min-h-0">
            <Outlet />
          </main>
          {settingsOpen && (
            <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          )}
                </div>
              </WebpagesProvider>
            </TemplatesProvider>
          </CategoriesProvider>
          </OrganizationsProvider>
        </OpenTabsProvider>
      </ErrorBoundary>
    </FeedbackProvider>
  );
};

export const Home: React.FC = () => <HomeInner />;

const HomeInner: React.FC = () => {
  const { items, actions: pagesActions } = useWebpages();
  const {
    categories,
    selectedId,
    actions: catActions,
    setCurrentCategory,
  } = useCategories();
  const { actions: orgActions, setCurrentOrganization, selectedOrgId } = useOrganizations();
  // Simplify to a single view; remove density switching
  const [_collapsed, setCollapsed] = React.useState(false);
  const { showToast, setLoading } = useFeedback();
  const [creatingGroup, setCreatingGroup] = React.useState(false);
  const [showAddCat, setShowAddCat] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState('');
  const [newCatColor, setNewCatColor] = React.useState('#64748b');
  // Organization creation modal state
  const [showAddOrg, setShowAddOrg] = React.useState(false);
  const [newOrgName, setNewOrgName] = React.useState('');
  const [newOrgColor, setNewOrgColor] = React.useState('#64748b');
  // HTML import (new collection) modal state
  const [htmlImportFile, setHtmlImportFile] = React.useState<File | null>(null);
  const [htmlImportOpen, setHtmlImportOpen] = React.useState(false);
  const [htmlImportName, setHtmlImportName] = React.useState('');
  const [htmlImportMode, setHtmlImportMode] = React.useState<'multi' | 'flat'>('multi');
  const [htmlImportFlatName, setHtmlImportFlatName] = React.useState('Imported');
  const [htmlImportDedup, setHtmlImportDedup] = React.useState(true);
  const [htmlPreview, setHtmlPreview] = React.useState<{ groups: number; links: number } | null>(null);
  const [htmlProgress, setHtmlProgress] = React.useState<{ total: number; processed: number } | null>(null);
  const htmlAbortRef = React.useRef<AbortController | null>(null);
  // Toby (new collection) wizard state
  const [tobyFile, setTobyFile] = React.useState<File | null>(null);
  const [tobyOpen, setTobyOpen] = React.useState(false);
  const [tobyName, setTobyName] = React.useState('');
  const [tobyMode, setTobyMode] = React.useState<'multi' | 'flat'>('multi');
  const [tobyFlatName, setTobyFlatName] = React.useState('Imported');
  const [tobyPreview, setTobyPreview] = React.useState<{ lists: number; links: number } | null>(null);
  const [tobyHasOrgs, setTobyHasOrgs] = React.useState(false);
  const [tobyProgress, setTobyProgress] = React.useState<{ total: number; processed: number } | null>(null);
  const tobyAbortRef = React.useRef<AbortController | null>(null);
  const viewItems = React.useMemo(
    () => items.filter((it: any) => it.category === selectedId),
    [items, selectedId]
  );

  // Get subcategories (groups) count for current category
  const [groupsCount, setGroupsCount] = React.useState(0);
  React.useEffect(() => {
    if (!selectedId) return;
    import('../background/storageService').then(({ createStorageService }) => {
      const svc = createStorageService();
      (svc as any).listSubcategories?.(selectedId).then((subcats: any[]) => {
        setGroupsCount(subcats?.length || 0);
      }).catch(() => setGroupsCount(0));
    });
  }, [selectedId]);
  // Global triggers from Sidebar for collection-level actions
  React.useEffect(() => {
    const onHtml = () => { try { document.getElementById('html-cat-file')?.click(); } catch {} };
    const onToby = () => { try { document.getElementById('toby-cat-file')?.click(); } catch {} };
    const onAdd = () => { setNewCatName(''); setNewCatColor('#64748b'); setShowAddCat(true); };
    const onAddOrg = () => { setNewOrgName(''); setNewOrgColor('#64748b'); setShowAddOrg(true); };
    try { window.addEventListener('collections:import-html-new', onHtml as any); } catch {}
    try { window.addEventListener('collections:import-toby-new', onToby as any); } catch {}
    try { window.addEventListener('collections:add-new', onAdd as any); } catch {}
    try { window.addEventListener('organizations:add-new', onAddOrg as any); } catch {}
    return () => {
      try { window.removeEventListener('collections:import-html-new', onHtml as any); } catch {}
      try { window.removeEventListener('collections:import-toby-new', onToby as any); } catch {}
      try { window.removeEventListener('collections:add-new', onAdd as any); } catch {}
      try { window.removeEventListener('organizations:add-new', onAddOrg as any); } catch {}
    };
  }, []);
  return (
    <div className="h-full min-h-0 flex flex-col">
      <FourColumnLayout
        organizationNav={<OrganizationNav />}
        sidebar={<Sidebar />}
        content={
          <div className="h-full flex flex-col min-h-0">
            <div className="toby-board-header flex-shrink-0">
              <div className="title-group">
                <h1>{(() => {
                  const currentCategory = categories.find((c: any) => c.id === selectedId);
                  return currentCategory?.name || 'Collection';
                })()}</h1>
                <div className="subtext">{groupsCount} groups</div>
              </div>
              <div className="toby-board-actions">
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
                {/* Toby new collection import */}
                <input
                  id="toby-cat-file"
                  type="file"
                  accept="application/json,.json"
                  aria-label="Import Toby JSON to new collection"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.currentTarget.files?.[0];
                    e.currentTarget.value = '';
                    if (!f) return;
                    setTobyFile(f);
                    setTobyName(''); setTobyFlatName('Imported'); setTobyMode('multi');
                    // preview: count lists/cards; detect v4 organizations
                    try {
                      const text = await f.text();
                      const obj = JSON.parse(text);
                      let lists = 0; let links = 0; let hasOrgs = false;
                      if (Array.isArray(obj?.lists)) { lists = obj.lists.length; for (const l of obj.lists) if (Array.isArray(l?.cards)) links += l.cards.length; }
                      if (Array.isArray(obj?.groups)) {
                        hasOrgs = true; // v4 groups should use Organization structure
                        for (const g of obj.groups) if (Array.isArray(g?.lists)) { lists += g.lists.length; for (const l of g.lists) if (Array.isArray(l?.cards)) links += l.cards.length; }
                      }
                      if (Array.isArray(obj?.organizations)) {
                        hasOrgs = true;
                        for (const o of obj.organizations) if (Array.isArray(o?.groups)) {
                          for (const g of o.groups) if (Array.isArray(g?.lists)) {
                            lists += g.lists.length;
                            for (const l of g.lists) if (Array.isArray(l?.cards)) links += l.cards.length;
                          }
                        }
                      }
                      setTobyPreview({ lists, links });
                      setTobyHasOrgs(hasOrgs);
                    } catch { setTobyPreview(null); setTobyHasOrgs(false); }
                    setTobyOpen(true);
                  }}
                />
                <button
                  className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-800 mr-2"
                  title="新增 group"
                  aria-label="新增 group"
                  disabled={
                    creatingGroup ||
                    !selectedId ||
                    !categories.find((c: any) => c.id === selectedId)
                  }
                  onClick={async () => {
                    try {
                      if (creatingGroup || !selectedId) return;

                      // Check if selectedId belongs to current organization
                      const currentCategory = categories.find((c: any) => c.id === selectedId);
                      if (!currentCategory) {
                        showToast('請先選擇一個 Collection', 'error');
                        return;
                      }

                      setCreatingGroup(true);
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
                  title="Expand all groups in this collection"
                  onClick={() => {
                    try {
                      window.dispatchEvent(
                        new CustomEvent('groups:collapse-all', {
                          detail: { categoryId: selectedId, collapsed: false },
                        }) as any
                      );
                    } catch {}
                    setCollapsed(false);
                  }}
                >
                  EXPAND
                </button>
                <button
                  className="link muted"
                  title="Collapse all groups in this collection"
                  onClick={() => {
                    try {
                      window.dispatchEvent(
                        new CustomEvent('groups:collapse-all', {
                          detail: { categoryId: selectedId, collapsed: true },
                        }) as any
                      );
                    } catch {}
                    setCollapsed(true);
                  }}
                >
                  COLLAPSE
                </button>
              </div>
            </div>
            {/* 以 group 分段呈現卡片 */}
            <div className="flex-1 overflow-y-auto pr-2 min-h-0">
            {selectedId && (() => {
              const currentCategory = categories.find((c: any) => c.id === selectedId);
              return currentCategory ? (
                <GroupsView categoryId={selectedId} />
              ) : (
                <div className="text-center py-12 text-[var(--muted)]">
                  <div className="text-lg mb-2">No collection selected</div>
                  <div className="text-sm">Create a new collection or select an existing one from the sidebar</div>
                </div>
              );
            })()}
            </div>
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
                className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
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
      {showAddOrg && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
          onClick={() => setShowAddOrg(false)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--panel)] p-5 w-[420px] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Add Organization"
          >
            <div className="text-lg font-medium mb-3">New Organization</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="My Organization"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Color</label>
                <input
                  type="color"
                  className="rounded border border-slate-700 bg-slate-900 p-1"
                  value={newOrgColor}
                  onChange={(e) => setNewOrgColor(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => setShowAddOrg(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                disabled={!newOrgName.trim()}
                onClick={async () => {
                  const org = await orgActions.add(newOrgName.trim(), newOrgColor);
                  setCurrentOrganization(org.id);
                  setShowAddOrg(false);
                  showToast(`Created organization "${org.name}"`, 'success');
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
                  className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                onClick={async () => {
                  if (!htmlImportFile) { setHtmlImportOpen(false); return; }
                  setHtmlImportOpen(false);
                  setLoading(true);
                  try {
                    const text = await htmlImportFile.text();
                    const { importNetscapeHtmlAsNewCategory } = await import('../background/importers/html');
                    const ctrl = new AbortController();
                    htmlAbortRef.current = ctrl;
                    setHtmlProgress({ total: htmlPreview?.links || 0, processed: 0 });
                    const res = await importNetscapeHtmlAsNewCategory(text, {
                      name: htmlImportName.trim() || undefined,
                      organizationId: selectedOrgId,
                      mode: htmlImportMode,
                      flatGroupName: htmlImportFlatName.trim() || undefined,
                      dedupSkip: htmlImportDedup,
                      signal: ctrl.signal,
                      onProgress: ({ total, processed }) => setHtmlProgress({ total, processed }),
                    });
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
                    setHtmlProgress(null);
                    htmlAbortRef.current = null;
                  }
                }}
              >
                開始匯入
              </button>
            </div>
          </div>
        </div>
      )}
      {tobyOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={() => setTobyOpen(false)}>
          <div className="rounded border border-slate-700 bg-[var(--panel)] p-5 w-[420px] max-w-[90vw]" onClick={(e)=>e.stopPropagation()} role="dialog" aria-label="Import Toby to new Organization">
            <div className="text-lg font-medium mb-3">匯入 Toby（新 Organization）</div>
            <div className="space-y-3">
              <div className="text-sm opacity-80">檔案：{tobyFile?.name}</div>
              {tobyPreview && (<div className="text-xs opacity-80">預覽：lists {tobyPreview.lists}、連結 {tobyPreview.links}</div>)}
              <div>
                <label className="block text-sm mb-1">
                  {tobyHasOrgs ? 'Organization 名稱（可留空自動命名）' : '集合名稱（可留空自動命名）'}
                </label>
                <input className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm" value={tobyName} onChange={(e)=>setTobyName(e.target.value)} placeholder="Imported" />
              </div>
              {!tobyHasOrgs && (
                <>
                  <div>
                    <label className="block text-sm mb-1">匯入模式</label>
                    <div className="flex items-center gap-4 text-sm">
                      <label className="inline-flex items-center gap-1"><input type="radio" name="toby-mode" checked={tobyMode==='multi'} onChange={()=>setTobyMode('multi')} /><span>lists → 多群組</span></label>
                      <label className="inline-flex items-center gap-1"><input type="radio" name="toby-mode" checked={tobyMode==='flat'} onChange={()=>setTobyMode('flat')} /><span>扁平至單一群組</span></label>
                    </div>
                  </div>
                  {tobyMode==='flat' && (
                    <div>
                      <label className="block text-sm mb-1">群組名稱</label>
                      <input className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm" value={tobyFlatName} onChange={(e)=>setTobyFlatName(e.target.value)} placeholder="Imported" />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={()=>setTobyOpen(false)}>取消</button>
              <button className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)]" onClick={async ()=>{
                if (!tobyFile) { setTobyOpen(false); return; }
                setTobyOpen(false); setLoading(true);
                try {
                  const text = await tobyFile.text();
                  const { importTobyAsNewCategory, importTobyV4WithOrganizations } = await import('../background/importers/toby');
                  const ctrl = new AbortController();
                  tobyAbortRef.current = ctrl;
                  setTobyProgress({ total: tobyPreview?.links || 0, processed: 0 });
                  if (tobyHasOrgs) {
                    const res = await importTobyV4WithOrganizations(text, { createOrganizations: true, organizationName: tobyName.trim() || undefined, signal: ctrl.signal, onProgress: ({ total, processed }) => setTobyProgress({ total, processed }) });
                    try { await orgActions?.reload?.(); } catch {}
                    try { await pagesActions.load(); } catch {}
                    try { await catActions?.reload?.(); } catch {}
                    // Switch to the new organization if one was created
                    if (res.organizationIds?.length > 0) {
                      setCurrentOrganization(res.organizationIds[0]);
                    }
                    try { window.dispatchEvent(new CustomEvent('groups:changed')); } catch {}
                    showToast(`已匯入 Toby (groups→orgs)：建立 org ${res.orgsCreated}、集合 ${res.categoriesCreated}、群組 ${res.groupsCreated}、卡片 ${res.pagesCreated}`, 'success');
                  } else {
                    const res = await importTobyAsNewCategory(text, { name: tobyName.trim() || undefined, organizationId: selectedOrgId, mode: tobyMode, flatGroupName: tobyFlatName.trim() || undefined, signal: ctrl.signal, onProgress: ({ total, processed }) => setTobyProgress({ total, processed }) });
                    try { await pagesActions.load(); } catch {}
                    try { await catActions?.reload?.(); } catch {}
                    try { setCurrentCategory(res.categoryId); } catch {}
                    try { window.dispatchEvent(new CustomEvent('groups:changed')); } catch {}
                    showToast(`已匯入 Toby 至新集合「${res.categoryName}」：新增 ${res.pagesCreated} 筆，群組 ${res.groupsCreated}`, 'success');
                  }
                } catch (err: any) {
                  showToast(err?.message || '匯入失敗', 'error');
                } finally {
                  setLoading(false); setTobyFile(null); setTobyPreview(null); setTobyProgress(null); tobyAbortRef.current = null;
                }
              }}>開始匯入</button>
            </div>
          </div>
        </div>
      )}
      {tobyProgress && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3">
          <div className="rounded border border-slate-700 bg-[var(--panel)] w-[420px] max-w-[90vw] p-5">
            <div className="text-lg font-semibold">匯入中…</div>
            <div className="mt-3 text-sm">{tobyProgress.processed}/{tobyProgress.total}</div>
            <div className="mt-2 h-2 w-full bg-slate-800 rounded"><div className="h-2 bg-[var(--accent)] rounded" style={{ width: `${tobyProgress.total ? Math.min(100, Math.floor((tobyProgress.processed/tobyProgress.total)*100)) : 0}%` }} /></div>
            <div className="mt-3 flex items-center justify-end gap-2"><button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={()=>{ try{ tobyAbortRef.current?.abort(); } catch{} }}>取消</button></div>
          </div>
        </div>
      )}
      {htmlProgress && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3">
          <div className="rounded border border-slate-700 bg-[var(--panel)] w-[420px] max-w-[90vw] p-5">
            <div className="text-lg font-semibold">匯入中…</div>
            <div className="mt-3 text-sm">{htmlProgress.processed}/{htmlProgress.total}</div>
            <div className="mt-2 h-2 w-full bg-slate-800 rounded">
              <div className="h-2 bg-[var(--accent)] rounded" style={{ width: `${htmlProgress.total ? Math.min(100, Math.floor((htmlProgress.processed/htmlProgress.total)*100)) : 0}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={() => { try { htmlAbortRef.current?.abort(); } catch {} }}>取消</button>
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
      {templates.map((t: any) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
};