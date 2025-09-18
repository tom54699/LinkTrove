import { describe, it, expect } from 'vitest';

// Extract the generateBooklistHTML function for testing
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

    // Extract custom template fields
    if (item.templateData && templates.length > 0) {
      const template = templates.find(t => t.id === item.templateId);
      if (template && template.fields) {
        for (const field of template.fields) {
          const value = item.templateData[field.key];
          if (value) {
            if (field.type === 'rating') {
              const stars = '★'.repeat(parseInt(value) || 0) + '☆'.repeat(5 - (parseInt(value) || 0));
              customFields.push(`<div class="custom-field"><span class="field-label">${field.label || field.key}</span> <span class="rating">${stars}</span></div>`);
            } else if (field.type === 'tags') {
              const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
              if (tags.length > 0) {
                customFields.push(`<div class="custom-field"><span class="field-label">${field.label || field.key}</span> <div class="tags">${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div></div>`);
              }
            } else {
              customFields.push(`<div class="custom-field"><span class="field-label">${field.label || field.key}</span> <span class="field-value">${value}</span></div>`);
            }
          }
        }
      }
    }

    // Add standard metadata if available
    if (item.meta?.author) metadata.push(`<div class="metadata-item"><span class="meta-label">作者</span> ${item.meta.author}</div>`);
    if (item.meta?.siteName) metadata.push(`<div class="metadata-item"><span class="meta-label">來源</span> ${item.meta.siteName}</div>`);
    if (item.updatedAt) {
      const date = new Date(item.updatedAt).toLocaleDateString('zh-TW');
      metadata.push(`<div class="metadata-item"><span class="meta-label">更新</span> ${date}</div>`);
    }

    // Shorten URL for display
    const displayUrl = item.url?.length > 50 ? item.url.substring(0, 47) + '...' : item.url;

    return `
      <div class="book-card">
        <div class="book-cover">
          ${item.favicon
            ? `<img src="${item.favicon}" alt="Cover" onerror="this.style.display='none'">`
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
    .custom-field { margin: 8px 0; }
    .field-label { font-weight: bold; color: #666; }
    .field-value { margin-left: 8px; }
    .rating { color: #ffa500; }
    .tags { display: inline-flex; gap: 4px; margin-left: 8px; }
    .tag { background: #e1f5fe; color: #0277bd; padding: 2px 6px; border-radius: 12px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${customTitle || group.name}</h1>
  ${customDescription ? `<p>${customDescription}</p>` : ''}
  <div class="book-list">
    ${items.map(createBookCard).join('')}
  </div>
</body>
</html>`;
}

describe('HTML Share Generation', () => {
  it('should display template fields correctly', () => {
    // Mock data
    const group = { id: 'group1', name: 'Test Group' };
    const templates = [
      {
        id: 'template1',
        name: 'Book Template',
        fields: [
          { key: 'rating', label: '評分', type: 'rating' },
          { key: 'tags', label: '標籤', type: 'tags' },
          { key: 'notes', label: '筆記', type: 'text' }
        ]
      }
    ];
    const items = [
      {
        id: 'item1',
        title: 'Test Book',
        url: 'https://example.com',
        templateId: 'template1',
        templateData: {
          rating: '4',
          tags: 'fiction, sci-fi, recommended',
          notes: 'Great book!'
        },
        meta: {
          author: 'Test Author',
          siteName: 'Test Site'
        }
      }
    ];

    const html = generateBooklistHTML(group, items, templates, 'Test Share', 'Test Description');

    // Verify template fields are displayed
    expect(html).toContain('評分');
    expect(html).toContain('★★★★☆'); // 4 stars
    expect(html).toContain('標籤');
    expect(html).toContain('fiction');
    expect(html).toContain('sci-fi');
    expect(html).toContain('recommended');
    expect(html).toContain('筆記');
    expect(html).toContain('Great book!');

    // Verify metadata is displayed
    expect(html).toContain('Test Author');
    expect(html).toContain('Test Site');

    console.log('Generated HTML preview:');
    console.log(html.substring(0, 1000) + '...');
  });

  it('should handle missing template data gracefully', () => {
    const group = { id: 'group1', name: 'Test Group' };
    const templates = [
      {
        id: 'template1',
        fields: [{ key: 'rating', label: '評分', type: 'rating' }]
      }
    ];
    const items = [
      {
        id: 'item1',
        title: 'Test Book',
        url: 'https://example.com',
        templateId: 'template1',
        templateData: {} // Empty template data
      }
    ];

    const html = generateBooklistHTML(group, items, templates);

    // Should not crash and should not contain template field sections
    expect(html).toContain('Test Book');
    expect(html).not.toContain('評分');
  });

  it('should handle items without templates', () => {
    const group = { id: 'group1', name: 'Test Group' };
    const templates = [];
    const items = [
      {
        id: 'item1',
        title: 'Test Book',
        url: 'https://example.com'
      }
    ];

    const html = generateBooklistHTML(group, items, templates);

    expect(html).toContain('Test Book');
    expect(html).toContain('https://example.com');
  });
});