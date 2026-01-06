import React from 'react';
import { createStorageService } from '../../background/storageService';
import { useFeedback } from '../ui/feedback';
import { useWebpages } from '../webpages/WebpagesProvider';
import { CardGrid } from '../webpages/CardGrid';
import { broadcastGhostActive, getDragTab } from '../dnd/dragContext';
import type { TabItemData } from '../tabs/types';
import { dbg } from '../../utils/debug';
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
    // 直接使用 IndexedDB 版本的 storage service；在非擴充環境亦可運作
    return createStorageService();
  }, []);

  const load = React.useCallback(async () => {
    try {
      if (!svc) return;
      const list = (await (svc as any).listSubcategories?.(categoryId)) || [];
      // 去重（以 id 為準）
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
    // Expand/Collapse all listener
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
  }, [load, groups, categoryId, persistCollapsed]);

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
      // 以最新資料判斷，避免本地 state 與儲存不同步
      const latest: GroupItem[] =
        ((await (svc as any).listSubcategories?.(categoryId)) as any) || [];
      const others = latest.filter((g) => g.id !== id);
      if (others.length === 0) {
        showToast('刪除失敗：至少需要保留一個 group', 'error');
        return;
      }
      // 直接刪除該 group 及其關聯書籤
      if ((svc as any).deleteSubcategoryAndPages) {
        await (svc as any).deleteSubcategoryAndPages(id);
      } else {
        // 後備方案：以 UI 端刪除卡片後，再刪 group（較不原子）
        try {
          const ids = items.filter((it: any) => it.subcategoryId === id).map((it: any) => it.id);
          if (ids.length) await actions.deleteMany(ids);
        } catch {}
        try {
          // 無重指派版本：非原子，僅作為後備
          await (svc as any).deleteSubcategory?.(id, '__NO_REASSIGN__');
        } catch {}
      }
      // Remove collapse state for deleted group
      const { [id]: _omit, ...rest } = collapsed;
      await persistCollapsed(rest);
      await load();
      try { window.dispatchEvent(new CustomEvent('groups:changed')); } catch {}
      showToast('已刪除 group 與其書籤', 'success');
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

  // Handler for saving GitHub token
  const handleSaveToken = async () => {
    if (githubToken.trim()) {
      try {
        await new Promise<void>((resolve, reject) => {
          chrome.storage?.local?.set?.({ 'github.token': githubToken.trim() }, () => {
            if (chrome.runtime?.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
        setShowTokenDialog(false);
        setGithubToken('');
        showToast('GitHub Token 已安全儲存！現在可以發布分享連結了', 'success');
        // Auto retry publishing
        setTimeout(() => publishToGist(), 500);
      } catch (error) {
        showToast('儲存 Token 失敗，請重試', 'error');
      }
    }
  };

  // Handler for copying share result URL
  const handleCopyShareUrl = async () => {
    if (shareResultUrl) {
      try {
        await navigator.clipboard.writeText(shareResultUrl);
        showToast('已複製到剪貼簿', 'success');
      } catch {
        showToast('複製失敗，請手動選取複製', 'error');
      }
    }
  };

  if (!svc) return null;

  return (
    <div className="space-y-3 mt-3">
      {groups.map((g) => (
        <section key={g.id} className="rounded border border-slate-700 bg-[var(--panel)]">
          <header
            className="flex items-center justify-between px-3 py-2 border-b border-slate-700"
          >
            <div className="flex items-center gap-2">
              <button
                className="text-xs px-1.5 py-0.5 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => persistCollapsed({ ...collapsed, [g.id]: !collapsed[g.id] })}
                aria-expanded={collapsed[g.id] ? 'false' : 'true'}
              >
                {collapsed[g.id] ? '展開' : '摺疊'}
              </button>
              {renaming === g.id ? (
                <input
                  className="text-sm bg-slate-900 border border-slate-700 rounded px-2 py-1"
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
                <div className="text-sm font-medium">{g.name}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Hidden inputs for import actions */}
              <input
                id={`html-file-${g.id}`}
                type="file"
                accept="text/html,.html"
                aria-label="Import HTML bookmarks file"
                className="hidden"
                onChange={async (e) => {
                  const f = e.currentTarget.files?.[0];
                  e.currentTarget.value = '';
                  if (f) await handleHtmlImport(g.id, f);
                }}
              />
              <input
                id={`toby-file-${g.id}`}
                type="file"
                accept="application/json,.json"
                aria-label="Import Toby JSON file"
                className="hidden"
                onChange={async (e) => {
                  const f = e.currentTarget.files?.[0];
                  e.currentTarget.value = '';
                  if (f) await handleTobyFileSelect(g.id, f);
                }}
              />
              {/* Kebab menu trigger */}
              <button
                className="text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-800"
                aria-label="更多操作"
                onClick={(e) => {
                  e.stopPropagation();
                  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
                  const x = Math.max(8, Math.min(vw - 200, e.clientX - 20));
                  setMenuFor({ id: g.id, x, y: e.clientY + 6 });
                }}
              >
                ⋯
              </button>
            </div>
          </header>
          {/* Context menu for this group */}
          {menuFor?.id === g.id && (
            <ContextMenu
              x={menuFor.x}
              y={menuFor.y}
              onClose={() => setMenuFor(null)}
              items={[
                { key: 'share', label: '分享此群組', onSelect: () => { setMenuFor(null); void openShareDialog(g); } },
                { key: 'import-html', label: '匯入 HTML', onSelect: () => { setMenuFor(null); try { document.getElementById(`html-file-${g.id}`)?.click(); } catch {} } },
                { key: 'import-toby', label: '匯入 Toby', onSelect: () => { setMenuFor(null); try { document.getElementById(`toby-file-${g.id}`)?.click(); } catch {} } },
                { key: 'rename', label: '重新命名', onSelect: () => { setMenuFor(null); setRenaming(g.id); setRenameText(g.name); } },
                { key: 'move-up', label: '上移', onSelect: () => { setMenuFor(null); void move(g.id, -1); } },
                { key: 'move-down', label: '下移', onSelect: () => { setMenuFor(null); void move(g.id, 1); } },
                { key: 'delete', label: '刪除', onSelect: () => { setMenuFor(null); setConfirmDeleteGroup(g.id); } },
              ]}
            />
          )}
          {!collapsed[g.id] && (
            <div className="p-3">
              <CardGrid
                items={items.filter((it: any) => it.category === categoryId && it.subcategoryId === g.id)}
                onDropTab={async (tab: any, beforeId?: string) => {
                  try {
                    // 使用舊三段式流程以確保 meta enrich（回歸既有行為）
                    const createdId = (await actions.addFromTab(tab as any)) as any as string;
                    await actions.updateCategory(createdId, g.categoryId);
                    await (svc as any).updateCardSubcategory?.(createdId, g.id);
                    if (beforeId && beforeId !== '__END__') {
                      dbg('dnd', 'onDropTab reorder', { createdId, beforeId });
                      await actions.reorder(createdId, beforeId);
                    } else if (beforeId === '__END__') {
                      dbg('dnd', 'onDropTab moveToEnd', { createdId });
                      await (actions as any).moveToEnd(createdId);
                    }
                    await actions.load();
                    dbg('dnd', 'afterDrop load()', { groupId: g.id });
                    showToast('已從分頁建立並加入 group', 'success');
                  } catch {
                    showToast('建立失敗', 'error');
                  }
                }}
                onDropExistingCard={async (cardId, beforeId) => {
                  try {
                    // Create atomic cross-group move by using a special service method
                    if ((svc as any).moveCardToGroup) {
                      // Use dedicated atomic operation if available
                      await (svc as any).moveCardToGroup(cardId, g.categoryId, g.id, beforeId);
                    } else {
                      // Fallback: sequential operations with careful error handling
                      await actions.updateCategory(cardId, g.categoryId);

                      if (!beforeId || beforeId === '__END__') {
                        await (svc as any).updateCardSubcategory?.(cardId, g.id);
                        await (actions as any).moveToEnd(cardId);
                      } else {
                        // Use reorder which now handles cross-group atomically
                        await actions.reorder(cardId, beforeId);
                      }
                    }

                    await actions.load();
                    try { broadcastGhostActive(null); } catch {}
                    showToast('已移動到 group', 'success');
                  } catch (error) {
                    console.error('Move card error:', error);
                    try { broadcastGhostActive(null); } catch {}
                    showToast('移動失敗', 'error');
                  }
                }}
                onDeleteMany={async (ids) => { await actions.deleteMany(ids); showToast('Deleted selected', 'success'); }}
                onDeleteOne={async (id) => { await actions.deleteOne(id); showToast('Deleted', 'success'); }}
                onEditDescription={async (id, description) => { await actions.updateDescription(id, description); showToast('Saved note', 'success'); }}
                onSave={async (id, patch) => { await actions.updateCard(id, patch); showToast('Saved', 'success'); }}
                onReorder={async (fromId, toId) => {
                  await actions.reorder(fromId, toId);
                  await actions.load();
                }}
                onUpdateTitle={(id, title) => actions.updateTitle(id, title)}
                onUpdateUrl={(id, url) => actions.updateUrl(id, url)}
                onUpdateCategory={(id, cat) => actions.updateCategory(id, cat)}
                onUpdateMeta={(id, meta) => actions.updateMeta(id, meta)}
              />
            </div>
          )}
        </section>
      ))}
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
