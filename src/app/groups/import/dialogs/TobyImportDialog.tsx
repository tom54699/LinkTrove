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
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onCancel}
    >
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--panel)] w-[480px] max-w-[95vw] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('import_toby_title')}
      >
        <div className="text-lg font-bold mb-2">{t('import_toby_title')}</div>
        <div className="text-[13px] text-[var(--muted)] leading-relaxed">
          {t('import_file_info', [fileName || ''])} {linkCount !== undefined ? `— ${t('import_link_count', [String(linkCount)])}` : ''}
        </div>
        
        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            className="px-5 py-2 text-sm font-bold rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-all cursor-pointer"
            onClick={onCancel}
          >
            {t('btn_cancel')}
          </button>
          <button
            className="px-5 py-2 text-sm font-bold rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onConfirm}
          >
            {t('btn_start_import')}
          </button>
        </div>
      </div>
    </div>
  );
};
