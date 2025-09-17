import React from 'react';
import { useFeedback } from './feedback';
import { createExportImportService } from '../data/exportImport';
import { createStorageService } from '../../background/storageService';
import { TemplatesManager } from '../templates/TemplatesManager';
import { useWebpages } from '../webpages/WebpagesProvider';
import { useCategories } from '../sidebar/categories';
import { useTemplates } from '../templates/TemplatesProvider';

type Section = 'data' | 'templates';

export const SettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [section, setSection] = React.useState<Section>('data');
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
                className={`text-left px-2 py-1 rounded ${section==='templates' ? 'bg-slate-800' : 'hover:bg-slate-800/60'}`}
                onClick={() => setSection('templates')}
              >Templates</button>
            </nav>
          </aside>
          <main className="flex-1 p-4 overflow-auto">
            {section === 'data' ? (
              <DataPanel />
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

      <div className="border-t border-slate-700 pt-6">
        <div className="mb-2 text-lg font-semibold">數據維護</div>
        <div className="text-sm opacity-80 mb-4">
          清理系統中的無效數據記錄。
        </div>
        <div>
          <div className="text-sm font-medium mb-2">清理孤立的排序記錄</div>
          <div className="text-xs opacity-70 mb-2">
            清理已刪除 group 留下的排序資料 (order.subcat.*)
          </div>
          <button
            className="text-sm px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
            onClick={async () => {
              setLoading(true);
              try {
                const storage = createStorageService();
                const result = await (storage as any).cleanupOrphanedOrderMeta();
                const msg = `清理完成：已處理 ${result.cleanedCount} 個孤立記錄 (總計 ${result.totalOrderKeys} 個排序記錄)`;
                showToast(msg, 'success');
                setInlineMsg({ kind: 'success', text: msg });
              } catch (e: any) {
                const msg = `清理失敗：${e?.message || 'Unknown error'}`;
                showToast(msg, 'error');
                setInlineMsg({ kind: 'error', text: msg });
              } finally {
                setLoading(false);
              }
            }}
          >
            清理孤立記錄
          </button>
        </div>
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

