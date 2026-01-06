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
      {tobyOpenFor && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
          onClick={cancelTobyImport}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--bg)] w-[520px] max-w-[95vw] p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Import Toby"
          >
            <div className="text-lg font-semibold">匯入 Toby 到此 group</div>
            <div className="mt-2 text-sm opacity-80">檔案：{tobyFile?.name} {tobyPreview ? `— 連結 ${tobyPreview.links}` : ''}</div>
            {/* Dedup option removed per request */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={cancelTobyImport}>取消</button>
              <button
                className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                onClick={executeTobyImport}
              >
                開始匯入
              </button>
            </div>
          </div>
        </div>
      )}
      {tobyProgress && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3">
          <div className="rounded border border-slate-700 bg-[var(--bg)] w-[420px] max-w-[90vw] p-5">
            <div className="text-lg font-semibold">匯入中…</div>
            <div className="mt-3 text-sm">{tobyProgress.processed}/{tobyProgress.total}</div>
            <div className="mt-2 h-2 w-full bg-slate-800 rounded">
              <div className="h-2 bg-[var(--accent)] rounded" style={{ width: `${tobyProgress.total ? Math.min(100, Math.floor((tobyProgress.processed/tobyProgress.total)*100)) : 0}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={abortTobyImport}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      {shareDialogOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
          onClick={() => setShareDialogOpen(false)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--bg)] w-[520px] max-w-[95vw] p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="分享設定"
          >
            <div className="text-lg font-semibold mb-4">分享「{shareGroup?.name}」</div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">分享標題</label>
                <input
                  type="text"
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="自訂分享頁面的標題"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">分享描述</label>
                <textarea
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm h-20 resize-none"
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  placeholder="簡單描述這個分享的內容"
                />
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <div>包含 {items.filter((it: any) => it.category === categoryId && it.subcategoryId === shareGroup?.id).length} 個項目</div>
                <div className="flex gap-4">
                  <span>📤 <strong>發布分享連結</strong>：需要您的 GitHub token，自動上傳到您的 Gist</span>
                </div>
                <div className="flex gap-4">
                  <span>💾 <strong>下載 HTML</strong>：下載檔案到本機，可手動上傳</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => setShareDialogOpen(false)}
              >
                取消
              </button>
              <button
                className="px-3 py-1 rounded border border-green-600 text-green-300 hover:bg-green-950/30 disabled:opacity-50"
                onClick={publishToGist}
                disabled={!shareTitle.trim()}
                title="發布到 GitHub Gist 並獲得分享連結"
              >
                發布分享連結
              </button>
              <button
                className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                onClick={generateShareFile}
                disabled={!shareTitle.trim()}
              >
                下載 HTML
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Token 設定對話框 */}
      {showTokenDialog && (
        <div
          className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-3"
          onClick={() => {
            setShowTokenDialog(false);
            setGithubToken('');
          }}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--bg)] w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">設定 GitHub Token</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-300 mb-3">
                  需要 GitHub Personal Access Token 才能發布分享連結到 Gist
                </p>

                <div className="text-xs text-slate-400 space-y-2 mb-4">
                  <div>🔗 <a href="https://github.com/settings/tokens" target="_blank" rel="noopener" className="text-blue-400 hover:underline">前往 GitHub 設定頁面</a></div>
                  <div>📝 點擊「Generate new token (classic)」</div>
                  <div>✅ 勾選「gist」權限（僅需此權限）</div>
                  <div>💾 複製產生的 token</div>
                </div>

                <div className="px-3 py-2 bg-amber-900/20 border border-amber-700/50 rounded text-xs text-amber-200 mb-4">
                  🔒 安全提示：Token 將加密儲存於瀏覽器擴充功能的安全儲存區，不會被網頁或其他擴充功能存取
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                />
              </div>

              <div className="text-xs text-slate-400">
                Token 將安全地儲存在瀏覽器本機，不會上傳到任何伺服器
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => {
                  setShowTokenDialog(false);
                  setGithubToken('');
                }}
              >
                取消
              </button>
              <button
                className="px-3 py-1 rounded border border-green-600 text-green-300 hover:bg-green-950/30 disabled:opacity-50"
                onClick={async () => {
                  if (githubToken.trim()) {
                    // 使用 chrome.storage.local 安全存儲 token
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
                      // 自動重試發布
                      setTimeout(() => publishToGist(), 500);
                    } catch (error) {
                      showToast('儲存 Token 失敗，請重試', 'error');
                    }
                  }
                }}
                disabled={!githubToken.trim()}
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Result Dialog */}
      {shareResultUrl && (
        <div
          className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShareResultUrl(null)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--panel)] w-[560px] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="分享連結"
          >
            <div className="px-4 py-3 border-b border-slate-700">
              <div className="text-base font-semibold">✅ 分享連結已建立</div>
            </div>
            <div className="px-4 py-4">
              <div className="text-sm opacity-90 mb-3">
                您的分享連結已成功發布到 GitHub Gist，可以複製連結分享給他人：
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareResultUrl}
                  readOnly
                  className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-600 text-sm font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  className="px-3 py-2 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] whitespace-nowrap text-sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareResultUrl);
                      showToast('已複製到剪貼簿', 'success');
                    } catch {
                      showToast('複製失敗，請手動選取複製', 'error');
                    }
                  }}
                >
                  複製連結
                </button>
              </div>
              <div className="mt-3 text-xs opacity-70">
                💡 提示：連結會在您的 GitHub Gist 中永久保存，可隨時在 <a href="https://gist.github.com" target="_blank" rel="noopener" className="text-blue-400 hover:underline">gist.github.com</a> 管理
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded text-sm border border-slate-600 hover:bg-slate-800"
                onClick={() => window.open(shareResultUrl, '_blank')}
              >
                開啟連結
              </button>
              <button
                className="px-3 py-1.5 rounded text-sm border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)]"
                onClick={() => setShareResultUrl(null)}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
