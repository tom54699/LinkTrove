/**
 * HTML 生成模組 - 用於生成可分享的書籤頁面
 *
 * 此模組提供將書籤群組匯出為獨立 HTML 檔案的功能，
 * 生成的頁面包含完整的樣式、互動功能和 JSON 資料匯出。
 */

/**
 * 生成可分享的 HTML 書籤頁面
 *
 * @param group - 群組資訊
 * @param items - 要分享的書籤項目
 * @param templates - 模板定義（用於自訂欄位顯示）
 * @param customTitle - 自訂頁面標題（可選，預設使用群組名稱）
 * @param customDescription - 自訂頁面描述（可選）
 * @returns 完整的 HTML 文檔字串
 *
 * @example
 * ```ts
 * const html = generateBooklistHTML(
 *   group,
 *   items,
 *   templates,
 *   '我的書籤收藏',
 *   '精選的好書推薦'
 * );
 * ```
 */
export function generateBooklistHTML(
  group: any,
  items: any[],
  templates: any[],
  customTitle?: string,
  customDescription?: string
): string {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  /**
   * 創建單個書籤卡片的 HTML
   *
   * @param item - 書籤項目資料
   * @returns 書籤卡片的 HTML 字串
   */
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
