/**
 * Share Dialog Component
 * Allows users to configure and share a group via GitHub Gist or local HTML file
 */

import React from 'react';
import { useI18n } from '../../../i18n';

interface ShareDialogProps {
  isOpen: boolean;
  groupName: string;
  itemCount: number;
  shareTitle: string;
  shareDescription: string;
  onClose: () => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPublishToGist: () => void;
  onDownloadHtml: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  groupName,
  itemCount,
  shareTitle,
  shareDescription,
  onClose,
  onTitleChange,
  onDescriptionChange,
  onPublishToGist,
  onDownloadHtml,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--panel)] w-[520px] max-w-[95vw] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('share_settings')}
      >
        <div className="text-lg font-bold mb-6">{t('share_group_title', [groupName])}</div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
              {t('share_title_label')}
            </label>
            <input
              type="text"
              className="w-full rounded-lg bg-[var(--input-bg)] border border-[var(--border)] px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition-all"
              value={shareTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t('share_title_placeholder')}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
              {t('share_description_label')}
            </label>
            <textarea
              className="w-full rounded-lg bg-[var(--input-bg)] border border-[var(--border)] px-4 py-2.5 text-sm h-24 resize-none focus:outline-none focus:border-[var(--accent)] transition-all"
              value={shareDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={t('share_description_placeholder')}
            />
          </div>

          <div className="text-[11px] text-[var(--muted)] space-y-2 bg-[var(--bg)]/30 p-4 rounded-xl border border-white/5">
            <div className="font-bold uppercase tracking-widest text-[10px] opacity-70 mb-1">{t('share_items_count', [String(itemCount)])}</div>
            <div className="flex gap-2">
              <span className="opacity-80">📤</span>
              <span><strong>{t('share_publish_btn')}</strong>: {t('share_publish_hint')}</span>
            </div>
            <div className="flex gap-2">
              <span className="opacity-80">💾</span>
              <span><strong>{t('share_download_btn')}</strong>: {t('share_download_hint')}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            className="px-5 py-2 text-sm font-bold rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-all cursor-pointer"
            onClick={onClose}
          >
            {t('btn_cancel')}
          </button>
          <button
            className="px-5 py-2 text-sm font-bold rounded-lg border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer disabled:opacity-30"
            onClick={onPublishToGist}
            disabled={!shareTitle.trim()}
            title={t('share_publish_title')}
          >
            {t('share_publish_btn')}
          </button>
          <button
            className="px-5 py-2 text-sm font-bold rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onDownloadHtml}
            disabled={!shareTitle.trim()}
          >
            {t('share_download_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};
