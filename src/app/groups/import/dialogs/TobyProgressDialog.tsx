/**
 * Toby Import Progress Dialog Component
 * Shows import progress with a progress bar and cancellation option
 */

import React from 'react';

interface TobyProgressDialogProps {
  isOpen: boolean;
  processed: number;
  total: number;
  onCancel: () => void;
}

export const TobyProgressDialog: React.FC<TobyProgressDialogProps> = ({
  isOpen,
  processed,
  total,
  onCancel,
}) => {
  if (!isOpen) return null;

  const percentage = total ? Math.min(100, Math.floor((processed / total) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3">
      <div className="rounded border border-slate-700 bg-[var(--bg)] w-[420px] max-w-[90vw] p-5">
        <div className="text-lg font-semibold">匯入中…</div>
        <div className="mt-3 text-sm">{processed}/{total}</div>
        <div className="mt-2 h-2 w-full bg-slate-800 rounded">
          <div
            className="h-2 bg-[var(--accent)] rounded"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
            onClick={onCancel}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
