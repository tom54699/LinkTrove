import React from 'react';
import { useFeedback } from './feedback';
import { createExportImportService } from '../data/exportImport';
import { createStorageService } from '../../background/storageService';
import { TemplatesManager } from '../templates/TemplatesManager';
import { useWebpages } from '../webpages/WebpagesProvider';
import { useCategories } from '../sidebar/categories';
import { useTemplates } from '../templates/TemplatesProvider';
import { ConflictDialog } from './ConflictDialog';
import type { ConflictInfo } from '../data/conflictDetection';

type Section = 'data' | 'templates';
// 擴充：Cloud Sync 區塊
type SectionEx = Section | 'cloud';

export const SettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [section, setSection] = React.useState<SectionEx>('data');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="rounded border border-slate-700 bg-[var(--panel)] w-[960px] max-w-[95vw] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <div className="flex h-[70vh]">
          <aside className="w-56 border-r border-slate-700 p-3">
            <div className="text-sm font-semibold mb-3">Settings</div>
            <nav className="flex flex-col gap-1" aria-label="Settings Sections">
              <button
                className={`text-left px-2 py-1 rounded ${section==='data' ? 'bg-slate-800' : 'hover:bg-slate-800/60'}`}
                onClick={() => setSection('data')}
              >匯出/匯入</button>
              <button
                className={`text-left px-2 py-1 rounded ${section==='cloud' ? 'bg-slate-800' : 'hover:bg-slate-800/60'}`}
                onClick={() => setSection('cloud')}
              >Cloud Sync</button>
              <button
                className={`text-left px-2 py-1 rounded ${section==='templates' ? 'bg-slate-800' : 'hover:bg-slate-800/60'}`}
                onClick={() => setSection('templates')}
              >Templates</button>
            </nav>
          </aside>
          <main className="flex-1 p-4 overflow-auto">
            {section === 'data' ? (
              <DataPanel />
            ) : section === 'cloud' ? (
              <CloudSyncPanel />
            ) : (
              <TemplatesManager />
            )}
          </main>
        </div>
        <div className="px-4 py-2 border-t border-slate-700 flex items-center justify-end">
          <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  );
};

const DataPanel: React.FC = () => {
  const { showToast, setLoading } = useFeedback();
  const { actions: pagesActions } = useWebpages();
  const { actions: catActions } = useCategories() as any;
  const { actions: tplActions } = useTemplates();
  const svc = React.useMemo(() => createExportImportService({ storage: createStorageService() }), []);
  const [file, setFile] = React.useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [inlineMsg, setInlineMsg] = React.useState<null | { kind: 'success' | 'error'; text: string }>(null);

  const performImport = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      const text = await (file as File).text();
      let pagesCount = 0;
      let catsCount = 0;
      try {
        const parsed = JSON.parse(text);
        pagesCount = Array.isArray(parsed?.webpages) ? parsed.webpages.length : 0;
        catsCount = Array.isArray(parsed?.categories) ? parsed.categories.length : 0;
      } catch {}
      // Use low-level import to replace (matches existing Settings behavior)
      const storage = createStorageService();
      await (storage as any).importData(text);
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
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-lg font-semibold">專案備份與還原（僅本專案）</div>
        <div className="text-sm opacity-80 mb-4">
          匯出/匯入本專案格式 JSON。此匯入將取代現有資料，建議先匯出備份。
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">匯出備份</div>
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
              className="rounded border-2 border-dashed border-slate-600 hover:border-[var(--accent)] hover:bg-[var(--accent-hover)] p-3 text-sm"
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
                  id="import-json-file-modal"
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
                  <div className="text-xs opacity-80">{file.name}</div>
                )}
                <button
                  className="ml-auto text-sm px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                  disabled={!file}
                  onClick={() => setConfirmOpen(true)}
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
                ? 'bg-[var(--accent-hover)] border-[var(--accent)]/60'
                : 'bg-red-900/30 border-red-700'
            }`}
          >
            {inlineMsg.text}
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-3" onClick={() => setConfirmOpen(false)}>
          <div className="rounded border border-slate-700 bg-[var(--panel)] w-[520px] max-w-[95vw]" onClick={(e)=>e.stopPropagation()} role="dialog" aria-label="Confirm Import">
            <div className="px-5 py-4 border-b border-slate-700">
              <div className="text-lg font-semibold">確認匯入</div>
              <div className="text-xs opacity-80 mt-1">將取代現有資料。</div>
            </div>
            <div className="px-5 py-3 flex items-center justify-end gap-2">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={() => setConfirmOpen(false)}>取消</button>
              <button className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)]" onClick={performImport}>確認匯入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CloudSyncPanel: React.FC = () => {
  const { actions: pagesActions } = useWebpages();
  const { actions: catActions } = useCategories() as any;
  const { actions: tplActions } = useTemplates();
  const [connected, setConnected] = React.useState(false);
  const [last, setLast] = React.useState<string | undefined>(undefined);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [autoEnabled, setAutoEnabled] = React.useState(false);
  const [pendingPush, setPendingPush] = React.useState(false);
  const [conflictInfo, setConflictInfo] = React.useState<ConflictInfo | null>(null);
  const [conflictOperation, setConflictOperation] = React.useState<'auto-sync' | 'manual-merge' | null>(null);
  const [snapshots, setSnapshots] = React.useState<any[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = React.useState(false);
  const [gcStats, setGcStats] = React.useState<{ totalTombstones: number; oldestTombstone?: string } | null>(null);
  const [loadingGC, setLoadingGC] = React.useState(false);
  const [gcResult, setGcResult] = React.useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = React.useState<{ type: 'gc' | 'restore-snapshot' | 'delete-snapshot'; snapshotId?: string } | null>(null);

  // Helper to load sync status
  const loadSyncStatus = React.useCallback(async () => {
    try {
      const got: any = await new Promise((resolve) => {
        try { chrome.storage?.local?.get?.({ 'cloudSync.status': {} }, resolve); } catch { resolve({}); }
      });
      const st = got?.['cloudSync.status'] || {};
      setConnected(!!st.connected);
      setLast(st.lastSyncedAt);
      setSyncing(!!st.syncing);
      setError(st.error);
      setAutoEnabled(!!st.auto);
      setPendingPush(!!st.pendingPush);
    } catch {}
  }, []);

  React.useEffect(() => {
    // Initial load
    loadSyncStatus();
    loadSnapshotsList();
    loadGCStats();

    // Listen to chrome.storage changes
    const listener = (changes: any, areaName: string) => {
      if (areaName === 'local') {
        if (changes['cloudSync.status']) {
          loadSyncStatus();
        }
        if (changes['cloudSync.snapshots']) {
          loadSnapshotsList();
        }
      }
    };

    try {
      chrome.storage?.onChanged?.addListener?.(listener);
    } catch {}

    return () => {
      try {
        chrome.storage?.onChanged?.removeListener?.(listener);
      } catch {}
    };
  }, [loadSyncStatus]);

  async function loadSnapshotsList() {
    try {
      const snapshotModule = await import('../data/snapshotService');
      const list = await snapshotModule.listSnapshots();
      setSnapshots(list);
    } catch {
      setSnapshots([]);
    }
  }

  async function doRestoreSnapshot(snapshotId: string) {
    setLoadingSnapshots(true);
    setError(undefined);
    setConfirmDialog(null);
    try {
      const snapshotModule = await import('../data/snapshotService');
      await snapshotModule.restoreSnapshot(snapshotId);

      // Reload UI data
      try { await pagesActions.load(); } catch {}
      try { await catActions?.reload?.(); } catch {}
      try { await tplActions?.reload?.(); } catch {}

      await loadSnapshotsList();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoadingSnapshots(false);
    }
  }

  async function doDeleteSnapshot(snapshotId: string) {
    setConfirmDialog(null);
    try {
      const snapshotModule = await import('../data/snapshotService');
      await snapshotModule.deleteSnapshot(snapshotId);
      await loadSnapshotsList();
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  async function loadGCStats() {
    try {
      const gcModule = await import('../data/gcService');
      const stats = await gcModule.getGCStats();
      setGcStats(stats);
    } catch {
      setGcStats(null);
    }
  }

  async function doRunGC() {
    setLoadingGC(true);
    setError(undefined);
    setGcResult(null);
    setConfirmDialog(null);

    try {
      const gcModule = await import('../data/gcService');
      const result = await gcModule.runGC(30);

      const msg = `已清理 ${result.cleaned} 個項目（網頁 ${result.categories.webpages}, 分類 ${result.categories.categories}, 子分類 ${result.categories.subcategories}, 模板 ${result.categories.templates}, 組織 ${result.categories.organizations}）`;
      setGcResult(msg);

      // Reload stats
      await loadGCStats();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoadingGC(false);
    }
  }

  async function doConnect() {
    setError(undefined);
    try {
      const mod = await import('../data/syncService');
      await mod.connect();
      setConnected(true);
      const refreshed = mod.getStatus();
      setLast(refreshed.lastSyncedAt);
      setAutoEnabled(!!refreshed.auto);
      setPendingPush(!!refreshed.pendingPush);

      // After connect, check if Auto Sync was auto-enabled and cloud has data
      // If so, detect conflicts before first sync
      if (refreshed.auto) {
        try {
          const [storageModule, driveModule, conflictModule] = await Promise.all([
            import('../../background/storageService'),
            import('../data/cloud/googleDrive'),
            import('../data/conflictDetection'),
          ]);

          const fileInfo = await driveModule.getFile();
          if (!fileInfo) {
            // No cloud backup, no conflict
            return;
          }

          // Get local and remote data
          const storage = storageModule.createStorageService();
          const localData = await (storage as any).exportData();
          const localPayload = JSON.parse(localData);
          const remoteText = await driveModule.download(fileInfo.fileId);
          const remotePayload = JSON.parse(remoteText);

          // Detect conflict
          const conflict = conflictModule.detectConflict(localPayload, remotePayload);

          if (conflict.hasConflict) {
            // Show conflict dialog
            setConflictInfo(conflict);
            setConflictOperation('auto-sync');
          }
        } catch (conflictError: any) {
          // Ignore conflict detection errors, don't block connection
          console.warn('Conflict detection failed:', conflictError);
        }
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }
  async function doBackup() {
    setSyncing(true); setError(undefined);
    try {
      const mod = await import('../data/syncService');
      await mod.backupNow();
      const refreshed = mod.getStatus();
      setLast(refreshed.lastSyncedAt);
      setPendingPush(!!refreshed.pendingPush);
    } catch (e: any) { setError(String(e?.message || e)); }
    finally { setSyncing(false); }
  }
  async function doRestore(merge = true) {
    // 完全還原模式（非合併） - 不檢測衝突，直接執行
    if (!merge) {
      setSyncing(true); setError(undefined);
      try {
        // Create snapshot before full restore
        try {
          const snapshotModule = await import('../data/snapshotService');
          await snapshotModule.createSnapshot('before-restore');
        } catch (snapshotError) {
          console.warn('Failed to create snapshot:', snapshotError);
          // Don't block restore operation if snapshot fails
        }

        const mod = await import('../data/syncService');
        await mod.restoreNow(undefined, false);
        const refreshed = mod.getStatus();
        setLast(refreshed.lastSyncedAt);
        setPendingPush(!!refreshed.pendingPush);
      } catch (e: any) { setError(String(e?.message || e)); }
      finally { setSyncing(false); }
      return;
    }

    // 合併模式 - 檢測衝突
    setError(undefined);
    try {
      const [storageModule, driveModule, conflictModule] = await Promise.all([
        import('../../background/storageService'),
        import('../data/cloud/googleDrive'),
        import('../data/conflictDetection'),
      ]);

      // 獲取本地與雲端資料
      const storage = storageModule.createStorageService();
      const localData = await (storage as any).exportData();
      const localPayload = JSON.parse(localData);

      const fileInfo = await driveModule.getFile();
      if (!fileInfo) {
        throw new Error('雲端尚無備份');
      }

      const remoteText = await driveModule.download(fileInfo.fileId);
      const remotePayload = JSON.parse(remoteText);

      // 檢測衝突
      const conflict = conflictModule.detectConflict(localPayload, remotePayload);

      if (!conflict.hasConflict) {
        // 無衝突，直接合併
        setSyncing(true);
        const mod = await import('../data/syncService');
        await mod.restoreNow(undefined, true);
        const refreshed = mod.getStatus();
        setLast(refreshed.lastSyncedAt);
        setPendingPush(!!refreshed.pendingPush);
        setSyncing(false);
      } else {
        // 有衝突，顯示對話框
        setConflictInfo(conflict);
        setConflictOperation('manual-merge');
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  async function confirmManualMerge() {
    setSyncing(true); setError(undefined);
    try {
      // Create snapshot before merge
      try {
        const snapshotModule = await import('../data/snapshotService');
        await snapshotModule.createSnapshot('before-merge');
      } catch (snapshotError) {
        console.warn('Failed to create snapshot:', snapshotError);
        // Don't block merge operation if snapshot fails
      }

      const mod = await import('../data/syncService');
      await mod.restoreNow(undefined, true);
      const refreshed = mod.getStatus();
      setLast(refreshed.lastSyncedAt);
      setPendingPush(!!refreshed.pendingPush);
      setConflictInfo(null);
      setConflictOperation(null);
    } catch (e: any) {
      setError(String(e?.message || e));
      setConflictInfo(null);
      setConflictOperation(null);
    } finally {
      setSyncing(false);
    }
  }

  async function backupAndConfirmMerge() {
    try {
      // 先備份
      await doBackup();
      // 再合併
      await confirmManualMerge();
    } catch (e: any) {
      setError(String(e?.message || e));
      setConflictInfo(null);
      setConflictOperation(null);
    }
  }
  async function doDisconnect() {
    setError(undefined);
    try {
      const mod = await import('../data/syncService');
      await mod.disconnect();
      setConnected(false);
      setPendingPush(false);
      setAutoEnabled(false);
    } catch (e: any) { setError(String(e?.message || e)); }
  }

  async function toggleAutoSync(next: boolean) {
    setError(undefined);

    // 關閉 Auto Sync - 不需要檢測衝突
    if (!next) {
      try {
        const mod = await import('../data/syncService');
        await mod.setAutoSync(false);
        setAutoEnabled(false);
      } catch (e: any) {
        setError(String(e?.message || e));
      }
      return;
    }

    // 開啟 Auto Sync - 檢測衝突
    try {
      const [storageModule, driveModule, conflictModule] = await Promise.all([
        import('../../background/storageService'),
        import('../data/cloud/googleDrive'),
        import('../data/conflictDetection'),
      ]);

      // 獲取本地與雲端資料
      const storage = storageModule.createStorageService();
      const localData = await (storage as any).exportData();
      const localPayload = JSON.parse(localData);

      const fileInfo = await driveModule.getFile();
      if (!fileInfo) {
        // 雲端無備份，直接啟用
        const mod = await import('../data/syncService');
        await mod.setAutoSync(true);
        setAutoEnabled(true);
        const refreshed = mod.getStatus();
        setPendingPush(!!refreshed.pendingPush);
        setLast(refreshed.lastSyncedAt);
        return;
      }

      const remoteText = await driveModule.download(fileInfo.fileId);
      const remotePayload = JSON.parse(remoteText);

      // 檢測衝突
      const conflict = conflictModule.detectConflict(localPayload, remotePayload);

      if (!conflict.hasConflict) {
        // 無衝突，直接啟用
        const mod = await import('../data/syncService');
        await mod.setAutoSync(true);
        setAutoEnabled(true);
        const refreshed = mod.getStatus();
        setPendingPush(!!refreshed.pendingPush);
        setLast(refreshed.lastSyncedAt);
      } else {
        // 有衝突，顯示對話框
        setConflictInfo(conflict);
        setConflictOperation('auto-sync');
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  async function confirmAutoSync() {
    try {
      const mod = await import('../data/syncService');
      await mod.setAutoSync(true);
      setAutoEnabled(true);
      const refreshed = mod.getStatus();
      setPendingPush(!!refreshed.pendingPush);
      setLast(refreshed.lastSyncedAt);
      setConflictInfo(null);
      setConflictOperation(null);
    } catch (e: any) {
      setError(String(e?.message || e));
      setConflictInfo(null);
      setConflictOperation(null);
    }
  }

  async function backupAndConfirmAutoSync() {
    try {
      // 先備份
      await doBackup();
      // 再啟用 Auto Sync
      await confirmAutoSync();
    } catch (e: any) {
      setError(String(e?.message || e));
      setConflictInfo(null);
      setConflictOperation(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold mb-2">Google Drive 雲端同步</div>
      <div className="text-sm opacity-80 mb-3">
        使用 Google Drive appDataFolder 儲存備份（私有、不顯示於雲端硬碟）
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-3">
        {connected ? (
          <>
            <span className="px-2 py-0.5 text-xs rounded bg-emerald-900/40 border border-emerald-700 text-emerald-200">已連線</span>
            <button className="text-sm px-2 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={doDisconnect}>中斷連線</button>
          </>
        ) : (
          <button className="text-sm px-3 py-1.5 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)]" onClick={doConnect}>連線 Google Drive</button>
        )}
        {syncing && <span className="text-xs opacity-70 animate-pulse">同步中…</span>}
        {pendingPush && !syncing && <span className="text-xs opacity-70">待上傳…</span>}
      </div>

      {/* Manual Backup/Restore */}
      {connected && (
        <div className="border-t border-slate-700 pt-4">
          <div className="text-sm font-medium mb-2">手動操作</div>
          <div className="flex items-center gap-2">
            <button
              className="text-sm px-3 py-1.5 rounded border border-slate-600 hover:bg-slate-800 disabled:opacity-50"
              disabled={!connected || syncing}
              onClick={doBackup}
            >
              立即備份
            </button>
            <button
              className="text-sm px-3 py-1.5 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
              disabled={!connected || syncing}
              onClick={() => doRestore(true)}
              title="合併雲端資料到本地（保留兩邊較新的版本）"
            >
              合併雲端資料
            </button>
            <button
              className="text-sm px-3 py-1.5 rounded border border-slate-600 hover:bg-slate-800 disabled:opacity-50"
              disabled={!connected || syncing}
              onClick={() => doRestore(false)}
              title="完全覆蓋本地資料（謹慎使用）"
            >
              完全還原
            </button>
          </div>
          <div className="text-xs opacity-60 mt-2">
            備份：上傳本地到雲端（覆蓋） / 合併：保留兩邊較新的版本 / 完全還原：雲端覆蓋本地
          </div>
        </div>
      )}

      {/* Auto Sync */}
      {connected && (
        <div className="border-t border-slate-700 pt-4">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={autoEnabled}
              onChange={(e) => toggleAutoSync(e.target.checked)}
              className="h-4 w-4 rounded border border-slate-600 mt-0.5"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">自動同步</div>
              <div className="text-xs opacity-70 mt-1">
                啟用後，本地變更會自動上傳；啟動時若雲端較新會自動下載
              </div>
            </div>
          </label>
          {autoEnabled && (
            <div className="mt-2 px-3 py-2 rounded bg-emerald-900/20 border border-emerald-700/50 text-xs text-emerald-200">
              ✓ 已啟用 LWW 合併：自動保留本地與雲端較新的版本，降低資料衝突風險
            </div>
          )}
        </div>
      )}

      {/* Status Info */}
      {connected && last && (
        <div className="text-xs opacity-60 border-t border-slate-700 pt-3">
          最後同步：{new Date(last).toLocaleString('zh-TW', { hour12: false })}
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-700/50 rounded px-3 py-2">
          錯誤：{error}
        </div>
      )}

      {/* Garbage Collection */}
      <div className="border-t border-slate-700 pt-4">
        <div className="text-sm font-medium mb-2">垃圾回收 (GC)</div>
        <div className="text-xs opacity-70 mb-3">
          清理超過 30 天的已刪除項目，減少儲存空間並提升同步效能
        </div>

        {gcStats && (
          <div className="px-3 py-2 bg-slate-800/30 rounded border border-slate-700 mb-3">
            <div className="text-xs">
              <div className="flex items-center justify-between">
                <span className="opacity-70">已刪除項目：</span>
                <span className="font-medium">{gcStats.totalTombstones} 個</span>
              </div>
              {gcStats.oldestTombstone && (
                <div className="flex items-center justify-between mt-1">
                  <span className="opacity-70">最舊項目：</span>
                  <span className="text-xs opacity-60">
                    {new Date(gcStats.oldestTombstone).toLocaleDateString('zh-TW')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          className="text-sm px-3 py-1.5 rounded border border-slate-600 hover:bg-slate-800 disabled:opacity-50"
          disabled={loadingGC || (gcStats?.totalTombstones === 0)}
          onClick={() => setConfirmDialog({ type: 'gc' })}
        >
          {loadingGC ? '清理中…' : '執行 GC'}
        </button>

        {gcResult && (
          <div className="mt-3 px-3 py-2 rounded bg-emerald-900/20 border border-emerald-700/50 text-xs text-emerald-200">
            ✓ {gcResult}
          </div>
        )}
      </div>

      {/* Local Snapshots */}
      <div className="border-t border-slate-700 pt-4">
        <div className="text-sm font-medium mb-2">本地快照</div>
        <div className="text-xs opacity-70 mb-3">
          在執行危險操作（完全還原/合併）前自動建立快照，可用於回復誤操作
        </div>

        {snapshots.length === 0 ? (
          <div className="text-xs opacity-60 px-3 py-2 bg-slate-800/30 rounded border border-slate-700">
            尚無快照
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snapshot) => (
              <div key={snapshot.id} className="px-3 py-2 bg-slate-800/30 rounded border border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-medium">
                      {new Date(snapshot.createdAt).toLocaleString('zh-TW', { hour12: false })}
                    </div>
                    <div className="text-xs opacity-60 mt-1">
                      {snapshot.reason === 'before-restore' && '完全還原前'}
                      {snapshot.reason === 'before-merge' && '合併前'}
                      {snapshot.reason === 'manual' && '手動建立'}
                      {' · '}
                      {snapshot.summary.webpages} 網頁, {snapshot.summary.categories} 分類
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="text-xs px-2 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                      disabled={loadingSnapshots}
                      onClick={() => setConfirmDialog({ type: 'restore-snapshot', snapshotId: snapshot.id })}
                    >
                      恢復
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-800 disabled:opacity-50"
                      disabled={loadingSnapshots}
                      onClick={() => setConfirmDialog({ type: 'delete-snapshot', snapshotId: snapshot.id })}
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflict Dialog */}
      {conflictInfo && conflictOperation && (
        <ConflictDialog
          conflict={conflictInfo}
          operation={conflictOperation}
          onConfirm={() => {
            if (conflictOperation === 'auto-sync') {
              confirmAutoSync();
            } else if (conflictOperation === 'manual-merge') {
              confirmManualMerge();
            }
          }}
          onCancel={() => {
            setConflictInfo(null);
            setConflictOperation(null);
          }}
          onBackupFirst={() => {
            if (conflictOperation === 'auto-sync') {
              backupAndConfirmAutoSync();
            } else if (conflictOperation === 'manual-merge') {
              backupAndConfirmMerge();
            }
          }}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--panel)] w-[460px] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Confirm Action"
          >
            <div className="px-4 py-3 border-b border-slate-700">
              <div className="text-base font-semibold">
                {confirmDialog.type === 'gc' && '確認執行 GC'}
                {confirmDialog.type === 'restore-snapshot' && '確認恢復快照'}
                {confirmDialog.type === 'delete-snapshot' && '確認刪除快照'}
              </div>
            </div>
            <div className="px-4 py-4 text-sm opacity-90">
              {confirmDialog.type === 'gc' && '確定要清理超過 30 天的已刪除項目？此操作不可回復。'}
              {confirmDialog.type === 'restore-snapshot' && '確定要恢復此快照？當前資料將被替換。'}
              {confirmDialog.type === 'delete-snapshot' && '確定要刪除此快照？'}
            </div>
            <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded text-sm border border-slate-600 hover:bg-slate-800"
                onClick={() => setConfirmDialog(null)}
              >
                取消
              </button>
              <button
                className="px-3 py-1.5 rounded text-sm border border-red-600 text-red-400 hover:bg-red-900/30"
                onClick={() => {
                  if (confirmDialog.type === 'gc') {
                    doRunGC();
                  } else if (confirmDialog.type === 'restore-snapshot' && confirmDialog.snapshotId) {
                    doRestoreSnapshot(confirmDialog.snapshotId);
                  } else if (confirmDialog.type === 'delete-snapshot' && confirmDialog.snapshotId) {
                    doDeleteSnapshot(confirmDialog.snapshotId);
                  }
                }}
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
