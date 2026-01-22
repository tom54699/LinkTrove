/**
 * Toby Import Confirmation Dialog Component
 * Confirms Toby JSON import with file preview
 */

import React from 'react';
import { useI18n } from '../../../i18n';

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
  const { t } = useI18n();

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
        aria-label={t('import_toby_title')}
      >
        <div className="text-lg font-semibold">{t('import_toby_title')}</div>
        <div className="mt-2 text-sm opacity-80">
          {t('import_file_info', [fileName || ''])} {linkCount !== undefined ? `— ${t('import_link_count', [String(linkCount)])}` : ''}
        </div>
        {/* Dedup option removed per request */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
            onClick={onCancel}
          >
            {t('btn_cancel')}
          </button>
          <button
            className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
            onClick={onConfirm}
          >
            {t('btn_start_import')}
          </button>
        </div>
      </div>
    </div>
  );
};
