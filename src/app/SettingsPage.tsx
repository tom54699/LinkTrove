import React from 'react';
import {
  createExportImportService,
  type ExportImportService,
} from './data/exportImport';
import { createStorageService } from '../background/storageService';
import { useFeedback } from './ui/feedback';
import { useWebpages } from './webpages/WebpagesProvider';
import { useCategories } from './sidebar/categories';
import { useTemplates } from './templates/TemplatesProvider';
import { TemplatesManager } from './templates/TemplatesManager';

export const Settings: React.FC<{ ei?: ExportImportService }> = ({ ei }) => {
  const svc = React.useMemo(
    () => ei ?? createExportImportService({ storage: createStorageService() }),
    [ei]
  );
  const { showToast, setLoading } = useFeedback();
  const [file, setFile] = React.useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [inlineMsg, setInlineMsg] = React.useState<
    null | { kind: 'success'; text: string }
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
    // Create a simple summary even without preview
    let pagesCount = 0;
    let catsCount = 0;
    let parsedOk = false;
    try {
      const text = await (async () => {
        try {
          if (typeof (file as any).text === 'function') return await (file as any).text();
        } catch {}
        try {
          return await new Response(file as any).text();
        } catch {
          // 最終退路：以 FileReader 讀取
          const content = await new Promise<string>((resolve, reject) => {
            try {
              const fr = new FileReader();
              fr.onerror = () => reject(fr.error);
              fr.onload = () => resolve(String(fr.result || ''));
              fr.readAsText(file as any);
            } catch (e) {
              reject(e);
            }
          });
          return content;
        }
      })();
      try {
        const parsed = JSON.parse(text);
        pagesCount = Array.isArray(parsed?.webpages) ? parsed.webpages.length : 0;
        catsCount = Array.isArray(parsed?.categories) ? parsed.categories.length : 0;
        parsedOk = true;
      } catch {}
      // 先顯示成功摘要（以檔案 JSON 計數），再進行實際匯入
      setInlineMsg({ kind: 'success', text: `Imported: ${pagesCount} pages, ${catsCount} categories` });
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
      // 僅在 JSON 解析失敗時顯示錯誤
      if (msg === 'Invalid JSON' || !parsedOk) showToast('Invalid JSON', 'error');
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
                className="rounded border-2 border-dashed border-slate-600 hover:border-[var(--accent)] hover:bg-[var(--accent-hover)] p-3 text-sm"
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) setFile(f);
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
                    className="ml-auto text-sm px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
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
                'bg-[var(--accent-hover)] border-[var(--accent)]/60'
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
                    className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)]"
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
