import React from 'react';
import { useFeedback } from './feedback';
import { createExportImportService } from '../data/exportImport';
import { createStorageService } from '../../background/storageService';
import { TemplatesManager } from '../templates/TemplatesManager';
import { useWebpages } from '../webpages/WebpagesProvider';
import { useCategories } from '../sidebar/categories';
import { useTemplates } from '../templates/TemplatesProvider';
import { useI18n, LANGUAGE_OPTIONS, type Language } from '../i18n';
import { getBehaviorSettings, setBehaviorSettings, type BehaviorSettings } from '../settings/behaviorSettings';

type Section = 'data' | 'templates';
// 擴充：Cloud Sync 區塊、語言設定、行為設定
type SectionEx = Section | 'cloud' | 'language' | 'behavior';

export const SettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [section, setSection] = React.useState<SectionEx>('data');
  const { t } = useI18n();

  if (!open) return null;

  const sections: { id: SectionEx; label: string; icon: string }[] = [
    { id: 'data', label: t('nav_export_import'), icon: '📥' },
    { id: 'cloud', label: t('nav_cloud_sync'), icon: '☁' },
    { id: 'templates', label: t('nav_templates'), icon: '▦' },
    { id: 'language', label: t('nav_language'), icon: '🌐' },
    { id: 'behavior', label: t('nav_behavior'), icon: '⚙' },
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
            {t('settings_title')}
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
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)]">
          <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            {section === 'data' ? (
              <DataPanel />
            ) : section === 'cloud' ? (
              <CloudSyncPanel />
            ) : section === 'language' ? (
              <LanguagePanel />
            ) : section === 'behavior' ? (
              <BehaviorPanel />
            ) : (
              <TemplatesManager />
            )}
          </main>

          <footer className="px-6 py-3 border-t border-[var(--border)] flex justify-end">
            <button
              className="px-4 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)] transition-all"
              onClick={onClose}
            >
              {t('settings_close')}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

const DataPanel: React.FC = () => {
  const { t } = useI18n();
  const { showToast, setLoading } = useFeedback();
  // useWebpages/useCategories not needed for logic but good for deps? 
  // Actually we force reload via window.location.reload so we don't need them
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
      
      setInlineMsg({ kind: 'success', text: t('data_import_success') });
      showToast(t('toast_import_success'), 'success');
      
      // Force full reload to ensure clean state after full replacement
      setTimeout(() => window.location.reload(), 800);
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
        <h2 className="text-[18px] font-bold mb-1 text-[var(--fg)]">{t('data_title')}</h2>
        <p className="text-[13px] text-[var(--muted)] mb-5 leading-relaxed">
          {t('data_description')}
        </p>

        <div className="text-[13px] font-medium mb-1.5 text-[var(--fg)]">{t('data_export_label')}</div>
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
              showToast(t('data_export_success'), 'success');
            } catch {
              showToast(t('data_export_failed'), 'error');
            } finally {
              setLoading(false);
            }
          }}
        >
          {t('btn_export_json')}
        </button>

        <div className="h-px bg-[var(--border)] my-5"></div>

        <div className="text-[13px] font-medium mb-1.5 text-[var(--fg)]">{t('data_restore_label')}</div>
        <div 
          className="border-2 border-dashed border-[var(--border)] rounded-lg p-4 transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-hover)] cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) setFile(f);
          }}
          onClick={() => {
            // Always open file dialog on click to allow re-selection
            document.getElementById('import-json-file-modal')?.click();
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[var(--muted)] flex-1 truncate">
              {file ? t('data_file_selected', [file.name]) : t('data_drop_hint')}
            </span>
            <button 
              className="px-4 py-2 rounded-lg bg-[var(--accent)] border border-[var(--accent)] text-white text-[13px] font-bold hover:brightness-110 transition-all active:scale-95 cursor-pointer shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (!file) document.getElementById('import-json-file-modal')?.click();
                else setConfirmOpen(true);
              }}
            >
              {t('btn_import_json')}
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
              e.currentTarget.value = ''; // Reset to allow re-selecting same file
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
              <div className="text-base font-bold text-[var(--fg)]">{t('data_confirm_import_title')}</div>
              <div className="text-[13px] text-[var(--muted)] mt-1">{t('data_confirm_import_desc')}</div>
            </div>
            <div className="px-5 py-3 bg-white/5 flex items-center justify-end gap-2">
              <button className="px-3 py-1.5 rounded-md text-[13px] border border-[var(--border)] text-[var(--muted)] hover:bg-white/5 cursor-pointer" onClick={() => setConfirmOpen(false)}>{t('btn_cancel')}</button>
              <button className="px-4 py-1.5 rounded-md bg-[var(--accent)] text-white text-[13px] font-bold hover:brightness-110 cursor-pointer shadow-sm active:scale-95" onClick={performImport}>{t('btn_confirm_replace')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CloudSyncPanel: React.FC = () => {
  const { t } = useI18n();
  const { actions: pagesActions } = useWebpages();
  const { actions: catActions } = useCategories() as any;
  const { actions: tplActions } = useTemplates();
  const [connected, setConnected] = React.useState(false);
  const [last, setLast] = React.useState<string | undefined>(undefined);
  const [syncing, setSyncing] = React.useState(false);
  const [blocking, setBlocking] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [autoEnabled, setAutoEnabled] = React.useState(false);
  const [snapshots, setSnapshots] = React.useState<any[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = React.useState(false);
  const [confirmDialog, setConfirmDialog] = React.useState<{ 
    type: 'restore-snapshot' | 'delete-snapshot' | 'backup' | 'merge' | 'restore-cloud'; 
    snapshotId?: string;
    status: 'idle' | 'processing' | 'success' | 'error';
    resultMessage?: string;
    progress?: string;
  } | null>(null);
  const [autoSyncDialogOpen, setAutoSyncDialogOpen] = React.useState(false);
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
      setBlocking(!!st.blocking);
      setError(st.error);
      setAutoEnabled(!!st.auto);
    } catch {}
  }, []);

  React.useEffect(() => {
    loadSyncStatus();
    loadSnapshotsList();
    const listener = (changes: any, areaName: string) => {
      if (areaName === 'local' && (changes['cloudSync.status'] || changes['cloudSync.snapshots'])) {
        loadSyncStatus(); loadSnapshotsList();
      }
    };
    try { chrome.storage?.onChanged?.addListener?.(listener); } catch {}
    return () => { try { chrome.storage?.onChanged?.removeListener?.(listener); } catch {} };
  }, [loadSyncStatus]);

  React.useEffect(() => {
    if (blocking && syncing && !confirmDialog) {
      setAutoSyncDialogOpen(true);
      setConfirmDialog({ type: 'merge', status: 'processing', progress: t('dialog_processing') });
      return;
    }
    if ((!blocking || !syncing) && autoSyncDialogOpen && !error) {
      setConfirmDialog(null);
      setAutoSyncDialogOpen(false);
    }
  }, [blocking, syncing, confirmDialog, autoSyncDialogOpen, error, t]);

  React.useEffect(() => {
    if (!autoSyncDialogOpen) return;
    if (!error) return;
    setConfirmDialog(prev => prev ? { ...prev, status: 'error', resultMessage: error, progress: undefined } : prev);
  }, [autoSyncDialogOpen, error]);

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
      showResult(t('snapshot_restored'));
    } catch (e: any) { setError(String(e?.message || e)); } finally { setLoadingSnapshots(false); }
  }

  async function doDeleteSnapshot(snapshotId: string) {
    setConfirmDialog(null);
    try {
      const snapshotModule = await import('../data/snapshotService');
      await snapshotModule.deleteSnapshot(snapshotId);
      await loadSnapshotsList();
      showResult(t('snapshot_deleted'));
    } catch (e: any) { setError(String(e?.message || e)); }
  }

  async function doConnect() {
    try {
      const mod = await import('../data/syncService');
      await mod.connect({ blockingOnSync: true });
      await loadSyncStatus();
      showResult(t('cloud_connected'));
    } catch (e: any) { setError(String(e?.message || e)); }
  }

  async function doBackup() {
    if (!confirmDialog) return;
    const s = createStorageService();
    const count = (await s.loadFromLocal()).length;
    setConfirmDialog({ ...confirmDialog, status: 'processing', progress: t('items_count', [count]) + '...' });
    setSyncing(true);
    try {
      const mod = await import('../data/syncService');
      await mod.backupNow({ blocking: false });
      const st = mod.getStatus();
      setLast(st.lastSyncedAt);
      setConfirmDialog(prev => prev ? { ...prev, status: 'success', resultMessage: t('cloud_backup_success') } : null);
      showResult(t('cloud_backup_success'));
    } catch (e: any) {
      setConfirmDialog(prev => prev ? { ...prev, status: 'error', resultMessage: String(e?.message || e) } : null);
    } finally { setSyncing(false); }
  }
  
  async function doRestore(merge = true) {
    if (!confirmDialog) return;
    setConfirmDialog({ ...confirmDialog, status: 'processing', progress: t('dialog_processing') });
    setSyncing(true);
    try {
      const mod = await import('../data/syncService');
      if (!merge) {
        const snapshotModule = await import('../data/snapshotService');
        await snapshotModule.createSnapshot('before-restore');
      }
      await mod.restoreNow(undefined, merge, { blocking: false });
      const st = mod.getStatus();
      setLast(st.lastSyncedAt);
      setConfirmDialog(prev => prev ? { ...prev, status: 'success', resultMessage: merge ? t('cloud_merge_success') : t('cloud_restore_success') } : null);
      showResult(merge ? t('cloud_merge_success') : t('cloud_restore_success'));
    } catch (e: any) {
      setConfirmDialog(prev => prev ? { ...prev, status: 'error', resultMessage: String(e?.message || e) } : null);
    } finally { setSyncing(false); }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div id="tab-cloud" className="tab-content">
        <h2 className="text-[18px] font-bold mb-1 text-[var(--fg)]">{t('cloud_title')}</h2>
        <p className="text-[13px] text-[var(--muted)] mb-5 leading-relaxed">{t('cloud_description')}</p>

        <div className="flex items-center gap-3 mb-5">
          {connected ? (
            <>
              <div className="inline-flex items-center px-2 py-0.5 rounded text-[12px] bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success-text)]">{t('cloud_connected')}</div>
              <button className="text-[13px] px-2 py-1 rounded border border-[var(--border)] text-[var(--muted)] bg-transparent hover:bg-[var(--surface)] transition-all cursor-pointer" onClick={async () => {
                const mod = await import('../data/syncService');
                await mod.disconnect(); setConnected(false); setAutoEnabled(false); showResult(t('cloud_disconnected'));
              }}>{t('cloud_disconnect')}</button>
              <span className="text-[12px] opacity-60 ml-auto text-[var(--muted)]">{t('cloud_last_sync')}{last ? new Date(last).toLocaleString('zh-TW', { hour12: false }) : t('cloud_never')}</span>
            </>
          ) : (
            <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--accent)] bg-[var(--accent)] text-white text-[13px] font-bold hover:opacity-90 transition-all cursor-pointer" onClick={doConnect}>{t('cloud_connect')}</button>
          )}
        </div>

        {connected && (
          <>
            <div className="h-px bg-[var(--border)] my-5"></div>
            <div className="text-[13px] font-medium mb-2 text-[var(--fg)]">{t('cloud_manual_ops')}</div>
            <div className="flex gap-2 mb-2 items-center">
              <button className="text-[13px] px-3 py-1.5 rounded-md border border-[var(--border)] bg-transparent text-[var(--muted)] hover:bg-[var(--surface)] transition-all cursor-pointer" disabled={syncing} onClick={() => setConfirmDialog({ type: 'backup', status: 'idle' })}>{t('cloud_backup_now')}</button>
              <button className="text-[13px] px-3 py-1.5 rounded-md border border-[var(--accent)] text-[var(--accent)] bg-transparent hover:bg-[var(--accent-hover)] transition-all cursor-pointer" disabled={syncing} onClick={() => setConfirmDialog({ type: 'merge', status: 'idle' })}>{t('cloud_merge')}</button>
              <button className="text-[13px] px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--muted)] bg-transparent hover:bg-[var(--surface)] transition-all cursor-pointer" disabled={syncing} onClick={() => setConfirmDialog({ type: 'restore-cloud', status: 'idle' })}>{t('cloud_full_restore')}</button>
              {actionResult && <span className="text-[12px] text-[var(--success-text)] ml-2 animate-in fade-in duration-300">✓ {actionResult.text}</span>}
            </div>
            <div className="text-[11px] text-[var(--muted)] opacity-60">{t('cloud_ops_hint')}</div>

            <div className="h-px bg-[var(--border)] my-5"></div>
            <label className="flex gap-2.5 cursor-pointer items-start">
              <input type="checkbox" checked={autoEnabled} onChange={async (e) => {
                const mod = await import('../data/syncService');
                await mod.setAutoSync(e.target.checked); setAutoEnabled(e.target.checked); showResult(e.target.checked ? t('cloud_auto_enabled') : t('cloud_auto_disabled'));
              }} style={{ accentColor: 'var(--accent)' }} className="mt-0.5" />
              <div>
                <div className="text-[13px] font-medium text-[var(--fg)] leading-none mb-1.5">{t('cloud_auto_sync')}</div>
                <div className="text-[12px] opacity-70 text-[var(--muted)]">{t('cloud_auto_sync_desc')}</div>
              </div>
            </label>
          </>
        )}

        <div className="h-px bg-[var(--border)] my-5"></div>
        <div className="text-[13px] font-medium mb-1.5 text-[var(--fg)]">{t('snapshot_title')}</div>
        {snapshots.length === 0 ? (
          <div className="text-[12px] text-[var(--muted)] opacity-60 p-3 bg-white/[0.03] border border-[var(--border)] rounded-md">{t('snapshot_empty')}</div>
        ) : (
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div key={s.id} className="bg-white/[0.03] border border-[var(--border)] rounded-md p-2.5 flex justify-between items-center">
                <div>
                  <div className="text-[12px] font-semibold">{new Date(s.createdAt).toLocaleString('zh-TW', { hour12: false })}</div>
                  <div className="text-[11px] opacity-60">{s.reason === 'before-restore' ? t('snapshot_before_restore') : s.reason === 'before-merge' ? t('snapshot_before_merge') : t('snapshot_manual')} · {t('snapshot_pages', [s.summary.webpages])}</div>
                </div>
                <div className="flex gap-1.5">
                  <button className="text-[11px] px-2 py-1 rounded border border-[var(--accent)] text-[var(--accent)] bg-transparent hover:bg-[var(--accent-hover)] cursor-pointer" onClick={() => setConfirmDialog({ type: 'restore-snapshot', snapshotId: s.id, status: 'idle' })}>{t('snapshot_restore')}</button>
                  <button className="text-[11px] px-2 py-1 rounded border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)] cursor-pointer" onClick={() => setConfirmDialog({ type: 'delete-snapshot', snapshotId: s.id, status: 'idle' })}>{t('snapshot_delete')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDialog && (
        <div
          className="fixed inset-0 z-[10001] bg-black/70 flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => {
            if (confirmDialog.status !== 'processing') {
              setConfirmDialog(null);
              if (autoSyncDialogOpen) setAutoSyncDialogOpen(false);
            }
          }}
        >
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] w-[460px] max-w-[95vw]" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <div className="text-base font-bold">
                {confirmDialog.type === 'backup' ? t('confirm_backup_title') : confirmDialog.type === 'merge' ? t('confirm_merge_title') : confirmDialog.type === 'restore-cloud' ? t('confirm_restore_title') : t('btn_confirm')}
              </div>
            </div>
            <div className="px-5 py-5 text-[13px] text-[var(--muted)] leading-relaxed">
              {confirmDialog.status === 'processing' ? (
                <div className="flex flex-col items-center py-4"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-3"></div><div>{confirmDialog.progress || t('dialog_processing')}</div></div>
              ) : confirmDialog.status === 'success' ? (
                <div className="py-4 text-center"><div className="text-[var(--success-text)] font-bold mb-1">{t('dialog_success')}</div><div className="text-[12px] opacity-80">{confirmDialog.resultMessage}</div></div>
              ) : confirmDialog.status === 'error' ? (
                <div className="py-4 text-center"><div className="text-red-400 font-bold mb-1">{t('dialog_failed')}</div><div className="text-[12px] opacity-80">{confirmDialog.resultMessage}</div></div>
              ) : (
                <>
                  {confirmDialog.type === 'backup' && t('confirm_backup_desc')}
                  {confirmDialog.type === 'merge' && t('confirm_merge_desc')}
                  {confirmDialog.type === 'restore-cloud' && t('confirm_restore_desc')}
                  {confirmDialog.type === 'restore-snapshot' && t('snapshot_restore_confirm')}
                  {confirmDialog.type === 'delete-snapshot' && t('snapshot_delete_confirm')}
                </>
              )}
            </div>
            <div className="px-5 py-3 border-t border-[var(--border)] bg-white/5 flex justify-end gap-2">
              {confirmDialog.status === 'idle' ? (
                <>
                  <button
                    className="px-3 py-1.5 rounded-md text-[13px] border border-[var(--border)] text-[var(--muted)] hover:bg-white/5 cursor-pointer"
                    onClick={() => {
                      setConfirmDialog(null);
                      if (autoSyncDialogOpen) setAutoSyncDialogOpen(false);
                    }}
                  >
                    {t('btn_cancel')}
                  </button>
                  <button className={`px-3 py-1.5 rounded-md text-[13px] border text-white font-bold cursor-pointer ${confirmDialog.type === 'restore-cloud' || confirmDialog.type === 'delete-snapshot' ? 'bg-red-600 border-red-600' : 'bg-[var(--accent)] border-[var(--accent)]'}`} onClick={() => {
                    if (confirmDialog.type === 'backup') doBackup(); else if (confirmDialog.type === 'merge') doRestore(true); else if (confirmDialog.type === 'restore-cloud') doRestore(false); else if (confirmDialog.type === 'restore-snapshot' && confirmDialog.snapshotId) doRestoreSnapshot(confirmDialog.snapshotId); else if (confirmDialog.type === 'delete-snapshot' && confirmDialog.snapshotId) doDeleteSnapshot(confirmDialog.snapshotId);
                  }}>{t('btn_confirm_execute')}</button>
                </>
              ) : confirmDialog.status !== 'processing' ? (
                <button
                  className="px-4 py-1.5 rounded-md text-[13px] border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] cursor-pointer"
                  onClick={() => {
                    setConfirmDialog(null);
                    if (autoSyncDialogOpen) setAutoSyncDialogOpen(false);
                  }}
                >
                  {t('dialog_close')}
                </button>
              ) : <button className="px-3 py-1.5 rounded-md text-[13px] border border-[var(--border)] text-[var(--muted)] opacity-50 cursor-not-allowed">{t('dialog_processing')}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BehaviorPanel: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useFeedback();
  const [settings, setSettings] = React.useState<BehaviorSettings>({ closeTabAfterSave: false });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getBehaviorSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (key: keyof BehaviorSettings, value: boolean) => {
    const updated = await setBehaviorSettings({ [key]: value });
    setSettings(updated);
    showToast(t('settings_saved'), 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-[18px] font-bold mb-1 text-[var(--fg)]">{t('behavior_title')}</h2>
        <p className="text-[13px] text-[var(--muted)] mb-5 leading-relaxed">
          {t('behavior_description')}
        </p>

        <div className="space-y-4">
          <label className="flex gap-3 cursor-pointer items-start p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] transition-all">
            <input
              type="checkbox"
              checked={settings.closeTabAfterSave}
              onChange={(e) => handleToggle('closeTabAfterSave', e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
              className="mt-0.5 w-4 h-4"
            />
            <div className="flex-1">
              <div className="text-[14px] font-medium text-[var(--fg)] leading-tight mb-1">
                {t('behavior_close_tab_after_save')}
              </div>
              <div className="text-[12px] text-[var(--muted)] leading-relaxed">
                {t('behavior_close_tab_after_save_desc')}
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

const LanguagePanel: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  const { showToast } = useFeedback();
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const flagSize = 18;

  const handleLanguageChange = async (newLang: Language) => {
    if (newLang === language) {
      setOpen(false);
      return;
    }
    await setLanguage(newLang);
    showToast(t('lang_changed'), 'success');
    setOpen(false);
  };

  const selectedOption = LANGUAGE_OPTIONS.find((option) => option.value === language) || {
    value: language,
    label: language,
    flag: '🌐',
  };

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-[18px] font-bold mb-1 text-[var(--fg)]">{t('lang_title')}</h2>
        <p className="text-[13px] text-[var(--muted)] mb-5 leading-relaxed">
          {t('lang_description')}
        </p>

        <div className="text-[13px] font-medium mb-2 text-[var(--fg)]">{t('lang_select_label')}</div>
        <div className="relative w-full max-w-[360px]" ref={dropdownRef}>
          <button
            type="button"
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[14px] text-[var(--fg)] flex items-center justify-between gap-3 shadow-sm hover:border-[var(--accent)] transition-all"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className="flex items-center gap-2">
              <img
                src={chrome.runtime.getURL(selectedOption.flag)}
                alt=""
                width={flagSize}
                height={flagSize}
                className="rounded-sm"
                loading="lazy"
              />
              <span>{selectedOption.label}</span>
            </span>
            <svg
              className={`w-4 h-4 text-[var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M5.5 7.5a1 1 0 0 1 1.5 0L10 10.5l3-3a1 1 0 1 1 1.5 1.5l-3.75 3.75a1 1 0 0 1-1.5 0L5.5 9a1 1 0 0 1 0-1.5z" />
            </svg>
          </button>
          <div
            className={`absolute z-20 mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-lg overflow-hidden transition-all ${
              open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
            }`}
            role="listbox"
          >
            <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
              {LANGUAGE_OPTIONS.map((option) => {
                const active = language === option.value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    role="option"
                    aria-selected={active}
                    className={`w-full px-4 py-2.5 flex items-center gap-2 text-[14px] text-left transition-colors ${
                      active
                        ? 'bg-[var(--accent)] text-white font-medium'
                        : 'text-[var(--fg)] hover:bg-[var(--surface)]'
                    }`}
                    onClick={() => handleLanguageChange(option.value)}
                  >
                    <img
                      src={chrome.runtime.getURL(option.flag)}
                      alt=""
                      width={flagSize}
                      height={flagSize}
                      className="rounded-sm"
                      loading="lazy"
                    />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
