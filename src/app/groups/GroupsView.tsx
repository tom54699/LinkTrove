import React from 'react';
import { createStorageService } from '../../background/storageService';
import { useFeedback } from '../ui/feedback';
import { useWebpages } from '../webpages/WebpagesProvider';
import { CardGrid } from '../webpages/CardGrid';
import { broadcastGhostActive, getDragTab, getDragWebpage } from '../dnd/dragContext';
import { ContextMenu } from '../ui/ContextMenu';
import { useGroupShare } from './share/useGroupShare';
import { useGroupImport } from './import/useGroupImport';
import { ShareDialog, TokenDialog, ShareResultDialog } from './share/dialogs';
import { TobyImportDialog, TobyProgressDialog } from './import/dialogs';

interface GroupItem {
  id: string;
  categoryId: string;
  name: string;
  order: number;
}

export const GroupsView: React.FC<{ categoryId: string }> = ({ categoryId }) => {
  const { showToast } = useFeedback();
  const { items, actions } = useWebpages();
  const [groups, setGroups] = React.useState<GroupItem[]>([]);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [renameText, setRenameText] = React.useState<string>('');
  const [confirmDeleteGroup, setConfirmDeleteGroup] = React.useState<string | null>(null);
  // Compact actions menu per-group
  const [menuFor, setMenuFor] = React.useState<null | { id: string; x: number; y: number }>(null);
  // Active drop target group
  const [activeDropGroupId, setActiveDropGroupId] = React.useState<string | null>(null);

  // Use share hook for all sharing functionality
  const {
    shareDialogOpen,
    shareGroup,
    shareTitle,
    shareDescription,
    showTokenDialog,
    githubToken,
    shareResultUrl,
    setShareDialogOpen,
    setShareTitle,
    setShareDescription,
    setShowTokenDialog,
    setGithubToken,
    setShareResultUrl,
    openShareDialog,
    publishToGist,
    generateShareFile,
  } = useGroupShare({ categoryId, items, showToast });

  // Use import hook for all import functionality
  const {
    tobyOpenFor,
    tobyFile,
    tobyPreview,
    tobyProgress,
    handleHtmlImport,
    handleTobyFileSelect,
    executeTobyImport,
    cancelTobyImport,
    abortTobyImport,
  } = useGroupImport({ categoryId, groups, showToast, reloadWebpages: actions.load });

  const svc = React.useMemo(() => {
    return createStorageService();
  }, []);

  const load = React.useCallback(async () => {
    try {
      if (!svc) return;
      const list = (await (svc as any).listSubcategories?.(categoryId)) || [];
      const m = new Map<string, GroupItem>();
      for (const g of list as any[]) if (!m.has(g.id)) m.set(g.id, g);
      setGroups(Array.from(m.values()));
    } catch {}
  }, [svc, categoryId]);

  const persistCollapsed = React.useCallback(async (next: Record<string, boolean>) => {
    setCollapsed(next);
    try {
      const key = `ui.groupsCollapsed.${categoryId}`;
      chrome.storage?.local?.set?.({ [key]: next });
    } catch {}
  }, [categoryId]);

  React.useEffect(() => {
    load();
    const onChanged = () => { load(); };
    try { window.addEventListener('groups:changed', onChanged as any); } catch {}
    const onCollapseAll = (ev: any) => {
      try {
        const det = ev?.detail || {};
        if (!det || det.categoryId !== categoryId) return;
        const doCollapse = !!det.collapsed;
        const next: Record<string, boolean> = {};
        for (const g of groups) next[g.id] = doCollapse;
        void persistCollapsed(next);
      } catch {}
    };
    try { window.addEventListener('groups:collapse-all', onCollapseAll as any); } catch {}
    return () => {
      try { window.removeEventListener('groups:changed', onChanged as any); } catch {}
      try { window.removeEventListener('groups:collapse-all', onCollapseAll as any); } catch {}
    };
  }, [load, categoryId, persistCollapsed]);

  React.useEffect(() => {
    (async () => {
      try {
        const key = `ui.groupsCollapsed.${categoryId}`;
        const got: any = await new Promise((resolve) => {
          try { chrome.storage?.local?.get?.({ [key]: {} }, resolve); } catch { resolve({}); }
        });
        const map = (got?.[key] as any) || {};
        setCollapsed(map);
      } catch {}
    })();
  }, [categoryId]);

  const rename = async (id: string, name: string) => {
    try {
      await (svc as any).renameSubcategory?.(id, name.trim() || 'group');
      await load();
      showToast('已重新命名', 'success');
    } catch {
      showToast('重新命名失敗', 'error');
    }
  };

  const remove = async (id: string) => {
    try {
      const latest: GroupItem[] = ((await (svc as any).listSubcategories?.(categoryId)) as any) || [];
      const others = latest.filter((g) => g.id !== id);
      if (others.length === 0) {
        showToast('刪除失敗：至少需要保留一個 Group', 'error');
        return;
      }
      if ((svc as any).deleteSubcategoryAndPages) {
        await (svc as any).deleteSubcategoryAndPages(id);
      } else {
        try {
          const ids = items.filter((it: any) => it.subcategoryId === id).map((it: any) => it.id);
          if (ids.length) await actions.deleteMany(ids);
        } catch {}
        try {
          await (svc as any).deleteSubcategory?.(id, '__NO_REASSIGN__');
        } catch {}
      }
      const { [id]: _omit, ...rest } = collapsed;
      await persistCollapsed(rest);
      await load();
      try { window.dispatchEvent(new CustomEvent('groups:changed')); } catch {}
      showToast('已刪除 Group 與其書籤', 'success');
    } catch {
      showToast('刪除失敗', 'error');
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = groups.findIndex((g) => g.id === id);
    if (idx === -1) return;
    const j = idx + dir;
    if (j < 0 || j >= groups.length) return;
    const next = [...groups];
    const [it] = next.splice(idx, 1);
    next.splice(j, 0, it);
    setGroups(next);
    try {
      await (svc as any).reorderSubcategories?.(categoryId, next.map((x) => x.id));
      showToast('已重新排序', 'success');
    } catch {}
  };

  const handleSaveToken = async () => {
    if (githubToken.trim()) {
      try {
        await new Promise<void>((resolve, reject) => {
          chrome.storage?.local?.set?.({ 'github.token': githubToken.trim() }, () => {
            if (chrome.runtime?.lastError) { reject(chrome.runtime.lastError); } else { resolve(); }
          });
        });
        setShowTokenDialog(false);
        setGithubToken('');
        showToast('GitHub Token 已安全儲存！', 'success');
        setTimeout(() => publishToGist(), 500);
      } catch {
        showToast('儲存 Token 失敗', 'error');
      }
    }
  };

  const handleCopyShareUrl = async () => {
    if (shareResultUrl) {
      try {
        await navigator.clipboard.writeText(shareResultUrl);
        showToast('已複製到剪貼簿', 'success');
      } catch {
        showToast('複製失敗', 'error');
      }
    }
  };

  const createNewGroup = async () => {
    try {
      if (!categoryId) return;
      const { createStorageService } = await import('../../background/storageService');
      const s = createStorageService();
      const list = (((await (s as any).listSubcategories?.(categoryId)) as any[]) || []);
      const lower = new Set(list.map((x:any)=>String(x.name||'').toLowerCase()));
      let name = 'group';
      let i = 2;
      while (lower.has(name.toLowerCase())) name = `group ${i++}`;
      await (s as any).createSubcategory?.(categoryId, name);
      load();
      try { window.dispatchEvent(new CustomEvent('groups:changed')); } catch {}
      showToast(`已新增 ${name}`, 'success');
    } catch {
      showToast('新增失敗', 'error');
    }
  };

  const handleGroupDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Stop propagation to prevent multiple highlights
    e.dataTransfer.dropEffect = 'move';
    if (activeDropGroupId !== groupId) {
      setActiveDropGroupId(groupId);
    }
  };

  const handleGroupDragLeave = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    const currentTarget = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    // Only clear if we really left the section (not entering a child like Header or CardGrid)
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      if (activeDropGroupId === groupId) {
        setActiveDropGroupId(null);
      }
    }
  };

  const handleGroupDrop = async (e: React.DragEvent, g: GroupItem) => {
    e.preventDefault();
    e.stopPropagation(); // Consume the event so parents/children don't double-handle if logic overlaps
    setActiveDropGroupId(null);

    try {
      const fromId = e.dataTransfer.getData('application/x-linktrove-webpage');
      if (fromId) {
        // Drop Existing Card -> Move to End of Group
        if ((svc as any).moveCardToGroup) {
          await (svc as any).moveCardToGroup(fromId, g.categoryId, g.id, '__END__');
        } else {
          await actions.updateCategory(fromId, g.categoryId);
          await (svc as any).updateCardSubcategory?.(fromId, g.id);
          await (actions as any).moveToEnd(fromId);
        }
        await actions.load();
        try { broadcastGhostActive(null); } catch {}
        showToast('已移動到 group', 'success');
        return;
      }

      // Drop New Tab -> Create Card at End of Group
      let raw = '';
      try { raw = e.dataTransfer.getData('application/x-linktrove-tab'); } catch {}
      let tab: any = null;
      if (raw) tab = JSON.parse(raw);
      if (!tab) { try { tab = (getDragTab() as any) || null; } catch { tab = null; } }
      
      if (tab) {
        const createdId = (await actions.addFromTab(tab as any)) as any as string;
        await actions.updateCategory(createdId, g.categoryId);
        await (svc as any).updateCardSubcategory?.(createdId, g.id);
        await (actions as any).moveToEnd(createdId);
        await actions.load();
        try { broadcastGhostActive(null); } catch {}
        showToast('已從分頁建立並加入 group', 'success');
      }
    } catch {
      try { broadcastGhostActive(null); } catch {}
      showToast('操作失敗', 'error');
    }
  };

  if (!svc) return null;

  return (
    <div className="space-y-6 mt-3 pb-20">
      {groups.map((g) => {
        const groupItems = items.filter((it: any) => it.category === categoryId && it.subcategoryId === g.id);
        const isCollapsed = !!collapsed[g.id];
        const isActive = activeDropGroupId === g.id;

        return (
          <section 
            key={g.id} 
            className={`group-container group/container transition-all rounded-xl border ${isActive ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-[0_0_15px_rgba(var(--accent-rgb),0.15)]' : 'border-transparent'}`}
            onDragOver={(e) => handleGroupDragOver(e, g.id)}
            onDragEnter={(e) => handleGroupDragOver(e, g.id)} // Handle enter same as over for highlight
            onDragLeave={(e) => handleGroupDragLeave(e, g.id)}
            onDrop={(e) => handleGroupDrop(e, g)}
          >
            <header className="flex items-center gap-3 mb-4 select-none p-2 rounded-t-xl">
              <button
                className="text-[var(--muted)] hover:text-[var(--text)] transition-transform duration-200"
                style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                onClick={() => persistCollapsed({ ...collapsed, [g.id]: !isCollapsed })}
                title={isCollapsed ? '展開' : '摺疊'}
              >
                ▼
              </button>
              
              {renaming === g.id ? (
                <input
                  className="text-base font-bold bg-transparent border-b border-[var(--accent)] outline-none px-1"
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onBlur={() => { setRenaming(null); void rename(g.id, renameText); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { setRenaming(null); void rename(g.id, renameText); }
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  autoFocus
                />
              ) : (
                <h2 
                  className="text-base font-bold text-[var(--text)] cursor-text"
                  onDoubleClick={() => { setRenaming(g.id); setRenameText(g.name); }}
                >
                  {g.name}
                </h2>
              )}

              <span className="text-xs font-bold text-[var(--muted)] bg-[var(--surface)] px-2 py-0.5 rounded-full border border-white/5">
                {groupItems.length}
              </span>

              <div className="flex items-center gap-1 ml-auto opacity-0 group-hover/container:opacity-100 transition-all duration-200">
                {/* Open All Tabs Button */}
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-all active:scale-95"
                  title="開啟全部分頁"
                  onClick={(e) => {
                    e.stopPropagation();
                    groupItems.forEach(item => window.open(item.url, '_blank'));
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  <span>OPEN TABS</span>
                </button>

                {/* Group Settings Button */}
                <button
                  className="p-2 text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-all active:scale-90"
                  title="群組設定"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menuFor?.id === g.id) {
                      setMenuFor(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuFor({ id: g.id, x: rect.right, y: rect.bottom + 8 });
                    }
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                  </svg>
                </button>
              </div>
            </header>

            {/* Context menu for this group */}
            {menuFor?.id === g.id && (
              <ContextMenu
                x={menuFor.x}
                y={menuFor.y}
                align="right"
                onClose={() => setMenuFor(null)}
                items={[
                  { 
                    key: 'share', 
                    label: '分享此群組', 
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>,
                    onSelect: () => { setMenuFor(null); void openShareDialog(g); } 
                  },
                  { 
                    key: 'import-html', 
                    label: '匯入 HTML', 
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
                    onSelect: () => { setMenuFor(null); try { document.getElementById(`html-file-${g.id}`)?.click(); } catch {} } 
                  },
                  { 
                    key: 'import-toby', 
                    label: '匯入 Toby', 
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>,
                    onSelect: () => { setMenuFor(null); try { document.getElementById(`toby-file-${g.id}`)?.click(); } catch {} } 
                  },
                  { 
                    key: 'rename', 
                    label: '重新命名', 
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                    onSelect: () => { setMenuFor(null); setRenaming(g.id); setRenameText(g.name); } 
                  },
                  { 
                    key: 'move-up', 
                    label: '上移', 
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>,
                    onSelect: () => { setMenuFor(null); void move(g.id, -1); } 
                  },
                  { 
                    key: 'move-down', 
                    label: '下移', 
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>,
                    onSelect: () => { setMenuFor(null); void move(g.id, 1); } 
                  },
                  { 
                    key: 'delete', 
                    label: '刪除', 
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
                    className: 'text-red-400 hover:text-red-300 hover:bg-red-950/20',
                    onSelect: () => { setMenuFor(null); setConfirmDeleteGroup(g.id); } 
                  },
                ]}
              />
            )}

            {!isCollapsed && (
              <div className="min-h-[40px] px-2 pb-2">
                <CardGrid
                  items={groupItems}
                  onDropTab={async (tab: any, beforeId?: string) => {
                    try {
                      const createdId = (await actions.addFromTab(tab as any)) as any as string;
                      await actions.updateCategory(createdId, g.categoryId);
                      await (svc as any).updateCardSubcategory?.(createdId, g.id);
                      if (beforeId && beforeId !== '__END__') {
                        await actions.reorder(createdId, beforeId);
                      } else if (beforeId === '__END__') {
                        await (actions as any).moveToEnd(createdId);
                      }
                      await actions.load();
                      showToast('已從分頁建立並加入 group', 'success');
                    } catch {
                      showToast('建立失敗', 'error');
                    }
                  }}
                  onDropExistingCard={async (cardId, beforeId) => {
                    setActiveDropGroupId(null);
                    try {
                      if ((svc as any).moveCardToGroup) {
                        await (svc as any).moveCardToGroup(cardId, g.categoryId, g.id, beforeId);
                      } else {
                        // Fallback:
                        // 1. Update category (data property)
                        await actions.updateCategory(cardId, g.categoryId);

                        // 2. Ensure card is in the target group's order list (by moving to end)
                        // This handles both the subcategoryId update and the order array insertion
                        await (svc as any).updateCardSubcategory?.(cardId, g.id);
                        await (actions as any).moveToEnd(cardId);

                        // 3. If specific position needed, reorder it
                        if (beforeId && beforeId !== '__END__') {
                          await actions.reorder(cardId, beforeId);
                        }
                      }
                      await actions.load();
                      try { broadcastGhostActive(null); } catch {}
                      showToast('已移動到 group', 'success');
                    } catch {
                      try { broadcastGhostActive(null); } catch {}
                      showToast('移動失敗', 'error');
                    }
                  }}
                  onDeleteMany={async (ids) => { await actions.deleteMany(ids); showToast('Deleted selected', 'success'); }}
                  onDeleteOne={async (id) => { await actions.deleteOne(id); showToast('Deleted', 'success'); }}
                  onEditDescription={async (id, description) => { await actions.updateDescription(id, description); showToast('Saved note', 'success'); }}
                  onSave={async (id, patch) => { await actions.updateCard(id, patch); showToast('Saved', 'success'); }}
                  onUpdateTitle={(id, title) => actions.updateTitle(id, title)}
                  onUpdateUrl={(id, url) => actions.updateUrl(id, url)}
                  onUpdateCategory={(id, cat) => actions.updateCategory(id, cat)}
                  onUpdateMeta={(id, meta) => actions.updateMeta(id, meta)}
                />
              </div>
            )}
          </section>
        );
      })}

      {/* Add New Group Placeholder */}
      <button 
        className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 rounded-2xl text-[var(--muted)] hover:text-[var(--accent)] font-semibold transition-all duration-200 flex items-center justify-center gap-2"
        onClick={createNewGroup}
      >
        <span>+</span> Create New Group
      </button>

      {confirmDeleteGroup && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
          onClick={() => setConfirmDeleteGroup(null)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--bg)] w-[520px] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Delete Group"
          >
            <div className="px-5 py-4 border-b border-slate-700">
              <div className="text-lg font-semibold">刪除 Group</div>
              <div className="text-xs opacity-80 mt-1">
                刪除此 group 以及其底下的書籤？此操作無法復原。
              </div>
            </div>
            <div className="px-5 py-3 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => setConfirmDeleteGroup(null)}
              >
                取消
              </button>
              <button
                className="px-3 py-1 rounded border border-rose-700 text-rose-300 hover:bg-rose-950/30"
                onClick={async () => {
                  const id = confirmDeleteGroup;
                  setConfirmDeleteGroup(null);
                  if (id) await remove(id);
                }}
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
      <TobyImportDialog
        isOpen={!!tobyOpenFor}
        fileName={tobyFile?.name}
        linkCount={tobyPreview?.links}
        onCancel={cancelTobyImport}
        onConfirm={executeTobyImport}
      />

      <TobyProgressDialog
        isOpen={!!tobyProgress}
        processed={tobyProgress?.processed || 0}
        total={tobyProgress?.total || 0}
        onCancel={abortTobyImport}
      />

      <ShareDialog
        isOpen={shareDialogOpen}
        groupName={shareGroup?.name || ''}
        itemCount={items.filter((it: any) => it.category === categoryId && it.subcategoryId === shareGroup?.id).length}
        shareTitle={shareTitle}
        shareDescription={shareDescription}
        onClose={() => setShareDialogOpen(false)}
        onTitleChange={setShareTitle}
        onDescriptionChange={setShareDescription}
        onPublishToGist={publishToGist}
        onDownloadHtml={generateShareFile}
      />

      <TokenDialog
        isOpen={showTokenDialog}
        token={githubToken}
        onClose={() => {
          setShowTokenDialog(false);
          setGithubToken('');
        }}
        onTokenChange={setGithubToken}
        onSave={handleSaveToken}
      />

      <ShareResultDialog
        isOpen={!!shareResultUrl}
        shareUrl={shareResultUrl}
        onClose={() => setShareResultUrl(null)}
        onCopy={handleCopyShareUrl}
      />
    </div>
  );
};
