import React from 'react';
import { createStorageService } from '../../background/storageService';
import { useFeedback } from '../ui/feedback';
import { useWebpages } from '../webpages/WebpagesProvider';
import { CardGrid } from '../webpages/CardGrid';
import { broadcastGhostActive, getDragTab } from '../dnd/dragContext';
import type { TabItemData } from '../tabs/types';
import { dbg } from '../../utils/debug';
import { ContextMenu } from '../ui/ContextMenu';

// Generate HTML content for sharing booklist
function generateBooklistHTML(group: any, items: any[], templates: any[], customTitle?: string, customDescription?: string): string {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const createBookCard = (item: any) => {
    const customFields = [];
    const metadata = [];

    // Extract custom template fields - show all fields for consistency
    if (templates.length > 0 && item.templateId) {
      const template = templates.find(t => t.id === item.templateId);
      if (template && template.fields) {
        for (const field of template.fields) {
          const value = item.templateData?.[field.key];

          if (field.type === 'rating') {
            const rating = parseInt(value) || 0;
            const stars = rating > 0
              ? '★'.repeat(rating) + '☆'.repeat(5 - rating)
              : '☆☆☆☆☆';
            customFields.push(`<div class="custom-field"><span class="field-label">${field.label || field.key}</span> <span class="rating">${stars}</span></div>`);
          } else if (field.type === 'tags') {
            if (value && typeof value === 'string') {
              const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
              if (tags.length > 0) {
                customFields.push(`<div class="custom-field"><span class="field-label">${field.label || field.key}</span> <div class="tags">${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div></div>`);
              } else {
                customFields.push(`<div class="custom-field"><span class="field-label">${field.label || field.key}</span> <span class="field-value empty">未設定</span></div>`);
              }
            } else {
              customFields.push(`<div class="custom-field"><span class="field-label">${field.label || field.key}</span> <span class="field-value empty">未設定</span></div>`);
            }
          } else {
            // text, select, number, date, url types
            const displayValue = value && typeof value === 'string' && value.trim()
              ? value.trim()
              : '未設定';
            const className = displayValue === '未設定' ? 'field-value empty' : 'field-value';
            customFields.push(`<div class="custom-field"><span class="field-label">${field.label || field.key}</span> <span class="${className}">${displayValue}</span></div>`);
          }
        }
      }
    }


    // Add standard metadata if available
    if (item.meta?.bookTitle) metadata.push(`<div class="metadata-item"><span class="meta-label">書名</span> ${item.meta.bookTitle}</div>`);
    if (item.meta?.author) metadata.push(`<div class="metadata-item"><span class="meta-label">作者</span> ${item.meta.author}</div>`);
    if (item.meta?.genre) metadata.push(`<div class="metadata-item"><span class="meta-label">類型</span> ${item.meta.genre}</div>`);
    if (item.meta?.siteName) metadata.push(`<div class="metadata-item"><span class="meta-label">來源</span> ${item.meta.siteName}</div>`);
    if (item.meta?.latestChapter) metadata.push(`<div class="metadata-item"><span class="meta-label">最新章節</span> ${item.meta.latestChapter}</div>`);
    if (item.meta?.lastUpdate) {
      const date = new Date(item.meta.lastUpdate).toLocaleDateString('zh-TW');
      metadata.push(`<div class="metadata-item"><span class="meta-label">最後更新</span> ${date}</div>`);
    }
    if (item.updatedAt) {
      const date = new Date(item.updatedAt).toLocaleDateString('zh-TW');
      metadata.push(`<div class="metadata-item"><span class="meta-label">收藏時間</span> ${date}</div>`);
    }

    // Shorten URL for display
    const displayUrl = item.url?.length > 50 ? item.url.substring(0, 47) + '...' : item.url;

    return `
      <div class="book-card">
        <div class="book-cover">
          ${item.meta?.coverImage
            ? `<img src="${item.meta.coverImage}" alt="Cover" class="cover-image" onerror="this.src='${item.favicon || ''}'; this.className='favicon-fallback'">`
            : item.favicon
            ? `<img src="${item.favicon}" alt="Icon" class="favicon-fallback">`
            : '<div class="default-cover">🔗</div>'
          }
        </div>
        <div class="book-info">
          <h3 class="book-title">
            <a href="${item.url}" target="_blank" rel="noopener">${item.title || 'Untitled'}</a>
          </h3>
          ${item.description ? `<p class="book-description">${item.description}</p>` : ''}

          ${metadata.length > 0 ? `<div class="metadata">${metadata.join('')}</div>` : ''}

          ${customFields.length > 0 ? `<div class="custom-fields">${customFields.join('')}</div>` : ''}

          <div class="book-url">
            <a href="${item.url}" target="_blank" rel="noopener" title="${item.url}">${displayUrl}</a>
          </div>
        </div>
      </div>
    `;
  };

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${customTitle || group.name} - 分享</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans CJK TC', 'Microsoft JhengHei', sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      font-weight: 700;
    }

    .header .subtitle {
      font-size: 1.1rem;
      opacity: 0.9;
      margin-bottom: 10px;
    }

    .header .meta {
      font-size: 0.9rem;
      opacity: 0.7;
    }

    .content {
      padding: 40px;
    }

    .books-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-top: 30px;
    }

    .book-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      background: #f8fafc;
      transition: all 0.3s ease;
      display: flex;
      gap: 16px;
    }

    .book-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
      border-color: #cbd5e0;
    }

    .book-cover {
      flex-shrink: 0;
      width: 60px;
      height: 60px;
      border-radius: 8px;
      overflow: hidden;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .book-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .book-cover .cover-image {
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .book-cover .favicon-fallback {
      object-fit: contain;
      padding: 12px;
      background: #f8fafc;
      border-radius: 4px;
    }

    .default-cover {
      font-size: 24px;
      color: #64748b;
    }

    .book-info {
      flex: 1;
      min-width: 0;
    }

    .book-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .book-title a {
      color: #2d3748;
      text-decoration: none;
      border-bottom: 2px solid transparent;
      transition: border-color 0.2s ease;
    }

    .book-title a:hover {
      border-bottom-color: #667eea;
    }

    .book-description {
      font-size: 0.9rem;
      color: #4a5568;
      margin-bottom: 12px;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .metadata {
      margin: 12px 0;
    }

    .metadata-item {
      font-size: 0.85rem;
      margin-bottom: 4px;
      color: #4a5568;
    }

    .meta-label {
      font-weight: 600;
      color: #2d3748;
      margin-right: 4px;
    }

    .custom-fields {
      margin: 12px 0;
    }

    .custom-field {
      font-size: 0.85rem;
      margin-bottom: 6px;
      color: #2d3748;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .field-label {
      font-weight: 600;
      color: #1a202c;
      min-width: 60px;
    }

    .field-value {
      color: #4a5568;
    }

    .field-value.empty {
      color: #9ca3af;
      font-style: italic;
      opacity: 0.7;
    }

    .rating {
      color: #f6ad55;
      font-size: 0.9rem;
    }

    .tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .tag {
      background: #e2e8f0;
      color: #2d3748;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .book-url {
      margin-top: 12px;
      font-size: 0.8rem;
    }

    .book-url a {
      color: #667eea;
      text-decoration: none;
      word-break: break-all;
      opacity: 0.8;
    }

    .book-url a:hover {
      opacity: 1;
      text-decoration: underline;
    }

    .footer {
      background: #f7fafc;
      padding: 30px 40px;
      text-align: center;
      color: #718096;
      font-size: 0.9rem;
      border-top: 1px solid #e2e8f0;
    }

    .footer a {
      color: #667eea;
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    .stats {
      display: inline-flex;
      gap: 20px;
      margin-top: 15px;
      font-size: 0.9rem;
    }

    .stat {
      background: rgba(255,255,255,0.1);
      padding: 8px 16px;
      border-radius: 20px;
    }

    @media (max-width: 768px) {
      .header {
        padding: 30px 20px;
      }

      .header h1 {
        font-size: 2rem;
      }

      .content {
        padding: 30px 20px;
      }

      .books-grid {
        grid-template-columns: 1fr;
      }

      .book-card {
        flex-direction: column;
        text-align: center;
      }

      .book-cover {
        align-self: center;
        width: 80px;
        height: 80px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>${customTitle || group.name}</h1>
      <div class="subtitle">${customDescription || '精選收藏分享'}</div>
      <div class="stats">
        <div class="stat">${items.length} 個項目</div>
        <div class="stat">由 LinkTrove 生成</div>
      </div>
      <div class="meta">生成時間：${formattedDate}</div>
      <div style="margin-top: 15px;">
        <button onclick="downloadJSON()" style="background: #4299e1; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: background 0.2s;" onmouseover="this.style.background='#3182ce'" onmouseout="this.style.background='#4299e1'">
          下載 JSON 書籤資料
        </button>
      </div>
    </header>

    <main class="content">
      ${items.length > 0 ? `
        <div class="books-grid">
          ${items.map(createBookCard).join('')}
        </div>
      ` : `
        <div style="text-align: center; padding: 60px 20px; color: #718096;">
          <h3>此群組目前沒有內容</h3>
        </div>
      `}
    </main>

    <footer class="footer">
      <div>此分享由 <a href="https://github.com/anthropics/claude-code" target="_blank">LinkTrove</a> 生成</div>
      <div style="margin-top: 10px; font-size: 0.8rem;">
        一個用於管理和分享書籤的瀏覽器擴充功能
      </div>
    </footer>
  </div>

  <script>
    // JSON 資料
    const exportData = ${JSON.stringify({
      schemaVersion: 1,
      metadata: {
        title: customTitle || group.name,
        description: customDescription || '',
        exportedAt: new Date().toISOString(),
        itemCount: items.length
      },
      group: {
        id: group.id,
        name: group.name,
        categoryId: group.categoryId
      },
      templates: templates.filter((t: any) =>
        items.some((item: any) => item.templateId === t.id)
      ),
      items: items.map((item: any) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        description: item.description,
        favicon: item.favicon,
        templateId: item.templateId,
        templateData: item.templateData,
        meta: item.meta,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))
    }, null, 2)};

    function downloadJSON() {
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = \`\${exportData.metadata.title.replace(/[^\\w\\s-]/g, '')}-bookmarks.json\`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;
}

interface GroupItem {
  id: string;
  categoryId: string;
  name: string;
  order: number;
}

export const GroupsView: React.FC<{ categoryId: string }> = ({ categoryId }) => {
  const { showToast } = useFeedback();
  const { items, actions } = useWebpages();
  const [groups, setGroups] = React.useState<GroupItem[]>([]);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [renameText, setRenameText] = React.useState<string>('');
  const [confirmDeleteGroup, setConfirmDeleteGroup] = React.useState<string | null>(null);
  // Compact actions menu per-group
  const [menuFor, setMenuFor] = React.useState<null | { id: string; x: number; y: number }>(null);
  // Toby import wizard state
  const [tobyOpenFor, setTobyOpenFor] = React.useState<string | null>(null);
  const [tobyFile, setTobyFile] = React.useState<File | null>(null);
  const [tobyPreview, setTobyPreview] = React.useState<{ links: number } | null>(null);
  const [tobyProgress, setTobyProgress] = React.useState<{ total: number; processed: number } | null>(null);
  const tobyAbortRef = React.useRef<AbortController | null>(null);
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [shareGroup, setShareGroup] = React.useState<GroupItem | null>(null);
  const [shareTitle, setShareTitle] = React.useState('');
  const [shareDescription, setShareDescription] = React.useState('');

  const svc = React.useMemo(() => {
    // 直接使用 IndexedDB 版本的 storage service；在非擴充環境亦可運作
    return createStorageService();
  }, []);

  const load = React.useCallback(async () => {
    try {
      if (!svc) return;
      const list = (await (svc as any).listSubcategories?.(categoryId)) || [];
      // 去重（以 id 為準）
      const m = new Map<string, GroupItem>();
      for (const g of list as any[]) if (!m.has(g.id)) m.set(g.id, g);
      setGroups(Array.from(m.values()));
    } catch {}
  }, [svc, categoryId]);

  const persistCollapsed = React.useCallback(async (next: Record<string, boolean>) => {
    setCollapsed(next);
    try {
      const key = `ui.groupsCollapsed.${categoryId}`;
      chrome.storage?.local?.set?.({ [key]: next });
    } catch {}
  }, [categoryId]);

  React.useEffect(() => {
    load();
    const onChanged = () => { load(); };
    try { window.addEventListener('groups:changed', onChanged as any); } catch {}
    // Expand/Collapse all listener
    const onCollapseAll = (ev: any) => {
      try {
        const det = ev?.detail || {};
        if (!det || det.categoryId !== categoryId) return;
        const doCollapse = !!det.collapsed;
        const next: Record<string, boolean> = {};
        for (const g of groups) next[g.id] = doCollapse;
        void persistCollapsed(next);
      } catch {}
    };
    try { window.addEventListener('groups:collapse-all', onCollapseAll as any); } catch {}
    return () => {
      try { window.removeEventListener('groups:changed', onChanged as any); } catch {}
      try { window.removeEventListener('groups:collapse-all', onCollapseAll as any); } catch {}
    };
  }, [load, groups, categoryId, persistCollapsed]);

  React.useEffect(() => {
    (async () => {
      try {
        const key = `ui.groupsCollapsed.${categoryId}`;
        const got: any = await new Promise((resolve) => {
          try { chrome.storage?.local?.get?.({ [key]: {} }, resolve); } catch { resolve({}); }
        });
        const map = (got?.[key] as any) || {};
        setCollapsed(map);
      } catch {}
    })();
  }, [categoryId]);

  

  const rename = async (id: string, name: string) => {
    try {
      await (svc as any).renameSubcategory?.(id, name.trim() || 'group');
      await load();
      showToast('已重新命名', 'success');
    } catch {
      showToast('重新命名失敗', 'error');
    }
  };

  const remove = async (id: string) => {
    try {
      // 以最新資料判斷，避免本地 state 與儲存不同步
      const latest: GroupItem[] =
        ((await (svc as any).listSubcategories?.(categoryId)) as any) || [];
      const others = latest.filter((g) => g.id !== id);
      if (others.length === 0) {
        showToast('刪除失敗：至少需要保留一個 group', 'error');
        return;
      }
      // 直接刪除該 group 及其關聯書籤
      if ((svc as any).deleteSubcategoryAndPages) {
        await (svc as any).deleteSubcategoryAndPages(id);
      } else {
        // 後備方案：以 UI 端刪除卡片後，再刪 group（較不原子）
        try {
          const ids = items.filter((it: any) => it.subcategoryId === id).map((it: any) => it.id);
          if (ids.length) await actions.deleteMany(ids);
        } catch {}
        try {
          // 無重指派版本：非原子，僅作為後備
          await (svc as any).deleteSubcategory?.(id, '__NO_REASSIGN__');
        } catch {}
      }
      // Remove collapse state for deleted group
      const { [id]: _omit, ...rest } = collapsed;
      await persistCollapsed(rest);
      await load();
      try { window.dispatchEvent(new CustomEvent('groups:changed')); } catch {}
      showToast('已刪除 group 與其書籤', 'success');
    } catch {
      showToast('刪除失敗', 'error');
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = groups.findIndex((g) => g.id === id);
    if (idx === -1) return;
    const j = idx + dir;
    if (j < 0 || j >= groups.length) return;
    const next = [...groups];
    const [it] = next.splice(idx, 1);
    next.splice(j, 0, it);
    setGroups(next);
    try {
      await (svc as any).reorderSubcategories?.(categoryId, next.map((x) => x.id));
      showToast('已重新排序', 'success');
    } catch {}
  };

  const openShareDialog = async (group: GroupItem) => {
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
  };

  const generateShareFile = async () => {
    if (!shareGroup) return;

    try {
      // Get group's webpages
      const groupItems = items.filter((it: any) => it.category === categoryId && it.subcategoryId === shareGroup.id);

      // Get template data for custom fields
      const { createStorageService } = await import('../../background/storageService');
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
  };

  const generateJsonFile = async () => {
    if (!shareGroup) return;

    try {
      // Get group's webpages
      const groupItems = items.filter((it: any) => it.category === categoryId && it.subcategoryId === shareGroup.id);

      // Get template data for custom fields
      const { createStorageService } = await import('../../background/storageService');
      const storageService = createStorageService();
      const templates = await (storageService as any).listTemplates?.() || [];

      // Create JSON export structure
      const exportData = {
        schemaVersion: 1,
        metadata: {
          title: shareTitle.trim() || shareGroup.name,
          description: shareDescription.trim() || '',
          exportedAt: new Date().toISOString(),
          itemCount: groupItems.length
        },
        group: {
          id: shareGroup.id,
          name: shareGroup.name,
          categoryId: shareGroup.categoryId
        },
        templates: templates.filter((t: any) =>
          groupItems.some((item: any) => item.templateId === t.id)
        ),
        items: groupItems.map((item: any) => ({
          id: item.id,
          title: item.title,
          url: item.url,
          description: item.description,
          favicon: item.favicon,
          templateId: item.templateId,
          templateData: item.templateData,
          meta: item.meta,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }))
      };

      // Create and download JSON file
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${shareTitle.replace(/[^\w\s-]/g, '') || shareGroup.name.replace(/[^\w\s-]/g, '')}-bookmarks.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`已下載「${shareTitle}」JSON 書籤`, 'success');
    } catch (error) {
      console.error('Generate JSON file error:', error);
      showToast('生成 JSON 檔案失敗', 'error');
    }
  };

  if (!svc) return null;

  return (
    <div className="space-y-3 mt-3">
      {groups.map((g) => (
        <section key={g.id} className="rounded border border-slate-700 bg-[var(--panel)]">
          <header
            className="flex items-center justify-between px-3 py-2 border-b border-slate-700"
          >
            <div className="flex items-center gap-2">
              <button
                className="text-xs px-1.5 py-0.5 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => persistCollapsed({ ...collapsed, [g.id]: !collapsed[g.id] })}
                aria-expanded={collapsed[g.id] ? 'false' : 'true'}
              >
                {collapsed[g.id] ? '展開' : '摺疊'}
              </button>
              {renaming === g.id ? (
                <input
                  className="text-sm bg-slate-900 border border-slate-700 rounded px-2 py-1"
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onBlur={() => { setRenaming(null); void rename(g.id, renameText); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { setRenaming(null); void rename(g.id, renameText); }
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  autoFocus
                />
              ) : (
                <div className="text-sm font-medium">{g.name}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Hidden inputs for import actions */}
              <input
                id={`html-file-${g.id}`}
                type="file"
                accept="text/html,.html"
                aria-label="Import HTML bookmarks file"
                className="hidden"
                onChange={async (e) => {
                  const f = e.currentTarget.files?.[0];
                  e.currentTarget.value = '';
                  if (!f) return;
                  try {
                    const text = await f.text();
                    const { importNetscapeHtmlIntoGroup } = await import('../../background/importers/html');
                    const res = await importNetscapeHtmlIntoGroup(g.id, g.categoryId, text);
                    await actions.load();
                    showToast(`已匯入 HTML：新增 ${res.pagesCreated} 筆`, 'success');
                  } catch (err: any) {
                    showToast(err?.message || '匯入失敗', 'error');
                  }
                }}
              />
              <input
                id={`toby-file-${g.id}`}
                type="file"
                accept="application/json,.json"
                aria-label="Import Toby JSON file"
                className="hidden"
                onChange={async (e) => {
                  const f = e.currentTarget.files?.[0];
                  e.currentTarget.value = '';
                  if (!f) return;
                  // Open wizard modal for this group
                  setTobyFile(f);
                  setTobyOpenFor(g.id);
                  try {
                    const txt = await f.text();
                    let count = 0;
                    try {
                      const obj = JSON.parse(txt);
                      if (Array.isArray(obj?.lists)) {
                        for (const l of obj.lists) if (Array.isArray(l?.cards)) count += l.cards.length;
                      } else if (Array.isArray(obj?.cards)) {
                        count = obj.cards.length;
                      }
                    } catch {}
                    setTobyPreview({ links: count });
                  } catch { setTobyPreview(null); }
                }}
              />
              {/* Kebab menu trigger */}
              <button
                className="text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-800"
                aria-label="更多操作"
                onClick={(e) => {
                  e.stopPropagation();
                  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
                  const x = Math.max(8, Math.min(vw - 200, e.clientX - 20));
                  setMenuFor({ id: g.id, x, y: e.clientY + 6 });
                }}
              >
                ⋯
              </button>
            </div>
          </header>
          {/* Context menu for this group */}
          {menuFor?.id === g.id && (
            <ContextMenu
              x={menuFor.x}
              y={menuFor.y}
              onClose={() => setMenuFor(null)}
              items={[
                { key: 'share', label: '分享此群組', onSelect: () => { setMenuFor(null); void openShareDialog(g); } },
                { key: 'import-html', label: '匯入 HTML', onSelect: () => { setMenuFor(null); try { document.getElementById(`html-file-${g.id}`)?.click(); } catch {} } },
                { key: 'import-toby', label: '匯入 Toby', onSelect: () => { setMenuFor(null); try { document.getElementById(`toby-file-${g.id}`)?.click(); } catch {} } },
                { key: 'rename', label: '重新命名', onSelect: () => { setMenuFor(null); setRenaming(g.id); setRenameText(g.name); } },
                { key: 'move-up', label: '上移', onSelect: () => { setMenuFor(null); void move(g.id, -1); } },
                { key: 'move-down', label: '下移', onSelect: () => { setMenuFor(null); void move(g.id, 1); } },
                { key: 'delete', label: '刪除', onSelect: () => { setMenuFor(null); setConfirmDeleteGroup(g.id); } },
              ]}
            />
          )}
          {!collapsed[g.id] && (
            <div className="p-3">
              <CardGrid
                items={items.filter((it: any) => it.category === categoryId && it.subcategoryId === g.id)}
                onDropTab={async (tab: any, beforeId?: string) => {
                  try {
                    // 優先使用原子 API；失敗再退回舊三段式流程
                    let usedAtomic = false;
                    try {
                      if ((actions as any) && (svc as any) && (createStorageService as any)) {
                        const ws = await import('../../background/webpageService');
                        const service = ws.createWebpageService();
                        if ((service as any).addTabToGroup) {
                          const created = await (service as any).addTabToGroup(tab as any, g.categoryId, g.id, beforeId);
                          usedAtomic = true;
                          // Load 一次以保證畫面對齊儲存層排序
                          await actions.load();
                          dbg('dnd', 'onDropTab atomic add', { createdId: created.id, beforeId });
                        }
                      }
                    } catch {}
                    if (!usedAtomic) {
                      const createdId = (await actions.addFromTab(tab as any)) as any as string;
                      await actions.updateCategory(createdId, g.categoryId);
                      await (svc as any).updateCardSubcategory?.(createdId, g.id);
                      if (beforeId && beforeId !== '__END__') {
                        dbg('dnd', 'onDropTab reorder', { createdId, beforeId });
                        await actions.reorder(createdId, beforeId);
                      } else if (beforeId === '__END__') {
                        dbg('dnd', 'onDropTab moveToEnd', { createdId });
                        await (actions as any).moveToEnd(createdId);
                      }
                      await actions.load();
                      dbg('dnd', 'afterDrop load()', { groupId: g.id });
                    }
                    showToast('已從分頁建立並加入 group', 'success');
                  } catch {
                    showToast('建立失敗', 'error');
                  }
                }}
                onDropExistingCard={async (cardId, beforeId) => {
                  try {
                    // Create atomic cross-group move by using a special service method
                    if ((svc as any).moveCardToGroup) {
                      // Use dedicated atomic operation if available
                      await (svc as any).moveCardToGroup(cardId, g.categoryId, g.id, beforeId);
                    } else {
                      // Fallback: sequential operations with careful error handling
                      await actions.updateCategory(cardId, g.categoryId);

                      if (!beforeId || beforeId === '__END__') {
                        await (svc as any).updateCardSubcategory?.(cardId, g.id);
                        await (actions as any).moveToEnd(cardId);
                      } else {
                        // Use reorder which now handles cross-group atomically
                        await actions.reorder(cardId, beforeId);
                      }
                    }

                    await actions.load();
                    try { broadcastGhostActive(null); } catch {}
                    showToast('已移動到 group', 'success');
                  } catch (error) {
                    console.error('Move card error:', error);
                    try { broadcastGhostActive(null); } catch {}
                    showToast('移動失敗', 'error');
                  }
                }}
                onDeleteMany={async (ids) => { await actions.deleteMany(ids); showToast('Deleted selected', 'success'); }}
                onDeleteOne={async (id) => { await actions.deleteOne(id); showToast('Deleted', 'success'); }}
                onEditDescription={async (id, description) => { await actions.updateDescription(id, description); showToast('Saved note', 'success'); }}
                onSave={async (id, patch) => { await actions.updateCard(id, patch); showToast('Saved', 'success'); }}
                onReorder={async (fromId, toId) => {
                  await actions.reorder(fromId, toId);
                  await actions.load();
                }}
                onUpdateTitle={(id, title) => actions.updateTitle(id, title)}
                onUpdateUrl={(id, url) => actions.updateUrl(id, url)}
                onUpdateCategory={(id, cat) => actions.updateCategory(id, cat)}
                onUpdateMeta={(id, meta) => actions.updateMeta(id, meta)}
              />
            </div>
          )}
        </section>
      ))}
      {confirmDeleteGroup && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
          onClick={() => setConfirmDeleteGroup(null)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--bg)] w-[520px] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Delete Group"
          >
            <div className="px-5 py-4 border-b border-slate-700">
              <div className="text-lg font-semibold">刪除 Group</div>
              <div className="text-xs opacity-80 mt-1">
                刪除此 group 以及其底下的書籤？此操作無法復原。
              </div>
            </div>
            <div className="px-5 py-3 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => setConfirmDeleteGroup(null)}
              >
                取消
              </button>
              <button
                className="px-3 py-1 rounded border border-rose-700 text-rose-300 hover:bg-rose-950/30"
                onClick={async () => {
                  const id = confirmDeleteGroup;
                  setConfirmDeleteGroup(null);
                  if (id) await remove(id);
                }}
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
      {tobyOpenFor && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
          onClick={() => { setTobyOpenFor(null); setTobyFile(null); setTobyPreview(null); }}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--bg)] w-[520px] max-w-[95vw] p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Import Toby"
          >
            <div className="text-lg font-semibold">匯入 Toby 到此 group</div>
            <div className="mt-2 text-sm opacity-80">檔案：{tobyFile?.name} {tobyPreview ? `— 連結 ${tobyPreview.links}` : ''}</div>
            {/* Dedup option removed per request */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={() => { setTobyOpenFor(null); setTobyFile(null); setTobyPreview(null); }}>取消</button>
              <button
                className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                onClick={async () => {
                  const gid = tobyOpenFor;
                  const f = tobyFile;
                  setTobyOpenFor(null);
                  if (!gid || !f) return;
                  try {
                    const text = await f.text();
                    const { importTobyV3IntoGroup } = await import('../../background/importers/toby');
                    const g = groups.find((x)=>x.id===gid);
                    const ctrl = new AbortController();
                    tobyAbortRef.current = ctrl;
                    setTobyProgress({ total: tobyPreview?.links || 0, processed: 0 });
                    const res = await importTobyV3IntoGroup(gid, g?.categoryId || categoryId, text, { signal: ctrl.signal, onProgress: ({ total, processed }) => setTobyProgress({ total, processed }) });
                    await actions.load();
                    showToast(`已匯入 Toby：新增 ${res.pagesCreated} 筆`, 'success');
                  } catch (err: any) {
                    showToast(err?.message || '匯入失敗', 'error');
                  } finally {
                    setTobyFile(null);
                    setTobyPreview(null);
                    setTobyProgress(null);
                    tobyAbortRef.current = null;
                  }
                }}
              >
                開始匯入
              </button>
            </div>
          </div>
        </div>
      )}
      {tobyProgress && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3">
          <div className="rounded border border-slate-700 bg-[var(--bg)] w-[420px] max-w-[90vw] p-5">
            <div className="text-lg font-semibold">匯入中…</div>
            <div className="mt-3 text-sm">{tobyProgress.processed}/{tobyProgress.total}</div>
            <div className="mt-2 h-2 w-full bg-slate-800 rounded">
              <div className="h-2 bg-[var(--accent)] rounded" style={{ width: `${tobyProgress.total ? Math.min(100, Math.floor((tobyProgress.processed/tobyProgress.total)*100)) : 0}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={() => { try { tobyAbortRef.current?.abort(); } catch {} }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      {shareDialogOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
          onClick={() => setShareDialogOpen(false)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--bg)] w-[520px] max-w-[95vw] p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="分享設定"
          >
            <div className="text-lg font-semibold mb-4">分享「{shareGroup?.name}」</div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">分享標題</label>
                <input
                  type="text"
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="自訂分享頁面的標題"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">分享描述</label>
                <textarea
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm h-20 resize-none"
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  placeholder="簡單描述這個分享的內容"
                />
              </div>

              <div className="text-xs text-slate-400">
                包含 {items.filter((it: any) => it.category === categoryId && it.subcategoryId === shareGroup?.id).length} 個項目 - 可生成 HTML 分享頁面或下載 JSON 格式供匯入
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => setShareDialogOpen(false)}
              >
                取消
              </button>
              <button
                className="px-3 py-1 rounded border border-blue-600 text-blue-300 hover:bg-blue-950/30 disabled:opacity-50"
                onClick={generateJsonFile}
                disabled={!shareTitle.trim()}
                title="下載 JSON 格式，可匯入其他群組"
              >
                下載 JSON
              </button>
              <button
                className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                onClick={generateShareFile}
                disabled={!shareTitle.trim()}
              >
                生成 HTML
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
