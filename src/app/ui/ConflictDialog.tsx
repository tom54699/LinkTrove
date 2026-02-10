/**
 * ConflictDialog.tsx
 *
 * 衝突檢測確認對話框
 * 在啟用 Auto Sync 或執行手動合併前，顯示本地與雲端資料差異
 */

import React from 'react';
import type { ConflictInfo } from '../data/conflictDetection';
import { formatConflictMessage } from '../data/conflictDetection';
import { useI18n } from '../i18n';

interface ConflictDialogProps {
  conflict: ConflictInfo;
  operation: 'auto-sync' | 'manual-merge';
  onConfirm: () => void;
  onCancel: () => void;
  onBackupFirst?: () => void;
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  conflict,
  operation,
  onConfirm,
  onCancel,
  onBackupFirst,
}) => {
  const { t } = useI18n();
  const isAutoSync = operation === 'auto-sync';
  const severityColor =
    conflict.severity === 'major'
      ? 'text-red-400'
      : conflict.severity === 'minor'
        ? 'text-yellow-400'
        : 'text-green-400';

  const severityLabel =
    conflict.severity === 'major'
      ? t('conflict_severity_major')
      : conflict.severity === 'minor'
        ? t('conflict_severity_minor')
        : t('conflict_severity_none');

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-3 h-3 rounded-full animate-pulse ${conflict.severity === 'major' ? 'bg-red-500' : conflict.severity === 'minor' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
          <h2 className="text-lg font-bold text-white">
            {isAutoSync ? t('conflict_enable_auto_sync') : t('conflict_merge_cloud')}
          </h2>
        </div>

        {/* Conflict Info */}
        <div className="mb-6">
          <div className="text-[13px] text-[var(--muted)] mb-3 leading-relaxed">
            {t('conflict_diff_detected')}
          </div>

          {/* Data Counts Comparison Grid */}
          <div className="bg-[var(--bg)]/40 border border-white/5 rounded-xl p-4 mb-5">
            <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-b border-white/5 pb-2 mb-3">
              <div>{t('conflict_col_item')}</div>
              <div className="text-center">{t('conflict_col_local')}</div>
              <div className="text-center">{t('conflict_col_cloud')}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-[13px]">
              <div className="text-[var(--muted)]">{t('conflict_webpages')}</div>
              <div className={`text-center font-bold ${conflict.diff.webpages > 0 ? 'text-emerald-400' : conflict.diff.webpages < 0 ? 'text-red-400' : ''}`}>
                {conflict.local.webpages}
              </div>
              <div className={`text-center font-bold ${conflict.diff.webpages < 0 ? 'text-emerald-400' : conflict.diff.webpages > 0 ? 'text-red-400' : ''}`}>
                {conflict.remote.webpages}
              </div>

              <div className="text-[var(--muted)]">{t('conflict_categories')}</div>
              <div className="text-center font-bold">{conflict.local.categories}</div>
              <div className="text-center font-bold">{conflict.remote.categories}</div>

              <div className="text-[var(--muted)]">{t('conflict_groups')}</div>
              <div className="text-center font-bold">{conflict.local.subcategories}</div>
              <div className="text-center font-bold">{conflict.remote.subcategories}</div>
            </div>
          </div>

          {/* Difference Summary */}
          <div className="text-[12px] text-[var(--muted)] whitespace-pre-line leading-relaxed italic border-l-2 border-[var(--border)] pl-3">
            {formatConflictMessage(conflict)}
          </div>
        </div>

        {/* Warning Message Callout */}
        {conflict.severity === 'major' && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-200/80 flex gap-3 items-start">
            <span className="text-sm">⚠️</span>
            <div className="leading-snug font-medium">{t('conflict_warning_major')}</div>
          </div>
        )}

        {/* Explanation */}
        <div className="mb-8 text-[11px] text-[var(--muted)] opacity-70 leading-relaxed">
          {isAutoSync ? t('conflict_auto_sync_desc') : t('conflict_merge_desc')}
        </div>

        {/* Actions - Vertical Stack for mobile-friendly priority */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full py-3 bg-[var(--accent)] hover:brightness-110 text-white rounded-lg font-bold text-sm transition-all cursor-pointer shadow-lg shadow-[var(--accent)]/10"
          >
            {isAutoSync ? t('conflict_btn_enable') : t('conflict_btn_merge')}
          </button>

          {onBackupFirst && conflict.severity === 'major' && (
            <button
              onClick={onBackupFirst}
              className="w-full py-3 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 rounded-lg font-bold text-sm transition-all cursor-pointer"
            >
              {t('conflict_btn_backup_first')}
            </button>
          )}

          <button
            onClick={onCancel}
            className="w-full py-3 border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] rounded-lg font-bold text-sm transition-all cursor-pointer"
          >
            {t('btn_cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
