/**
 * Custom hook for group sharing functionality
 *
 * Handles:
 * - Share dialog state management
 * - GitHub Gist publishing
 * - Local HTML file generation
 * - GitHub token migration from localStorage to chrome.storage
 */

import React from 'react';
import { generateBooklistHTML } from './generateHTML';

interface GroupItem {
  id: string;
  categoryId: string;
  name: string;
  order: number;
}

interface UseGroupShareOptions {
  categoryId: string;
  items: any[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useGroupShare({ categoryId, items, showToast }: UseGroupShareOptions) {
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [shareGroup, setShareGroup] = React.useState<GroupItem | null>(null);
  const [shareTitle, setShareTitle] = React.useState('');
  const [shareDescription, setShareDescription] = React.useState('');

  // GitHub token state
  const [showTokenDialog, setShowTokenDialog] = React.useState(false);
  const [githubToken, setGithubToken] = React.useState('');

  // Share result state
  const [shareResultUrl, setShareResultUrl] = React.useState<string | null>(null);

  // Migrate old localStorage token to chrome.storage.local on mount
  React.useEffect(() => {
    const migrateToken = async () => {
      try {
        const oldToken = localStorage.getItem('linktrove_github_token');
        if (oldToken) {
          // Migrate to chrome.storage.local
          await new Promise<void>((resolve, reject) => {
            chrome.storage?.local?.set?.({ 'github.token': oldToken }, () => {
              if (chrome.runtime?.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          });
          // Remove from localStorage for security
          localStorage.removeItem('linktrove_github_token');
          console.log('[Security] Migrated GitHub token from localStorage to chrome.storage.local');
        }
      } catch (error) {
        console.warn('[Security] Failed to migrate GitHub token:', error);
      }
    };
    migrateToken();
  }, []);

  /**
   * Open share dialog for a group
   */
  const openShareDialog = React.useCallback(async (group: GroupItem) => {
    try {
      // Get group's webpages
      const groupItems = items.filter((it: any) => it.category === categoryId && it.subcategoryId === group.id);

      if (groupItems.length === 0) {
        showToast('此群組沒有內容可分享', 'info');
        return;
      }

      // Set default values
      setShareGroup(group);
      setShareTitle(group.name);
      setShareDescription(`精選收藏 - ${group.name} (${groupItems.length} 項目)`);
      setShareDialogOpen(true);
    } catch (error) {
      console.error('Open share dialog error:', error);
      showToast('開啟分享對話框失敗', 'error');
    }
  }, [categoryId, items, showToast]);

  /**
   * Publish group to GitHub Gist and get shareable URL
   */
  const publishToGist = React.useCallback(async () => {
    if (!shareGroup) return;

    try {
      // Get group's webpages
      const groupItems = items.filter((it: any) => it.category === categoryId && it.subcategoryId === shareGroup.id);

      // Get template data for custom fields
      const { createStorageService } = await import('../../../background/storageService');
      const storageService = createStorageService();
      const templates = await (storageService as any).listTemplates?.() || [];

      // Generate HTML content using the same function
      const htmlContent = generateBooklistHTML(
        shareGroup,
        groupItems,
        templates,
        shareTitle.trim() || shareGroup.name,
        shareDescription.trim()
      );

      // Create GitHub Gist
      let GITHUB_TOKEN = (import.meta as any).env?.VITE_GITHUB_TOKEN;

      // 如果環境變數沒有設定，要求用戶提供token
      if (!GITHUB_TOKEN || GITHUB_TOKEN === 'your_github_token_here') {
        // 嘗試從 chrome.storage.local 獲取用戶的 token（安全存儲）
        try {
          const result: any = await new Promise((resolve) => {
            chrome.storage?.local?.get?.({ 'github.token': '' }, resolve);
          });
          const savedToken = result?.['github.token'];
          if (savedToken) {
            GITHUB_TOKEN = savedToken;
          } else {
            // 顯示GitHub token設定對話框
            setShowTokenDialog(true);
            return;
          }
        } catch {
          setShowTokenDialog(true);
          return;
        }
      }

      const gistData = {
        description: `LinkTrove 分享：${shareTitle.trim() || shareGroup.name}`,
        public: true,
        files: {
          [`${(shareTitle.trim() || shareGroup.name).replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}.html`]: {
            content: htmlContent
          }
        }
      };

      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gist = await response.json();

      // Generate shareable URL
      const filename = Object.keys(gist.files)[0];
      const shareUrl = `https://htmlpreview.github.io/?${gist.files[filename].raw_url}`;

      // Show result dialog with URL
      setShareResultUrl(shareUrl);
      setShareDialogOpen(false);
    } catch (error) {
      console.error('Publish to Gist error:', error);
      showToast('發布分享連結失敗，請稍後重試', 'error');
    }
  }, [shareGroup, categoryId, items, shareTitle, shareDescription, showToast]);

  /**
   * Generate and download HTML share file locally
   */
  const generateShareFile = React.useCallback(async () => {
    if (!shareGroup) return;

    try {
      // Get group's webpages
      const groupItems = items.filter((it: any) => it.category === categoryId && it.subcategoryId === shareGroup.id);

      // Get template data for custom fields
      const { createStorageService } = await import('../../../background/storageService');
      const storageService = createStorageService();
      const templates = await (storageService as any).listTemplates?.() || [];

      // Generate HTML content with custom title and description
      const htmlContent = generateBooklistHTML(shareGroup, groupItems, templates, shareTitle, shareDescription);

      // Create and download HTML file
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${shareTitle.replace(/[^\w\s-]/g, '') || shareGroup.name.replace(/[^\w\s-]/g, '')}-share.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setShareDialogOpen(false);
      showToast(`已生成「${shareTitle}」分享檔案`, 'success');
    } catch (error) {
      console.error('Generate share file error:', error);
      showToast('生成分享檔案失敗', 'error');
    }
  }, [shareGroup, categoryId, items, shareTitle, shareDescription, showToast]);

  return {
    // State
    shareDialogOpen,
    shareGroup,
    shareTitle,
    shareDescription,
    showTokenDialog,
    githubToken,
    shareResultUrl,

    // State setters
    setShareDialogOpen,
    setShareTitle,
    setShareDescription,
    setShowTokenDialog,
    setGithubToken,
    setShareResultUrl,

    // Functions
    openShareDialog,
    publishToGist,
    generateShareFile,
  };
}
