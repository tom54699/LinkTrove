/**
 * Custom hook for group import functionality
 *
 * Handles:
 * - Toby JSON import with progress tracking
 * - HTML bookmarks import
 * - Import state management and cancellation
 */

import React from 'react';

interface GroupItem {
  id: string;
  categoryId: string;
  name: string;
  order: number;
}

interface TobyProgress {
  total: number;
  processed: number;
}

interface UseGroupImportOptions {
  categoryId: string;
  groups: GroupItem[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  reloadWebpages: () => Promise<void>;
}

export function useGroupImport({ categoryId, groups, showToast, reloadWebpages }: UseGroupImportOptions) {
  // Toby import wizard state
  const [tobyOpenFor, setTobyOpenFor] = React.useState<string | null>(null);
  const [tobyFile, setTobyFile] = React.useState<File | null>(null);
  const [tobyPreview, setTobyPreview] = React.useState<{ links: number } | null>(null);
  const [tobyProgress, setTobyProgress] = React.useState<TobyProgress | null>(null);
  const tobyAbortRef = React.useRef<AbortController | null>(null);

  /**
   * Handle HTML file selection and import
   */
  const handleHtmlImport = React.useCallback(async (groupId: string, file: File) => {
    try {
      const text = await file.text();
      const { importNetscapeHtmlIntoGroup } = await import('../../../background/importers/html');
      const group = groups.find(g => g.id === groupId);
      const res = await importNetscapeHtmlIntoGroup(groupId, group?.categoryId || categoryId, text);
      await reloadWebpages();
      showToast(`已匯入 HTML：新增 ${res.pagesCreated} 筆`, 'success');
    } catch (err: any) {
      showToast(err?.message || '匯入 HTML 失敗', 'error');
    }
  }, [categoryId, groups, showToast, reloadWebpages]);

  /**
   * Handle Toby file selection and preview
   */
  const handleTobyFileSelect = React.useCallback(async (groupId: string, file: File) => {
    try {
      setTobyFile(file);
      setTobyOpenFor(groupId);

      // Preview file to count links
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const count = (data?.lists || []).reduce((acc: number, list: any) => {
          return acc + (list?.cards || []).length;
        }, 0);
        setTobyPreview({ links: count });
      } catch {
        setTobyPreview(null);
      }
    } catch (err: any) {
      showToast(err?.message || '讀取 Toby 檔案失敗', 'error');
    }
  }, [showToast]);

  /**
   * Execute Toby import with progress tracking
   */
  const executeTobyImport = React.useCallback(async () => {
    const gid = tobyOpenFor;
    const f = tobyFile;

    setTobyOpenFor(null);

    if (!gid || !f) return;

    try {
      const text = await f.text();
      const { importTobyV3IntoGroup } = await import('../../../background/importers/toby');
      const group = groups.find(x => x.id === gid);

      const ctrl = new AbortController();
      tobyAbortRef.current = ctrl;
      setTobyProgress({ total: tobyPreview?.links || 0, processed: 0 });

      const res = await importTobyV3IntoGroup(
        gid,
        group?.categoryId || categoryId,
        text,
        {
          signal: ctrl.signal,
          onProgress: ({ total, processed }) => setTobyProgress({ total, processed })
        }
      );

      await reloadWebpages();
      showToast(`已匯入 Toby：新增 ${res.pagesCreated} 筆`, 'success');
    } catch (err: any) {
      showToast(err?.message || '匯入失敗', 'error');
    } finally {
      setTobyFile(null);
      setTobyPreview(null);
      setTobyProgress(null);
      tobyAbortRef.current = null;
    }
  }, [tobyOpenFor, tobyFile, tobyPreview, categoryId, groups, showToast, reloadWebpages]);

  /**
   * Cancel Toby import wizard
   */
  const cancelTobyImport = React.useCallback(() => {
    setTobyOpenFor(null);
    setTobyFile(null);
    setTobyPreview(null);
  }, []);

  /**
   * Cancel ongoing Toby import operation
   */
  const abortTobyImport = React.useCallback(() => {
    try {
      tobyAbortRef.current?.abort();
    } catch {}
  }, []);

  return {
    // State
    tobyOpenFor,
    tobyFile,
    tobyPreview,
    tobyProgress,

    // Functions
    handleHtmlImport,
    handleTobyFileSelect,
    executeTobyImport,
    cancelTobyImport,
    abortTobyImport,
  };
}
