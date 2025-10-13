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
  const [connected, setConnected] = React.useState(false);
  const [last, setLast] = React.useState<string | undefined>(undefined);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [autoEnabled, setAutoEnabled] = React.useState(false);
  const [pendingPush, setPendingPush] = React.useState(false);
  const [lastDownloaded, setLastDownloaded] = React.useState<string | undefined>(undefined);
  const [lastUploaded, setLastUploaded] = React.useState<string | undefined>(undefined);
  const [conflictInfo, setConflictInfo] = React.useState<ConflictInfo | null>(null);
  const [conflictOperation, setConflictOperation] = React.useState<'auto-sync' | 'manual-merge' | null>(null);

  React.useEffect(() => {
    (async () => {
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
        setLastDownloaded(st.lastDownloadedAt);
        setLastUploaded(st.lastUploadedAt);
      } catch {}
    })();
  }, []);

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
      setLastDownloaded(refreshed.lastDownloadedAt);
      setLastUploaded(refreshed.lastUploadedAt);

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
      setLastUploaded(refreshed.lastUploadedAt);
      setPendingPush(!!refreshed.pendingPush);
    } catch (e: any) { setError(String(e?.message || e)); }
    finally { setSyncing(false); }
  }
  async function doRestore(merge = true) {
    // 完全還原模式（非合併） - 不檢測衝突，直接執行
    if (!merge) {
      setSyncing(true); setError(undefined);
      try {
        const mod = await import('../data/syncService');
        await mod.restoreNow(undefined, false);
        const refreshed = mod.getStatus();
        setLast(refreshed.lastSyncedAt);
        setLastDownloaded(refreshed.lastDownloadedAt);
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
        setLastDownloaded(refreshed.lastDownloadedAt);
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
      const mod = await import('../data/syncService');
      await mod.restoreNow(undefined, true);
      const refreshed = mod.getStatus();
      setLast(refreshed.lastSyncedAt);
      setLastDownloaded(refreshed.lastDownloadedAt);
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
      setLastDownloaded(refreshed.lastDownloadedAt);
      setLastUploaded(refreshed.lastUploadedAt);
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
    </div>
  );
};
