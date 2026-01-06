/**
 * Share Dialog Component
 * Allows users to configure and share a group via GitHub Gist or local HTML file
 */

import React from 'react';

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
        aria-label="分享設定"
      >
        <div className="text-lg font-semibold mb-4">分享「{groupName}」</div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">分享標題</label>
            <input
              type="text"
              className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
              value={shareTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="自訂分享頁面的標題"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">分享描述</label>
            <textarea
              className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm h-20 resize-none"
              value={shareDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="簡單描述這個分享的內容"
            />
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <div>包含 {itemCount} 個項目</div>
            <div className="flex gap-4">
              <span>📤 <strong>發布分享連結</strong>：需要您的 GitHub token，自動上傳到您的 Gist</span>
            </div>
            <div className="flex gap-4">
              <span>💾 <strong>下載 HTML</strong>：下載檔案到本機，可手動上傳</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="px-3 py-1 rounded border border-green-600 text-green-300 hover:bg-green-950/30 disabled:opacity-50"
            onClick={onPublishToGist}
            disabled={!shareTitle.trim()}
            title="發布到 GitHub Gist 並獲得分享連結"
          >
            發布分享連結
          </button>
          <button
            className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
            onClick={onDownloadHtml}
            disabled={!shareTitle.trim()}
          >
            下載 HTML
          </button>
        </div>
      </div>
    </div>
  );
};
