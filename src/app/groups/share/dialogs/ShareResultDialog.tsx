/**
 * Share Result Dialog Component
 * Displays the generated share URL and provides copy/open actions
 */

import React from 'react';
import { useI18n } from '../../../i18n';

interface ShareResultDialogProps {
  isOpen: boolean;
  shareUrl: string | null;
  onClose: () => void;
  onCopy: () => void;
}

export const ShareResultDialog: React.FC<ShareResultDialogProps> = ({
  isOpen,
  shareUrl,
  onClose,
  onCopy,
}) => {
  const { t } = useI18n();

  if (!isOpen || !shareUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="rounded border border-slate-700 bg-[var(--panel)] w-[560px] max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('share_link_title')}
      >
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="text-base font-semibold">✅ {t('share_link_created')}</div>
        </div>
        <div className="px-4 py-4">
          <div className="text-sm opacity-90 mb-3">
            {t('share_link_desc')}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-600 text-sm font-mono"
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              className="px-3 py-2 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] whitespace-nowrap text-sm"
              onClick={onCopy}
            >
              {t('btn_copy_link')}
            </button>
          </div>
          <div className="mt-3 text-xs opacity-70">
            💡 {t('share_link_hint')} <a href="https://gist.github.com" target="_blank" rel="noopener" className="text-blue-400 hover:underline">gist.github.com</a>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-end gap-2">
          <button
            className="px-3 py-1.5 rounded text-sm border border-slate-600 hover:bg-slate-800"
            onClick={() => window.open(shareUrl, '_blank')}
          >
            {t('btn_open_link')}
          </button>
          <button
            className="px-3 py-1.5 rounded text-sm border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)]"
            onClick={onClose}
          >
            {t('dialog_close')}
          </button>
        </div>
      </div>
    </div>
  );
};
