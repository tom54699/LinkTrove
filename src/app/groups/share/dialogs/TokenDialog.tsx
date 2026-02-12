/**
 * GitHub Token Setup Dialog Component
 * Allows users to configure their GitHub Personal Access Token for Gist publishing
 */

import React from 'react';
import { useI18n } from '../../../i18n';
import { useEditableDialogCloseGuard } from '../../../ui/useEditableDialogCloseGuard';

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
  const dialogGuard = useEditableDialogCloseGuard(onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-md flex items-center justify-center p-3"
      {...dialogGuard.overlayProps}
    >
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--panel)] w-full max-w-md p-6 shadow-2xl"
        {...dialogGuard.dialogProps}
      >
        <h3 className="text-lg font-bold mb-4">{t('token_setup_title')}</h3>

        <div className="space-y-5">
          <div>
            <p className="text-[13px] text-[var(--muted)] mb-4 leading-relaxed">
              {t('token_required_desc')}
            </p>

            <div className="text-[12px] text-[var(--muted)] space-y-2 mb-5 px-4 py-3 bg-[var(--bg)]/50 rounded-lg border border-white/5">
              <div>🔗 <a href="https://github.com/settings/tokens" target="_blank" rel="noopener" className="text-[var(--accent)] hover:underline">{t('token_step1')}</a></div>
              <div>📝 {t('token_step2')}</div>
              <div>✅ {t('token_step3')}</div>
              <div>💾 {t('token_step4')}</div>
            </div>

            <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/80 flex gap-3 items-start mb-5">
              <span className="text-base mt-[-2px]">🔒</span>
              <div className="leading-snug">{t('token_security_notice')}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
              {t('token_label')}
            </label>
            <input
              type="password"
              className="w-full rounded-lg bg-[var(--input-bg)] border border-[var(--border)] px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[var(--accent)] transition-all"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <div className="text-[11px] text-[var(--muted)] opacity-70">
            {t('token_storage_notice')}
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
            className="px-5 py-2 text-sm font-bold rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
