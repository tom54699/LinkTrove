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
      className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--panel)] w-[520px] max-w-[95vw] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('share_link_title')}
      >
        <div className="h-1 bg-emerald-500"></div>
        
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-lg">✓</div>
            <div className="text-lg font-bold">{t('share_link_created')}</div>
          </div>

          <div className="text-[13px] text-[var(--muted)] mb-6 leading-relaxed">
            {t('share_link_desc')}
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              {t('share_link_label') || 'Public Link'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] text-sm font-mono truncate focus:outline-none focus:border-[var(--accent)]"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                className="px-4 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card)] transition-all cursor-pointer text-sm font-bold whitespace-nowrap"
                onClick={onCopy}
              >
                {t('btn_copy_link')}
              </button>
            </div>
            
            <div className="text-[11px] text-[var(--muted)] opacity-70 flex items-start gap-2 bg-[var(--bg)]/30 p-3 rounded-lg border border-white/5">
              <span>💡</span>
              <div className="leading-snug">
                {t('share_link_hint')} <a href="https://gist.github.com" target="_blank" rel="noopener" className="text-[var(--accent)] hover:underline">gist.github.com</a>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              className="px-5 py-2 text-sm font-bold rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-all cursor-pointer"
              onClick={() => window.open(shareUrl, '_blank')}
            >
              {t('btn_open_link')}
            </button>
            <button
              className="px-5 py-2 text-sm font-bold rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all cursor-pointer"
              onClick={onClose}
            >
              {t('dialog_close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
