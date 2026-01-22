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
      className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="rounded border border-slate-700 bg-[var(--bg)] w-[520px] max-w-[95vw] p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('share_settings')}
      >
        <div className="text-lg font-semibold mb-4">{t('share_group_title', [groupName])}</div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('share_title_label')}</label>
            <input
              type="text"
              className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
              value={shareTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t('share_title_placeholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('share_description_label')}</label>
            <textarea
              className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm h-20 resize-none"
              value={shareDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={t('share_description_placeholder')}
            />
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <div>{t('share_items_count', [String(itemCount)])}</div>
            <div className="flex gap-4">
              <span>📤 <strong>{t('share_publish_btn')}</strong>: {t('share_publish_hint')}</span>
            </div>
            <div className="flex gap-4">
              <span>💾 <strong>{t('share_download_btn')}</strong>: {t('share_download_hint')}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
            onClick={onClose}
          >
            {t('btn_cancel')}
          </button>
          <button
            className="px-3 py-1 rounded border border-green-600 text-green-300 hover:bg-green-950/30 disabled:opacity-50"
            onClick={onPublishToGist}
            disabled={!shareTitle.trim()}
            title={t('share_publish_title')}
          >
            {t('share_publish_btn')}
          </button>
          <button
            className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
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
