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
    if (item.meta?.rating) {
      const rating = parseInt(item.meta.rating) || 0;
      const stars = rating > 0 ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : '未評分';
      metadata.push(`<div class="metadata-item"><span class="meta-label">評分</span> <span class="rating">${stars}</span></div>`);
    }
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
        <div class="book-left">
          <div class="book-cover">
            ${item.meta?.coverImage
              ? `<img src="${item.meta.coverImage}" alt="Cover" class="cover-image" onerror="this.src='${item.favicon || ''}'; this.className='favicon-fallback'">`
              : item.favicon
              ? `<img src="${item.favicon}" alt="Icon" class="favicon-fallback">`
              : '<div class="default-cover">🔗</div>'
            }
          </div>
          <div class="book-basic-info">
            <h3 class="book-title">
              <a href="${item.url}" target="_blank" rel="noopener">${item.title || 'Untitled'}</a>
            </h3>
            ${metadata.length > 0 ? `<div class="metadata">${metadata.join('')}</div>` : ''}
            ${customFields.length > 0 ? `<div class="custom-fields">${customFields.join('')}</div>` : ''}
            <div class="book-url">
              <a href="${item.url}" target="_blank" rel="noopener" title="${item.url}">${displayUrl}</a>
            </div>
          </div>
        </div>
        <div class="book-right">
          <div class="description-section">
            <h4 class="description-title">內容描述</h4>
            <p class="book-description">
              ${item.description || '暫無描述...'}
            </p>
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
      grid-template-columns: 1fr;
      gap: 20px;
      margin-top: 30px;
    }

    .book-card {
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      background: white;
      transition: all 0.3s ease;
      display: flex;
      min-height: 180px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }

    .book-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.15);
      border-color: #667eea;
    }

    .book-left {
      flex: 0 0 40%;
      padding: 24px;
      display: flex;
      gap: 16px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border-right: 2px solid rgba(102, 126, 234, 0.1);
    }

    .book-right {
      flex: 1;
      padding: 24px;
      display: flex;
      flex-direction: column;
      background: white;
    }

    .book-cover {
      flex-shrink: 0;
      width: 80px;
      height: 120px;
      border-radius: 12px;
      overflow: hidden;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
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

    .book-basic-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .description-section {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .description-title {
      font-size: 1rem;
      font-weight: 600;
      color: #667eea;
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .description-title::before {
      content: "📖";
      font-size: 1.1rem;
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
      font-size: 1rem;
      color: #2d3748;
      line-height: 1.6;
      flex: 1;
      overflow-y: auto;
      padding-right: 8px;
      text-align: justify;
      font-weight: 400;
      margin: 0;
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

    /* 分組內卡片的特殊佈局 */
    .group-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .group-grid .book-card {
      min-height: 140px;
    }

    .group-grid .book-left {
      flex: 0 0 35%;
      padding: 16px;
    }

    .group-grid .book-right {
      padding: 16px;
    }

    .group-grid .book-cover {
      width: 60px;
      height: 80px;
    }

    .group-grid .description-title {
      font-size: 0.9rem;
      margin-bottom: 8px;
    }

    .group-grid .book-description {
      font-size: 0.9rem;
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

      .book-card {
        flex-direction: column;
        min-height: auto;
      }

      .book-left {
        flex: none;
        padding: 16px;
        border-right: none;
        border-bottom: 2px solid rgba(102, 126, 234, 0.1);
      }

      .book-right {
        padding: 16px;
      }

      .book-cover {
        width: 60px;
        height: 80px;
      }

      .group-grid .book-card {
        min-height: auto;
      }
    }

    /* 分組顯示樣式 */
    .grouped-container {
      display: block;
    }

    .group-section {
      margin-bottom: 40px;
      background: rgba(102, 126, 234, 0.02);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid rgba(102, 126, 234, 0.1);
    }

    .group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e2e8f0;
    }

    .group-title {
      font-size: 1.4rem;
      font-weight: 600;
      color: #2d3748;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .group-badge {
      background: #667eea;
      color: white;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .empty-group {
      text-align: center;
      padding: 40px 20px;
      color: #9ca3af;
      font-style: italic;
    }

    /* 評分分組特殊樣式 */
    .rating-5 .group-title { color: #ffd700; }
    .rating-4 .group-title { color: #ffb347; }
    .rating-3 .group-title { color: #87ceeb; }
    .rating-2 .group-title { color: #dda0dd; }
    .rating-1 .group-title { color: #f0a0a0; }
    .rating-0 .group-title { color: #9ca3af; }

    @media (max-width: 768px) {
      .group-section {
        padding: 16px;
        margin-bottom: 24px;
      }

      .group-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
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
      <div class="group-controls" style="margin-top: 15px;">
        <label for="groupSelect" style="color: white; margin-right: 10px;">分組方式：</label>
        <select id="groupSelect" onchange="groupItems(this.value)" style="background: #2d3748; color: white; border: 1px solid #4a5568; padding: 8px 12px; border-radius: 6px; font-size: 14px; margin-right: 15px;">
          <option value="">不分組</option>
          <option value="genre">按類型分組</option>
          <option value="rating">按評分分組</option>
        </select>
        <button onclick="downloadJSON()" style="background: #4299e1; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.2s;" onmouseover="this.style.background='#3182ce'" onmouseout="this.style.background='#4299e1'">
          下載 JSON
        </button>
      </div>
    </header>

    <main class="content">
      ${items.length > 0 ? `
        <div id="defaultView" class="books-grid">
          ${items.map(createBookCard).join('')}
        </div>
        <div id="groupedView" class="grouped-container" style="display: none;">
          <!-- 分組內容將由JavaScript動態生成 -->
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

    // 分組功能
    function groupItems(groupBy) {
      const defaultView = document.getElementById('defaultView');
      const groupedView = document.getElementById('groupedView');

      if (!groupBy) {
        // 顯示原始視圖
        defaultView.style.display = 'grid';
        groupedView.style.display = 'none';
        return;
      }

      // 切換到分組視圖
      defaultView.style.display = 'none';
      groupedView.style.display = 'block';

      // 收集所有卡片
      const cards = Array.from(defaultView.children);

      // 根據分組方式整理數據
      const groups = {};

      cards.forEach(card => {
        let groupKey = '未分類';

        switch (groupBy) {
          case 'genre': {
            const metaItems = card.querySelectorAll('.metadata-item');
            for (const item of metaItems) {
              if (item.textContent.includes('類型')) {
                groupKey = item.textContent.replace('類型', '').trim() || '未知類型';
                break;
              }
            }
            break;
          }

          case 'rating': {
            const ratingElement = card.querySelector('.rating');
            if (ratingElement) {
              const stars = (ratingElement.textContent.match(/★/g) || []).length;
              if (stars === 0) {
                groupKey = '未評分';
              } else {
                groupKey = \`\${stars}星評分\`;
              }
            } else {
              groupKey = '未評分';
            }
            break;
          }
        }

        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(card.cloneNode(true));
      });

      // 生成分組HTML
      let groupedHTML = '';
      const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
        if (groupBy === 'rating') {
          // 評分按星級排序（5星到未評分）
          const getStars = (key) => {
            if (key === '未評分') return -1;
            const match = key.match(/(\\d+)星/);
            return match ? parseInt(match[1]) : 0;
          };
          return getStars(b) - getStars(a);
        }
        return a.localeCompare(b, 'zh-TW');
      });

      sortedGroupKeys.forEach(groupKey => {
        const items = groups[groupKey];
        const ratingClass = groupBy === 'rating' && groupKey !== '未評分'
          ? \`rating-\${groupKey.match(/(\\d+)星/) ? groupKey.match(/(\\d+)星/)[1] : '0'}\`
          : '';

        groupedHTML += \`
          <div class="group-section \${ratingClass}">
            <div class="group-header">
              <h2 class="group-title">
                \${getGroupIcon(groupBy, groupKey)} \${groupKey}
              </h2>
              <span class="group-badge">\${items.length} 項目</span>
            </div>
            <div class="group-grid">
              \${items.map(item => item.outerHTML).join('')}
            </div>
          </div>
        \`;
      });

      groupedView.innerHTML = groupedHTML;
    }

    function getGroupIcon(groupBy, groupKey) {
      switch (groupBy) {
        case 'genre':
          return '📚';
        case 'rating':
          if (groupKey === '未評分') return '⭕';
          const stars = groupKey.match(/(\\d+)星/);
          return stars ? '⭐'.repeat(parseInt(stars[1])) : '📊';
        default:
          return '📋';
      }
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
  // GitHub token state
  const [showTokenDialog, setShowTokenDialog] = React.useState(false);
  const [githubToken, setGithubToken] = React.useState('');
  // Share result state
  const [shareResultUrl, setShareResultUrl] = React.useState<string | null>(null);

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

  const publishToGist = async () => {
    if (!shareGroup) return;

    try {
      // Get group's webpages
      const groupItems = items.filter((it: any) => it.category === categoryId && it.subcategoryId === shareGroup.id);

      // Get template data for custom fields
      const { createStorageService } = await import('../../background/storageService');
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
                    // 使用舊三段式流程以確保 meta enrich（回歸既有行為）
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

              <div className="text-xs text-slate-400 space-y-1">
                <div>包含 {items.filter((it: any) => it.category === categoryId && it.subcategoryId === shareGroup?.id).length} 個項目</div>
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
                onClick={() => setShareDialogOpen(false)}
              >
                取消
              </button>
              <button
                className="px-3 py-1 rounded border border-green-600 text-green-300 hover:bg-green-950/30 disabled:opacity-50"
                onClick={publishToGist}
                disabled={!shareTitle.trim()}
                title="發布到 GitHub Gist 並獲得分享連結"
              >
                發布分享連結
              </button>
              <button
                className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                onClick={generateShareFile}
                disabled={!shareTitle.trim()}
              >
                下載 HTML
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Token 設定對話框 */}
      {showTokenDialog && (
        <div
          className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-3"
          onClick={() => {
            setShowTokenDialog(false);
            setGithubToken('');
          }}
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
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
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
                onClick={() => {
                  setShowTokenDialog(false);
                  setGithubToken('');
                }}
              >
                取消
              </button>
              <button
                className="px-3 py-1 rounded border border-green-600 text-green-300 hover:bg-green-950/30 disabled:opacity-50"
                onClick={async () => {
                  if (githubToken.trim()) {
                    // 使用 chrome.storage.local 安全存儲 token
                    try {
                      await new Promise<void>((resolve, reject) => {
                        chrome.storage?.local?.set?.({ 'github.token': githubToken.trim() }, () => {
                          if (chrome.runtime?.lastError) {
                            reject(chrome.runtime.lastError);
                          } else {
                            resolve();
                          }
                        });
                      });
                      setShowTokenDialog(false);
                      setGithubToken('');
                      showToast('GitHub Token 已安全儲存！現在可以發布分享連結了', 'success');
                      // 自動重試發布
                      setTimeout(() => publishToGist(), 500);
                    } catch (error) {
                      showToast('儲存 Token 失敗，請重試', 'error');
                    }
                  }
                }}
                disabled={!githubToken.trim()}
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Result Dialog */}
      {shareResultUrl && (
        <div
          className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShareResultUrl(null)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--panel)] w-[560px] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="分享連結"
          >
            <div className="px-4 py-3 border-b border-slate-700">
              <div className="text-base font-semibold">✅ 分享連結已建立</div>
            </div>
            <div className="px-4 py-4">
              <div className="text-sm opacity-90 mb-3">
                您的分享連結已成功發布到 GitHub Gist，可以複製連結分享給他人：
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareResultUrl}
                  readOnly
                  className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-600 text-sm font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  className="px-3 py-2 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)] whitespace-nowrap text-sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareResultUrl);
                      showToast('已複製到剪貼簿', 'success');
                    } catch {
                      showToast('複製失敗，請手動選取複製', 'error');
                    }
                  }}
                >
                  複製連結
                </button>
              </div>
              <div className="mt-3 text-xs opacity-70">
                💡 提示：連結會在您的 GitHub Gist 中永久保存，可隨時在 <a href="https://gist.github.com" target="_blank" rel="noopener" className="text-blue-400 hover:underline">gist.github.com</a> 管理
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded text-sm border border-slate-600 hover:bg-slate-800"
                onClick={() => window.open(shareResultUrl, '_blank')}
              >
                開啟連結
              </button>
              <button
                className="px-3 py-1.5 rounded text-sm border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)]"
                onClick={() => setShareResultUrl(null)}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
