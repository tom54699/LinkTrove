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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xl font-bold ${severityColor}`}>
            {severityLabel}
          </span>
          <h2 className="text-lg font-semibold text-white">
            {isAutoSync ? t('conflict_enable_auto_sync') : t('conflict_merge_cloud')}
          </h2>
        </div>

        {/* Conflict Info */}
        <div className="mb-6">
          <div className="text-sm text-slate-300 mb-2">
            {t('conflict_diff_detected')}
          </div>

          {/* Data Counts Comparison */}
          <div className="bg-slate-900/50 border border-slate-700 rounded p-3 mb-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-slate-400">{t('conflict_col_item')}</div>
              <div className="text-slate-400 text-center">{t('conflict_col_local')}</div>
              <div className="text-slate-400 text-center">{t('conflict_col_cloud')}</div>

              <div className="text-slate-300">{t('conflict_webpages')}</div>
              <div
                className={`text-center ${conflict.diff.webpages > 0 ? 'text-green-400' : conflict.diff.webpages < 0 ? 'text-red-400' : ''}`}
              >
                {conflict.local.webpages}
              </div>
              <div
                className={`text-center ${conflict.diff.webpages < 0 ? 'text-green-400' : conflict.diff.webpages > 0 ? 'text-red-400' : ''}`}
              >
                {conflict.remote.webpages}
              </div>

              <div className="text-slate-300">{t('conflict_categories')}</div>
              <div className="text-center">{conflict.local.categories}</div>
              <div className="text-center">{conflict.remote.categories}</div>

              <div className="text-slate-300">{t('conflict_groups')}</div>
              <div className="text-center">{conflict.local.subcategories}</div>
              <div className="text-center">{conflict.remote.subcategories}</div>
            </div>
          </div>

          {/* Difference Summary */}
          <div className="text-sm text-slate-300 whitespace-pre-line">
            {formatConflictMessage(conflict)}
          </div>
        </div>

        {/* Warning Message */}
        {conflict.severity === 'major' && (
          <div className="mb-4 px-3 py-2 rounded bg-red-900/20 border border-red-700/50 text-xs text-red-200">
            {t('conflict_warning_major')}
          </div>
        )}

        {/* Explanation */}
        <div className="mb-6 text-xs text-slate-400">
          {isAutoSync ? t('conflict_auto_sync_desc') : t('conflict_merge_desc')}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
          >
            {isAutoSync ? t('conflict_btn_enable') : t('conflict_btn_merge')}
          </button>

          {onBackupFirst && conflict.severity === 'major' && (
            <button
              onClick={onBackupFirst}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition-colors"
            >
              {t('conflict_btn_backup_first')}
            </button>
          )}

          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors"
          >
            {t('btn_cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
