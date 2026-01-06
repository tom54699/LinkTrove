/**
 * GitHub Token Setup Dialog Component
 * Allows users to configure their GitHub Personal Access Token for Gist publishing
 */

import React from 'react';

interface TokenDialogProps {
  isOpen: boolean;
  token: string;
  onClose: () => void;
  onTokenChange: (value: string) => void;
  onSave: () => void;
}

export const TokenDialog: React.FC<TokenDialogProps> = ({
  isOpen,
  token,
  onClose,
  onTokenChange,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="rounded border border-slate-700 bg-[var(--bg)] w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">設定 GitHub Token</h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-300 mb-3">
              需要 GitHub Personal Access Token 才能發布分享連結到 Gist
            </p>

            <div className="text-xs text-slate-400 space-y-2 mb-4">
              <div>🔗 <a href="https://github.com/settings/tokens" target="_blank" rel="noopener" className="text-blue-400 hover:underline">前往 GitHub 設定頁面</a></div>
              <div>📝 點擊「Generate new token (classic)」</div>
              <div>✅ 勾選「gist」權限（僅需此權限）</div>
              <div>💾 複製產生的 token</div>
            </div>

            <div className="px-3 py-2 bg-amber-900/20 border border-amber-700/50 rounded text-xs text-amber-200 mb-4">
              🔒 安全提示：Token 將加密儲存於瀏覽器擴充功能的安全儲存區，不會被網頁或其他擴充功能存取
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <div className="text-xs text-slate-400">
            Token 將安全地儲存在瀏覽器本機，不會上傳到任何伺服器
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
            onClick={onSave}
            disabled={!token.trim()}
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
};
