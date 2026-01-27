import React from 'react';
import { useI18n } from '../i18n';

type SyncStatus = {
  syncing?: boolean;
  syncPhase?: 'checking' | 'downloading' | 'merging' | 'importing' | 'uploading';
  blocking?: boolean;
  error?: string;
};

export const SyncStatusToast: React.FC = () => {
  const { t } = useI18n();
  const [status, setStatus] = React.useState<SyncStatus | null>(null);

  const loadStatus = React.useCallback(async () => {
    try {
      const got: any = await new Promise((resolve) => {
        try { chrome.storage?.local?.get?.({ 'cloudSync.status': {} }, resolve); } catch { resolve({}); }
      });
      setStatus(got?.['cloudSync.status'] || {});
    } catch {
      setStatus({});
    }
  }, []);

  React.useEffect(() => {
    void loadStatus();
    const handler = (changes: Record<string, any>, areaName: string) => {
      if (areaName !== 'local') return;
      if (changes['cloudSync.status']) {
        setStatus(changes['cloudSync.status'].newValue || {});
      }
    };
    try { chrome.storage?.onChanged?.addListener?.(handler as any); } catch {}
    return () => {
      try { chrome.storage?.onChanged?.removeListener?.(handler as any); } catch {}
    };
  }, [loadStatus]);

  const shouldShow = !status?.blocking && (!!status?.syncing || !!status?.error);
  if (!shouldShow) return null;

  const label = status?.error
    ? t('cloud_sync_bg_failed')
    : (status?.syncPhase ? t(`cloud_sync_phase_${status.syncPhase}`) : t('cloud_sync_bg_in_progress'));

  const handleClose = () => {
    void import('../data/syncService')
      .then((mod) => mod.clearSyncError())
      .catch(() => {});
  };

  return (
    <div className="fixed bottom-4 right-4 z-[10002]">
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-lg px-3 py-2">
        <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] animate-pulse" />
        <div className="text-xs text-[var(--fg)]">{label}</div>
        {status?.error && (
          <button
            className="ml-1 text-[10px] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)]"
            onClick={handleClose}
          >
            {t('cloud_sync_bg_close')}
          </button>
        )}
      </div>
    </div>
  );
};
