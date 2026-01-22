/**
 * GitHub Token Setup Dialog Component
 * Allows users to configure their GitHub Personal Access Token for Gist publishing
 */

import React from 'react';
import { useI18n } from '../../../i18n';

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
  const { t } = useI18n();

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
        <h3 className="text-lg font-semibold mb-4">{t('token_setup_title')}</h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-300 mb-3">
              {t('token_required_desc')}
            </p>

            <div className="text-xs text-slate-400 space-y-2 mb-4">
              <div>🔗 <a href="https://github.com/settings/tokens" target="_blank" rel="noopener" className="text-blue-400 hover:underline">{t('token_step1')}</a></div>
              <div>📝 {t('token_step2')}</div>
              <div>✅ {t('token_step3')}</div>
              <div>💾 {t('token_step4')}</div>
            </div>

            <div className="px-3 py-2 bg-amber-900/20 border border-amber-700/50 rounded text-xs text-amber-200 mb-4">
              🔒 {t('token_security_notice')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('token_label')}
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
            {t('token_storage_notice')}
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
            onClick={onSave}
            disabled={!token.trim()}
          >
            {t('btn_save')}
          </button>
        </div>
      </div>
    </div>
  );
};
