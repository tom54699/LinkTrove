/**
 * Toby Import Confirmation Dialog Component
 * Confirms Toby JSON import with file preview
 */

import React from 'react';

interface TobyImportDialogProps {
  isOpen: boolean;
  fileName: string | undefined;
  linkCount: number | undefined;
  onCancel: () => void;
  onConfirm: () => void;
}

export const TobyImportDialog: React.FC<TobyImportDialogProps> = ({
  isOpen,
  fileName,
  linkCount,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
      onClick={onCancel}
    >
      <div
        className="rounded border border-slate-700 bg-[var(--bg)] w-[520px] max-w-[95vw] p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Import Toby"
      >
        <div className="text-lg font-semibold">匯入 Toby 到此 group</div>
        <div className="mt-2 text-sm opacity-80">
          檔案：{fileName} {linkCount !== undefined ? `— 連結 ${linkCount}` : ''}
        </div>
        {/* Dedup option removed per request */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
            onClick={onConfirm}
          >
            開始匯入
          </button>
        </div>
      </div>
    </div>
  );
};
