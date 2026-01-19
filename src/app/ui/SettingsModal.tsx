import React from 'react';
import { useFeedback } from './feedback';
import { createExportImportService } from '../data/exportImport';
import { createStorageService } from '../../background/storageService';
import { TemplatesManager } from '../templates/TemplatesManager';
import { useWebpages } from '../webpages/WebpagesProvider';
import { useCategories } from '../sidebar/categories';
import { useTemplates } from '../templates/TemplatesProvider';
import type { ConflictInfo } from '../data/conflictDetection';

const ConflictDialog = React.lazy(() => import('./ConflictDialog').then(module => ({ default: module.ConflictDialog })));

type Section = 'data' | 'templates';
// 擴充：Cloud Sync 區塊
type SectionEx = Section | 'cloud';

export const SettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [section, setSection] = React.useState<SectionEx>('data');
  if (!open) return null;

  const sections: { id: SectionEx; label: string; icon: string }[] = [
    { id: 'data', label: '匯出/匯入', icon: '📥' },
    { id: 'cloud', label: 'Cloud Sync', icon: '☁' },
    { id: 'templates', label: 'Templates', icon: '▦' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--bg)] w-[900px] max-w-[95vw] h-[650px] max-h-[90vh] overflow-hidden flex shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        {/* Sidebar */}
        <aside className="w-[180px] bg-[var(--panel)] border-r border-[var(--border)] py-4 flex flex-col flex-shrink-0">
          <div className="px-5 pb-4 mb-2 font-bold text-sm tracking-tight text-[var(--fg)]">
            Settings
          </div>
          <nav className="flex flex-col gap-0.5 px-2" aria-label="Settings Sections">
            {sections.map((s) => (
              <button
                key={s.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                  section === s.id
                    ? 'bg-[var(--surface)] text-[var(--fg)] font-medium shadow-sm'
                    : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--fg)]'
                }`}
                onClick={() => setSection(s.id)}
              >
                <span className="text-base opacity-70">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto px-5 py-2 text-[10px] text-[var(--muted)] opacity-50 flex justify-between items-center">
            <span>Version 0.1.0</span>
            <button 
              className="hover:text-[var(--fg)] cursor-pointer" 
              title="Run DB Integrity Check"
              onClick={async () => {
                console.log('Running DB Integrity Check...');
                try {
                  const { createStorageService } = await import('../../background/storageService');
                  const s = createStorageService();
                  const pages = await (s as any).loadFromLocal(); // only active
                  const allPages = await (s as any).exportData().then((j: string) => JSON.parse(j).webpages); // all including deleted
                  const groups = await (s as any).listSubcategories?.('all') || []; // assuming this lists all if impl supports it, or we iterate cats
                  // Actually, let's just dump the raw meta orders
                  const exportJson = await s.exportData();
                  const data = JSON.parse(exportJson);
                  
                  const report: any = {
                    totalWebpages: allPages.length,
                    activeWebpages: pages.length,
                    deletedWebpages: allPages.length - pages.length,
                    orphanedInOrder: [],
                    missingFromOrder: [],
                    duplicatesInOrder: [],
                  };

                  const activeIds = new Set(pages.map((p: any) => p.id));
                  const allIds = new Set(allPages.map((p: any) => p.id));
                  const orderedIds = new Set<string>();

                  if (data.orders?.subcategories) {
                    for (const [gid, ids] of Object.entries(data.orders.subcategories)) {
                      const idList = ids as string[];
                      const unique = new Set(idList);
                      if (unique.size !== idList.length) {
                        report.duplicatesInOrder.push({ groupId: gid, ids: idList });
                      }
                      for (const id of idList) {
                        orderedIds.add(id);
                        if (!activeIds.has(id)) {
                          const isDeleted = allIds.has(id); // exists but deleted
                          report.orphanedInOrder.push({ groupId: gid, cardId: id, status: isDeleted ? 'deleted' : 'missing' });
                        }
                      }
                    }
                  }
                  
                  // Check active pages not in any order (if they have a group)
                  for (const p of pages) {
                    if (p.subcategoryId) {
                      const key = `order.subcat.${p.subcategoryId}`;
                      let currentOrder = (data.orders?.subcategories?.[p.subcategoryId] || []) as string[];
                      
                      if (!currentOrder.includes(p.id)) {
                        report.missingFromOrder.push({ cardId: p.id, groupId: p.subcategoryId });
                        // Auto-fix: Append to order
                        currentOrder.push(p.id);
                        await (s as any).setGroupOrder?.(p.subcategoryId, currentOrder);
                        // Also update raw data for report consistency if needed, but s.setGroupOrder handles DB
                      }
                    }
                  }

                  if (report.missingFromOrder.length > 0) {
                    console.log('⚡️ Auto-fixed missing orders for', report.missingFromOrder.length, 'cards.');
                    alert(`診斷發現 ${report.missingFromOrder.length} 張卡片排序遺失，已自動修復！請重整頁面。`);
                  } else {
                    alert('診斷報告已輸出至 Console (F12)。資料庫結構看起來很健康。');
                  }

                  console.log('=== DB INTEGRITY REPORT ===');
                  console.log(JSON.stringify(report, null, 2));
                  console.log('=== FULL RAW DATA DUMP (COPY THIS) ===');
                  console.log(JSON.stringify(data, null, 2));
                  alert('完整資料已輸出至 Console (F12)。請複製 "FULL RAW DATA DUMP" 下方的內容。');
                } catch (e) {
                  console.error('Debug failed:', e);
                  alert('診斷失敗');
                }
              }}
            >
              🐞
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)]">
          <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            {section === 'data' ? (
              <DataPanel />
            ) : section === 'cloud' ? (
              <CloudSyncPanel />
            ) : (
              <TemplatesManager />
            )}
          </main>

          <footer className="px-6 py-3 border-t border-[var(--border)] flex justify-end">
            <button
              className="px-4 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)] transition-all"
              onClick={onClose}
            >
              關閉
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

const DataPanel: React.FC = () => {
  const { showToast, setLoading } = useFeedback();
  const svc = React.useMemo(() => createExportImportService({ storage: createStorageService() }), []);
  const [file, setFile] = React.useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [inlineMsg, setInlineMsg] = React.useState<null | { kind: 'success' | 'error'; text: string }>(null);

  const performImport = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      const text = await (file as File).text();
      const storage = createStorageService();
      await (storage as any).importData(text);
      setInlineMsg({ kind: 'success', text: '匯入成功' });
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div id="tab-data" className="tab-content">
        <h2 className="text-[18px] font-bold mb-1 text-[var(--fg)]">專案備份與還原（僅本專案）</h2>
        <p className="text-[13px] text-[var(--muted)] mb-5 leading-relaxed">
          匯出或還原本專案格式 JSON。匯入將取代現有資料，建議先匯出備份。
        </p>

        <div className="text-[13px] font-medium mb-1.5 text-[var(--fg)]">匯出備份</div>
        <button 
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border)] bg-transparent text-[var(--muted)] text-[13px] hover:bg-[var(--surface)] hover:text-[var(--fg)] transition-all cursor-pointer"
          onClick={async () => {
            setLoading(true);
            try {
              const json = await svc.exportJson();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `linktrove-backup-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
              showToast('備份匯出完成', 'success');
            } catch {
              showToast('匯出失敗', 'error');
            } finally {
              setLoading(false);
            }
          }}
        >
          Export JSON
        </button>

        <div className="h-px bg-[var(--border)] my-5"></div>

        <div className="text-[13px] font-medium mb-1.5 text-[var(--fg)]">還原（取代現有資料）</div>
        <div 
          className="border-2 border-dashed border-[var(--border)] rounded-lg p-4 transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-hover)] cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) setFile(f);
          }}
          onClick={() => {
            if (!file) document.getElementById('import-json-file-modal')?.click();
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[var(--muted)] flex-1 truncate">
              {file ? `已選取：${file.name}` : '將 JSON 拖放到此處或點擊選取檔案...'}
            </span>
            <button 
              className="px-4 py-2 rounded-lg bg-[var(--accent)] border border-[var(--accent)] text-white text-[13px] font-bold hover:brightness-110 transition-all active:scale-95 cursor-pointer shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (!file) document.getElementById('import-json-file-modal')?.click();
                else setConfirmOpen(true);
              }}
            >
              Import JSON
            </button>
          </div>
          <input
            id="import-json-file-modal"
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0] ?? null;
              if (f) setFile(f);
            }}
          />
        </div>

        {inlineMsg && (
          <div
            className={`mt-4 flex items-center gap-3 px-3 py-2 rounded-lg border animate-in zoom-in-95 duration-200 ${
              inlineMsg.kind === 'success' ? 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-text)]' : 'bg-red-900/30 border-red-700 text-red-300'
            }`}
          >
            <span className="text-[13px] font-medium">{inlineMsg.text}</span>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setConfirmOpen(false)}>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] w-[480px] max-w-full shadow-2xl overflow-hidden" onClick={(e)=>e.stopPropagation()} role="dialog">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <div className="text-base font-bold text-[var(--fg)]">確認匯入資料？</div>
              <div className="text-[13px] text-[var(--muted)] mt-1">此操作將永久取代您目前的資料與設定。</div>
            </div>
            <div className="px-5 py-3 bg-white/5 flex items-center justify-end gap-2">
              <button className="px-3 py-1.5 rounded-md text-[13px] border border-[var(--border)] text-[var(--muted)] hover:bg-white/5 cursor-pointer" onClick={() => setConfirmOpen(false)}>取消</button>
              <button className="px-4 py-1.5 rounded-md bg-[var(--accent)] text-white text-[13px] font-bold hover:brightness-110 cursor-pointer shadow-sm active:scale-95" onClick={performImport}>確認並取代</button>
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
  const [confirmDialog, setConfirmDialog] = React.useState<{ 
    type: 'gc' | 'restore-snapshot' | 'delete-snapshot' | 'backup' | 'merge' | 'restore-cloud'; 
    snapshotId?: string;
    status: 'idle' | 'processing' | 'success' | 'error';
    resultMessage?: string;
    progress?: string;
  } | null>(null);
  const [actionResult, setActionResult] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showResult = (text: string, type: 'success' | 'error' = 'success') => {
    setActionResult({ text, type });
    setTimeout(() => setActionResult(null), 3000);
  };

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
    loadSyncStatus();
    loadSnapshotsList();
    loadGCStats();
    const listener = (changes: any, areaName: string) => {
      if (areaName === 'local' && (changes['cloudSync.status'] || changes['cloudSync.snapshots'])) {
        loadSyncStatus(); loadSnapshotsList();
      }
    };
    try { chrome.storage?.onChanged?.addListener?.(listener); } catch {}
    return () => { try { chrome.storage?.onChanged?.removeListener?.(listener); } catch {} };
  }, [loadSyncStatus]);

  async function loadSnapshotsList() {
    try {
      const snapshotModule = await import('../data/snapshotService');
      const list = await snapshotModule.listSnapshots();
      setSnapshots(list);
    } catch { setSnapshots([]); }
  }

  async function doRestoreSnapshot(snapshotId: string) {
    setLoadingSnapshots(true); setError(undefined); setConfirmDialog(null);
    try {
      const snapshotModule = await import('../data/snapshotService');
      await snapshotModule.restoreSnapshot(snapshotId);
      await Promise.all([pagesActions.load(), catActions?.reload?.(), tplActions?.reload?.()]);
      await loadSnapshotsList();
      await loadGCStats(); // Reload GC stats after restore
      showResult('快照恢復成功');
    } catch (e: any) { setError(String(e?.message || e)); } finally { setLoadingSnapshots(false); }
  }

  async function doDeleteSnapshot(snapshotId: string) {
    setConfirmDialog(null);
    try {
      const snapshotModule = await import('../data/snapshotService');
      await snapshotModule.deleteSnapshot(snapshotId);
      await loadSnapshotsList();
      showResult('快照刪除成功');
    } catch (e: any) { setError(String(e?.message || e)); }
  }

  async function loadGCStats() {
    try {
      const gcModule = await import('../data/gcService');
      setGcStats(await gcModule.getGCStats());
    } catch { setGcStats(null); }
  }

  async function doRunGC() {
    if (!confirmDialog) return;
    setConfirmDialog({ ...confirmDialog, status: 'processing', progress: '正在清理已刪除項目...' });
    setLoadingGC(true);
    try {
      const gcModule = await import('../data/gcService');
      const result = await gcModule.runGC(0);
      await loadGCStats();
      const msg = result.cleaned > 0 ? `成功清理 ${result.cleaned} 個項目` : '無已刪除項目需清理';
      setConfirmDialog(prev => prev ? { ...prev, status: 'success', resultMessage: msg, progress: undefined } : null);
      showResult(msg);
    } catch (e: any) {
      setConfirmDialog(prev => prev ? { ...prev, status: 'error', resultMessage: String(e?.message || e), progress: undefined } : null);
    } finally { setLoadingGC(false); }
  }

  async function doConnect() {
    try {
      const mod = await import('../data/syncService');
      await mod.connect();
      setConnected(true);
      const refreshed = mod.getStatus();
      setLast(refreshed.lastSyncedAt);
      setAutoEnabled(!!refreshed.auto);
      setPendingPush(!!refreshed.pendingPush);
      showResult('已連線 Google Drive');
    } catch (e: any) { setError(String(e?.message || e)); }
  }
  
  async function doBackup() {
    if (!confirmDialog) return;
    const s = createStorageService();
    const count = (await s.loadFromLocal()).length;
    setConfirmDialog({ ...confirmDialog, status: 'processing', progress: `正在備份 ${count} 個書籤...` });
    setSyncing(true);
    try {
      const mod = await import('../data/syncService');
      await mod.backupNow();
      const st = mod.getStatus();
      setLast(st.lastSyncedAt);
      setConfirmDialog(prev => prev ? { ...prev, status: 'success', resultMessage: '備份成功！' } : null);
      showResult('備份成功');
    } catch (e: any) {
      setConfirmDialog(prev => prev ? { ...prev, status: 'error', resultMessage: String(e?.message || e) } : null);
    } finally { setSyncing(false); }
  }
  
  async function doRestore(merge = true) {
    if (!confirmDialog) return;
    setConfirmDialog({ ...confirmDialog, status: 'processing', progress: merge ? '正在合併資料...' : '正在下載並備份...' });
    setSyncing(true);
    try {
      const mod = await import('../data/syncService');
      if (!merge) {
        const snapshotModule = await import('../data/snapshotService');
        await snapshotModule.createSnapshot('before-restore');
      }
      await mod.restoreNow(undefined, merge);
      const st = mod.getStatus();
      setLast(st.lastSyncedAt);
      setConfirmDialog(prev => prev ? { ...prev, status: 'success', resultMessage: merge ? '合併成功！' : '還原成功！' } : null);
      showResult(merge ? '合併完成' : '還原成功');
    } catch (e: any) {
      setConfirmDialog(prev => prev ? { ...prev, status: 'error', resultMessage: String(e?.message || e) } : null);
    } finally { setSyncing(false); }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div id="tab-cloud" className="tab-content">
        <h2 className="text-[18px] font-bold mb-1 text-[var(--fg)]">Google Drive 雲端同步</h2>
        <p className="text-[13px] text-[var(--muted)] mb-5 leading-relaxed">使用 Google Drive 儲存備份（私有、不顯示於雲端硬碟）</p>

        <div className="flex items-center gap-3 mb-5">
          {connected ? (
            <>
              <div className="inline-flex items-center px-2 py-0.5 rounded text-[12px] bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success-text)]">已連線</div>
              <button className="text-[13px] px-2 py-1 rounded border border-[var(--border)] text-[var(--muted)] bg-transparent hover:bg-[var(--surface)] transition-all cursor-pointer" onClick={async () => {
                const mod = await import('../data/syncService');
                await mod.disconnect(); setConnected(false); setAutoEnabled(false); showResult('已中斷連線');
              }}>中斷連線</button>
              <span className="text-[12px] opacity-60 ml-auto text-[var(--muted)]">最後同步：{last ? new Date(last).toLocaleString('zh-TW', { hour12: false }) : '從未'}</span>
            </>
          ) : (
            <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--accent)] bg-[var(--accent)] text-white text-[13px] font-bold hover:opacity-90 transition-all cursor-pointer" onClick={doConnect}>連線 Google Drive</button>
          )}
        </div>

        {connected && (
          <>
            <div className="h-px bg-[var(--border)] my-5"></div>
            <div className="text-[13px] font-medium mb-2 text-[var(--fg)]">手動操作</div>
            <div className="flex gap-2 mb-2 items-center">
              <button className="text-[13px] px-3 py-1.5 rounded-md border border-[var(--border)] bg-transparent text-[var(--muted)] hover:bg-[var(--surface)] transition-all cursor-pointer" disabled={syncing} onClick={() => setConfirmDialog({ type: 'backup', status: 'idle' })}>立即備份</button>
              <button className="text-[13px] px-3 py-1.5 rounded-md border border-[var(--accent)] text-[var(--accent)] bg-transparent hover:bg-[var(--accent-hover)] transition-all cursor-pointer" disabled={syncing} onClick={() => setConfirmDialog({ type: 'merge', status: 'idle' })}>合併雲端資料</button>
              <button className="text-[13px] px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--muted)] bg-transparent hover:bg-[var(--surface)] transition-all cursor-pointer" disabled={syncing} onClick={() => setConfirmDialog({ type: 'restore-cloud', status: 'idle' })}>完全還原</button>
              {actionResult && <span className="text-[12px] text-[var(--success-text)] ml-2 animate-in fade-in duration-300">✓ {actionResult.text}</span>}
            </div>
            <div className="text-[11px] text-[var(--muted)] opacity-60">備份：上傳本地到雲端 / 合併：保留較新版本 / 完全還原：雲端覆蓋本地</div>

            <div className="h-px bg-[var(--border)] my-5"></div>
            <label className="flex gap-2.5 cursor-pointer items-start">
              <input type="checkbox" checked={autoEnabled} onChange={async (e) => {
                const mod = await import('../data/syncService');
                await mod.setAutoSync(e.target.checked); setAutoEnabled(e.target.checked); showResult(e.target.checked ? '自動同步已啟用' : '自動同步已停用');
              }} style={{ accentColor: 'var(--accent)' }} className="mt-0.5" />
              <div>
                <div className="text-[13px] font-medium text-[var(--fg)] leading-none mb-1.5">自動同步</div>
                <div className="text-[12px] opacity-70 text-[var(--muted)]">啟用後，本地變更會自動上傳；啟動時自動下載</div>
              </div>
            </label>
          </>
        )}

        <div className="h-px bg-[var(--border)] my-5"></div>
        <div className="text-[13px] font-medium mb-1.5 text-[var(--fg)]">垃圾回收 (GC)</div>
        <div className="bg-white/[0.03] border border-[var(--border)] rounded-md p-3 text-[12px] mb-2.5">
          <div className="flex justify-between mb-1"><span className="opacity-70">已刪除項目：</span><span>{gcStats?.totalTombstones ?? 0} 個</span></div>
          <div className="flex justify-between"><span className="opacity-70">最舊項目：</span><span>{gcStats?.oldestTombstone ? new Date(gcStats.oldestTombstone).toLocaleDateString('zh-TW') : '無'}</span></div>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-[13px] px-3 py-1.5 rounded-md border border-[var(--border)] bg-transparent text-[var(--muted)] hover:bg-[var(--surface)] transition-all cursor-pointer disabled:opacity-50" disabled={loadingGC || !gcStats?.totalTombstones} onClick={() => setConfirmDialog({ type: 'gc', status: 'idle' })}>執行 GC</button>
          {actionResult && actionResult.text.includes('清理') && <span className="text-[12px] text-[var(--success-text)]">✓ {actionResult.text}</span>}
        </div>

        <div className="h-px bg-[var(--border)] my-5"></div>
        <div className="text-[13px] font-medium mb-1.5 text-[var(--fg)]">本地快照</div>
        {snapshots.length === 0 ? (
          <div className="text-[12px] text-[var(--muted)] opacity-60 p-3 bg-white/[0.03] border border-[var(--border)] rounded-md">尚無快照</div>
        ) : (
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div key={s.id} className="bg-white/[0.03] border border-[var(--border)] rounded-md p-2.5 flex justify-between items-center">
                <div>
                  <div className="text-[12px] font-semibold">{new Date(s.createdAt).toLocaleString('zh-TW', { hour12: false })}</div>
                  <div className="text-[11px] opacity-60">{s.reason === 'before-restore' ? '還原前' : s.reason === 'before-merge' ? '合併前' : '手動'} · {s.summary.webpages} 網頁</div>
                </div>
                <div className="flex gap-1.5">
                  <button className="text-[11px] px-2 py-1 rounded border border-[var(--accent)] text-[var(--accent)] bg-transparent hover:bg-[var(--accent-hover)] cursor-pointer" onClick={() => setConfirmDialog({ type: 'restore-snapshot', snapshotId: s.id, status: 'idle' })}>恢復</button>
                  <button className="text-[11px] px-2 py-1 rounded border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)] cursor-pointer" onClick={() => setConfirmDialog({ type: 'delete-snapshot', snapshotId: s.id, status: 'idle' })}>刪除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 z-[10001] bg-black/70 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => { if (confirmDialog.status !== 'processing') setConfirmDialog(null); }}>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] w-[460px] max-w-[95vw]" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <div className="text-base font-bold">
                {confirmDialog.type === 'gc' ? '確認執行 GC' : confirmDialog.type === 'backup' ? '確認立即備份' : confirmDialog.type === 'merge' ? '確認合併資料' : confirmDialog.type === 'restore-cloud' ? '確認完全還原' : '確認操作'}
              </div>
            </div>
            <div className="px-5 py-5 text-[13px] text-[var(--muted)] leading-relaxed">
              {confirmDialog.status === 'processing' ? (
                <div className="flex flex-col items-center py-4"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-3"></div><div>{confirmDialog.progress || '正在執行中...'}</div></div>
              ) : confirmDialog.status === 'success' ? (
                <div className="py-4 text-center"><div className="text-[var(--success-text)] font-bold mb-1">操作成功</div><div className="text-[12px] opacity-80">{confirmDialog.resultMessage}</div></div>
              ) : confirmDialog.status === 'error' ? (
                <div className="py-4 text-center"><div className="text-red-400 font-bold mb-1">操作失敗</div><div className="text-[12px] opacity-80">{confirmDialog.resultMessage}</div></div>
              ) : (
                <>
                  {confirmDialog.type === 'gc' && '確定要立即清理所有已刪除項目？此操作不可回復。'}
                  {confirmDialog.type === 'backup' && '確定要將本地資料上傳至雲端？这将覆蓋雲端上的備份。'}
                  {confirmDialog.type === 'merge' && '確定要合併雲端資料？系統將保留兩端較新的變更。'}
                  {confirmDialog.type === 'restore-cloud' && '確定要完全還原雲端資料？⚠️ 本地資料將被完全覆蓋，但系統會先自動建立本地快照以防萬一。'}
                  {confirmDialog.type === 'restore-snapshot' && '確定要恢復此快照？當前資料將被替換。'}
                  {confirmDialog.type === 'delete-snapshot' && '確定要刪除此快照？'}
                </>
              )}
            </div>
            <div className="px-5 py-3 border-t border-[var(--border)] bg-white/5 flex justify-end gap-2">
              {confirmDialog.status === 'idle' ? (
                <>
                  <button className="px-3 py-1.5 rounded-md text-[13px] border border-[var(--border)] text-[var(--muted)] hover:bg-white/5 cursor-pointer" onClick={() => setConfirmDialog(null)}>取消</button>
                  <button className={`px-3 py-1.5 rounded-md text-[13px] border text-white font-bold cursor-pointer ${confirmDialog.type === 'restore-cloud' || confirmDialog.type === 'delete-snapshot' ? 'bg-red-600 border-red-600' : 'bg-[var(--accent)] border-[var(--accent)]'}`} onClick={() => {
                    if (confirmDialog.type === 'gc') doRunGC(); else if (confirmDialog.type === 'backup') doBackup(); else if (confirmDialog.type === 'merge') doRestore(true); else if (confirmDialog.type === 'restore-cloud') doRestore(false); else if (confirmDialog.type === 'restore-snapshot' && confirmDialog.snapshotId) doRestoreSnapshot(confirmDialog.snapshotId); else if (confirmDialog.type === 'delete-snapshot' && confirmDialog.snapshotId) doDeleteSnapshot(confirmDialog.snapshotId);
                  }}>確認執行</button>
                </>
              ) : confirmDialog.status !== 'processing' ? (
                <button className="px-4 py-1.5 rounded-md text-[13px] border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] cursor-pointer" onClick={() => setConfirmDialog(null)}>關閉</button>
              ) : <button className="px-3 py-1.5 rounded-md text-[13px] border border-[var(--border)] text-[var(--muted)] opacity-50 cursor-not-allowed">執行中...</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};