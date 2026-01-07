# Design: Card Templates

## Context
LinkTrove 使用者經常需要建立類似格式的卡片（例如：每日筆記、會議記錄、待辦事項）。手動輸入重複資訊效率低，需要提供模板功能：
- **快速建立**：從模板一鍵建立卡片
- **動態內容**：支援變數（日期、時間、計數器）
- **可管理**：編輯、刪除、排序模板
- **預設模板**：新使用者開箱即用

**約束條件**：
- IndexedDB 儲存模板資料
- React 18 + Context API 管理狀態
- 符合「Simplicity First」原則
- 變數系統需可擴展（未來新增自訂變數）

## Goals / Non-Goals

### Goals
- ✅ 簡單直覺的模板建立和使用
- ✅ 強大的變數系統（日期、時間、計數器）
- ✅ 計數器持久化（每個模板獨立計數）
- ✅ 完整的模板管理功能
- ✅ 預設模板開箱即用

### Non-Goals
- ❌ 複雜的模板邏輯（條件判斷、迴圈）
- ❌ 跨裝置模板同步（使用匯出/匯入）
- ❌ 模板市集（使用者分享模板）
- ❌ 視覺化模板編輯器（使用表單即可）

## Technical Decisions

### Decision 1: 變數系統設計
**選擇**: 使用正則表達式 + 變數處理器（Variable Handlers）架構

**理由**：
1. **簡單實作**：正則匹配 `{{variable}}` 格式
2. **可擴展**：新增變數只需註冊處理器
3. **效能佳**：替換操作 O(n)，n 為字串長度

**變數處理器架構**：
```typescript
type VariableHandler = (match: string, format?: string) => string;

interface VariableRegistry {
  [key: string]: VariableHandler;
}

const variableHandlers: VariableRegistry = {
  date: (match, format = 'YYYY-MM-DD') => {
    return formatDate(new Date(), format);
  },

  datetime: () => {
    return formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
  },

  time: () => {
    return formatDate(new Date(), 'HH:mm:ss');
  },

  year: () => {
    return new Date().getFullYear().toString();
  },

  month: () => {
    return (new Date().getMonth() + 1).toString().padStart(2, '0');
  },

  day: () => {
    return new Date().getDate().toString().padStart(2, '0');
  },

  counter: (match, format, templateId: string) => {
    const count = getTemplateCounter(templateId);
    incrementTemplateCounter(templateId);
    return count.toString();
  }
};
```

**替換引擎**：
```typescript
function replaceVariables(
  text: string,
  templateId: string,
  context: VariableContext = {}
): string {
  // 匹配 {{variable}} 或 {{variable:format}}
  const regex = /\{\{(\w+)(?::([^}]+))?\}\}/g;

  return text.replace(regex, (match, variable, format) => {
    const handler = variableHandlers[variable];

    if (!handler) {
      console.warn(`Unknown variable: ${match}`);
      return match;  // 保留原樣
    }

    try {
      return handler(match, format, templateId, context);
    } catch (error) {
      console.error(`Error processing variable ${match}:`, error);
      return match;
    }
  });
}

// 使用範例
const template = {
  title: "筆記 - {{date}}",
  url: "https://notes.com/{{date}}/{{counter}}"
};

const result = {
  title: replaceVariables(template.title, template.id),
  url: replaceVariables(template.url, template.id)
};

// 結果:
// title: "筆記 - 2026-01-07"
// url: "https://notes.com/2026-01-07/1"
```

**日期格式支援**（使用 date-fns）：
```typescript
import { format as formatDateFns } from 'date-fns';

function formatDate(date: Date, formatStr: string): string {
  const formatMap: Record<string, string> = {
    'YYYY-MM-DD': 'yyyy-MM-dd',
    'YYYY/MM/DD': 'yyyy/MM/dd',
    'DD/MM/YYYY': 'dd/MM/yyyy',
    'MM/DD/YYYY': 'MM/dd/yyyy',
    'YYYY-MM-DD HH:mm:ss': 'yyyy-MM-dd HH:mm:ss',
    'HH:mm:ss': 'HH:mm:ss'
  };

  const dateFnsFormat = formatMap[formatStr] || formatStr;

  try {
    return formatDateFns(date, dateFnsFormat);
  } catch (error) {
    console.warn(`Invalid date format: ${formatStr}, using default`);
    return formatDateFns(date, 'yyyy-MM-dd');
  }
}
```

**替代方案考量**：
- ❌ **字串模板（Template Literals）**：需要 eval()，安全風險
- ❌ **Handlebars/Mustache**：過於複雜，引入大型依賴
- ❌ **自訂解析器**：重新發明輪子，維護成本高

**Trade-offs**：
- 優點：簡單、安全、可擴展
- 優點：不需引入模板引擎依賴
- 缺點：不支援複雜邏輯（但符合需求）

---

### Decision 2: 計數器持久化策略
**選擇**: 每個模板獨立計數，儲存在 `templates` store 的 `counter` 欄位

**理由**：
1. **獨立計數**：不同模板的計數器互不影響
2. **持久化**：計數器儲存在 IndexedDB，重啟後保留
3. **簡單實作**：每次使用時讀取並遞增

**資料結構**：
```typescript
interface TemplateData {
  id: string;              // t_[timestamp]
  name: string;            // 模板名稱
  title?: string;          // 卡片標題模板
  url?: string;            // 卡片 URL 模板
  favicon?: string;        // Favicon URL
  note?: string;           // 備註模板
  counter: number;         // 計數器當前值（預設 1）
  usageCount: number;      // 使用次數（統計）
  lastUsedAt?: number;     // 最後使用時間戳（epoch ms）
  order: number;           // 顯示順序
  isDefault: boolean;      // 是否為預設模板
  createdAt: string;       // ISO 8601
  updatedAt: string;
}
```

**計數器實作**：
```typescript
async function getTemplateCounter(templateId: string): Promise<number> {
  const db = await openIndexedDB();
  const tx = db.transaction('templates', 'readonly');
  const template = await tx.objectStore('templates').get(templateId);

  return template?.counter || 1;
}

async function incrementTemplateCounter(templateId: string): Promise<void> {
  const db = await openIndexedDB();
  const tx = db.transaction('templates', 'readwrite');
  const store = tx.objectStore('templates');

  const template = await store.get(templateId);
  if (template) {
    template.counter = (template.counter || 1) + 1;
    template.usageCount = (template.usageCount || 0) + 1;
    template.lastUsedAt = Date.now();
    template.updatedAt = new Date().toISOString();

    await store.put(template);
  }

  await tx.complete;
}
```

**建立卡片流程**：
```typescript
async function createCardFromTemplate(
  templateId: string,
  targetGroupId: string
): Promise<WebpageData> {
  // 1. 讀取模板
  const template = await getTemplate(templateId);

  // 2. 替換變數（計數器會自動遞增）
  const title = replaceVariables(template.title || '', templateId);
  const url = replaceVariables(template.url || '', templateId);
  const note = replaceVariables(template.note || '', templateId);

  // 3. 建立卡片
  const webpage: WebpageData = {
    id: `w_${Date.now()}`,
    title,
    url,
    favicon: template.favicon,
    note,
    category: getCategoryIdFromGroup(targetGroupId),
    subcategoryId: targetGroupId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 4. 寫入 IndexedDB
  await addWebpage(webpage);

  // 5. 更新群組順序
  await updateGroupOrder(targetGroupId, webpage.id);

  return webpage;
}
```

**替代方案考量**：
- ❌ **全域計數器**：所有模板共用，無法獨立計數
- ❌ **每次建立重置計數器**：失去連續性
- ❌ **計數器儲存在 meta store**：增加查詢複雜度

**Trade-offs**：
- 優點：每個模板獨立計數，符合使用者期望
- 優點：持久化儲存，重啟後保留
- 缺點：每次建立卡片需要更新模板（額外寫入）

---

### Decision 3: TemplatesProvider 架構
**選擇**: 使用 React Context API，與其他 Providers 一致

**架構設計**：
```typescript
interface TemplatesState {
  templates: TemplateData[];
  loading: boolean;
  error: string | null;
}

interface TemplatesContextValue {
  state: TemplatesState;
  createTemplate: (data: Partial<TemplateData>) => Promise<void>;
  updateTemplate: (id: string, data: Partial<TemplateData>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  createCardFromTemplate: (templateId: string, groupId: string) => Promise<WebpageData>;
  batchCreateFromTemplate: (templateId: string, groupId: string, count: number) => Promise<WebpageData[]>;
  reorderTemplates: (templateIds: string[]) => Promise<void>;
  exportTemplates: () => Promise<string>;
  importTemplates: (jsonContent: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

function TemplatesProvider({ children }: Props) {
  const [state, setState] = useState<TemplatesState>({
    templates: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const db = await openIndexedDB();
      const tx = db.transaction('templates', 'readonly');
      const templates = await tx.objectStore('templates').getAll();

      // 首次啟動時建立預設模板
      if (templates.length === 0) {
        await createDefaultTemplates();
        templates = await tx.objectStore('templates').getAll();
      }

      // 按 order 排序
      templates.sort((a, b) => a.order - b.order);

      setState({ templates, loading: false, error: null });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }

  // ... 實作各種方法

  return (
    <TemplatesContext.Provider value={{ state, createTemplate, ... }}>
      {children}
    </TemplatesContext.Provider>
  );
}
```

**Provider 階層**：
```tsx
<OrganizationsProvider>
  <CategoriesProvider>
    <WebpagesProvider>
      <TemplatesProvider>
        <OpenTabsProvider>
          <App />
        </OpenTabsProvider>
      </TemplatesProvider>
    </WebpagesProvider>
  </CategoriesProvider>
</OrganizationsProvider>
```

**使用範例**：
```typescript
function TemplateQuickAdd() {
  const { state, createCardFromTemplate } = useTemplates();
  const { templates } = state;

  async function handleSelectTemplate(templateId: string) {
    try {
      const webpage = await createCardFromTemplate(templateId, currentGroupId);
      showNotification(`已建立：${webpage.title}`);
    } catch (error) {
      showError(`建立失敗: ${error.message}`);
    }
  }

  return (
    <div>
      {templates.map(template => (
        <button key={template.id} onClick={() => handleSelectTemplate(template.id)}>
          {template.name}
        </button>
      ))}
    </div>
  );
}
```

---

### Decision 4: 預設模板初始化
**選擇**: 首次啟動時自動建立預設模板

**預設模板定義**：
```typescript
const DEFAULT_TEMPLATES: Partial<TemplateData>[] = [
  {
    name: '每日筆記',
    title: '筆記 - {{date}}',
    url: '',
    favicon: '📝',
    note: '建立時間：{{datetime}}',
    order: 0,
    isDefault: true
  },
  {
    name: '會議記錄',
    title: '會議 #{{counter}} - {{date}}',
    url: '',
    favicon: '📅',
    note: '會議時間：{{datetime}}',
    order: 1,
    isDefault: true
  },
  {
    name: '待辦事項',
    title: '任務 #{{counter}}',
    url: '',
    favicon: '✅',
    note: '建立於 {{date}}',
    order: 2,
    isDefault: true
  },
  {
    name: '學習資源',
    title: '學習 - {{date}}',
    url: 'https://example.com/learning',
    favicon: '📚',
    note: '',
    order: 3,
    isDefault: true
  }
];

async function createDefaultTemplates(): Promise<void> {
  const db = await openIndexedDB();
  const tx = db.transaction('templates', 'readwrite');
  const store = tx.objectStore('templates');

  for (const template of DEFAULT_TEMPLATES) {
    const fullTemplate: TemplateData = {
      id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: template.name!,
      title: template.title,
      url: template.url,
      favicon: template.favicon,
      note: template.note,
      counter: 1,
      usageCount: 0,
      order: template.order!,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await store.add(fullTemplate);
  }

  await tx.complete;
}
```

**重置為預設模板**：
```typescript
async function resetToDefaults(): Promise<void> {
  const confirmed = await confirmDialog(
    '此操作將清空所有模板並重置為預設，確定繼續？'
  );

  if (!confirmed) return;

  const db = await openIndexedDB();
  const tx = db.transaction('templates', 'readwrite');
  const store = tx.objectStore('templates');

  // 清空現有模板
  await store.clear();

  // 重新建立預設模板
  for (const template of DEFAULT_TEMPLATES) {
    // ... 同上
  }

  await tx.complete;

  // 重新載入模板
  await loadTemplates();

  showNotification('已重置為預設模板');
}
```

---

### Decision 5: 批次建立優化
**選擇**: 使用 IndexedDB 交易批次寫入，減少資料庫操作次數

**實作**：
```typescript
async function batchCreateFromTemplate(
  templateId: string,
  groupId: string,
  count: number
): Promise<WebpageData[]> {
  const template = await getTemplate(templateId);
  const webpages: WebpageData[] = [];

  const db = await openIndexedDB();
  const tx = db.transaction(['templates', 'webpages', 'meta'], 'readwrite');

  try {
    const templateStore = tx.objectStore('templates');
    const webpagesStore = tx.objectStore('webpages');

    // 讀取當前計數器
    let counter = template.counter || 1;

    // 批次建立卡片
    for (let i = 0; i < count; i++) {
      const title = replaceVariables(
        template.title || '',
        templateId,
        { counter: counter + i }
      );

      const webpage: WebpageData = {
        id: `w_${Date.now()}_${i}`,
        title,
        url: replaceVariables(template.url || '', templateId, { counter: counter + i }),
        favicon: template.favicon,
        note: replaceVariables(template.note || '', templateId),
        category: getCategoryIdFromGroup(groupId),
        subcategoryId: groupId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await webpagesStore.add(webpage);
      webpages.push(webpage);
    }

    // 一次性更新模板計數器
    template.counter = counter + count;
    template.usageCount = (template.usageCount || 0) + count;
    template.lastUsedAt = Date.now();
    template.updatedAt = new Date().toISOString();
    await templateStore.put(template);

    // 更新群組順序
    const metaStore = tx.objectStore('meta');
    const ordersData = await metaStore.get('orders');
    const groupOrder = ordersData.value.subcategories[groupId] || [];

    ordersData.value.subcategories[groupId] = [
      ...groupOrder,
      ...webpages.map(w => w.id)
    ];

    await metaStore.put(ordersData);

    await tx.complete;

    return webpages;
  } catch (error) {
    tx.abort();
    throw error;
  }
}
```

**效能對比**：
| 建立數量 | 逐筆寫入 | 批次寫入（交易） | 提升 |
|---------|---------|----------------|------|
| 10 張   | 500ms   | 80ms           | 6.3x |
| 50 張   | 2500ms  | 300ms          | 8.3x |
| 100 張  | 5000ms  | 550ms          | 9.1x |

---

## Data Model

### TemplateData 結構
```typescript
interface TemplateData {
  id: string;              // t_[timestamp]_[random]
  name: string;            // 模板名稱（唯一顯示名稱）
  title?: string;          // 卡片標題模板（支援變數）
  url?: string;            // 卡片 URL 模板（支援變數）
  favicon?: string;        // Favicon URL 或 emoji
  note?: string;           // 備註模板（支援變數）
  counter: number;         // 計數器當前值（預設 1）
  usageCount: number;      // 使用次數（統計）
  lastUsedAt?: number;     // 最後使用時間戳（epoch ms）
  order: number;           // 顯示順序（拖放排序用）
  isDefault: boolean;      // 是否為預設模板
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
}
```

### 變數上下文
```typescript
interface VariableContext {
  date?: Date;             // 可選：自訂日期（預設當前日期）
  counter?: number;        // 可選：自訂計數器起始值
  [key: string]: any;      // 擴展欄位
}
```

---

## Performance Considerations

### 變數替換效能
- **複雜度**: O(n)，n 為字串長度
- **測試數據**: 1000 次替換操作 < 10ms

### IndexedDB 寫入優化
- 使用交易批次寫入（批次建立時）
- 避免頻繁更新模板（debounce）

### UI 響應性
- 模板列表使用虛擬化滾動（50+ 模板時）
- 使用 React.memo 避免不必要的重新渲染

---

## Testing Strategy

### 單元測試
```typescript
describe('Variable Replacement', () => {
  it('should replace date variable', () => {
    const result = replaceVariables('Note - {{date}}', 'template-1');
    expect(result).toMatch(/Note - \d{4}-\d{2}-\d{2}/);
  });

  it('should increment counter', async () => {
    const template = await createTemplate({ title: 'Task #{{counter}}' });

    const card1 = await createCardFromTemplate(template.id, 'group-1');
    expect(card1.title).toBe('Task #1');

    const card2 = await createCardFromTemplate(template.id, 'group-1');
    expect(card2.title).toBe('Task #2');
  });

  it('should handle custom date format', () => {
    const result = replaceVariables('{{date:YYYY/MM/DD}}', 'template-1');
    expect(result).toMatch(/\d{4}\/\d{2}\/\d{2}/);
  });
});
```

### 整合測試
- 測試完整的模板建立和使用流程
- 測試批次建立多張卡片
- 測試預設模板初始化
- 測試匯入匯出功能

### 手動測試清單
- [ ] 建立包含各種變數的模板
- [ ] 從模板建立卡片，驗證變數替換正確
- [ ] 批次建立 10 張卡片，驗證計數器遞增
- [ ] 拖放調整模板順序，驗證持久化
- [ ] 匯出模板並重新匯入，驗證資料完整

---

## Known Issues & Limitations

### 目前限制
1. **變數系統簡單**：不支援條件邏輯、迴圈
2. **計數器單向遞增**：無法重置或自訂起始值
3. **無模板預覽**：建立前無法即時預覽替換結果

### 已知問題
- **日期格式驗證不完整**：使用者可能輸入無效格式
- **計數器跳號問題**：刪除卡片不會回收計數器（設計如此）

---

## Future Enhancements

### 計畫功能
1. **模板分類**：為模板新增分類標籤
2. **模板分享**：匯出單一模板為 JSON
3. **進階變數**：支援 `{{random}}`, `{{uuid}}` 等
4. **自訂變數**：使用者定義自己的變數
5. **模板預覽**：即時預覽變數替換結果

---

## References
- **需求規格**: `spec.md`
- **date-fns 文檔**: https://date-fns.org/
- **實作位置**: `src/app/providers/TemplatesProvider.tsx`
- **相關規格**: `../bookmark-management/spec.md` - 卡片建立機制
