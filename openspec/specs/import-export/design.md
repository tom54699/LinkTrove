# Design: Import/Export

## Context
LinkTrove 需要提供強大的匯入匯出功能，以支援：
- **資料備份與恢復**：使用者可定期備份書籤資料
- **跨裝置遷移**：在不同電腦間轉移資料
- **從 Toby 遷移**：吸引 Toby 使用者轉換到 LinkTrove
- **瀏覽器書籤匯入**：從 Chrome/Firefox 匯入現有書籤

**約束條件**：
- 必須與 Toby v3/v4 格式完全相容（參見 `fixtures/toby-*.json`）
- 必須支援標準 HTML 書籤格式（Netscape Bookmark File Format）
- 匯入大型檔案（1000+ 卡片）時不能阻塞 UI
- 必須保證資料完整性（原子性操作）

## Goals / Non-Goals

### Goals
- ✅ 完整的資料可攜性（無資訊損失）
- ✅ Toby v3/v4 格式完全相容
- ✅ 標準 HTML 書籤格式支援
- ✅ 順序保留機制（關鍵 UX）
- ✅ 錯誤處理與回滾機制
- ✅ 清楚的使用者反饋（進度、錯誤訊息）

### Non-Goals
- ❌ 支援其他書籤管理工具格式（Pocket, Raindrop 等）
- ❌ 自動雲端同步（未來功能）
- ❌ 增量同步（只支援完整匯入匯出）
- ❌ 匯入時去重複（由使用者手動處理）

## Technical Decisions

### Decision 1: 使用統一的 Importer 介面
**選擇**: 定義標準 Importer 介面，為不同格式實作對應的 importer

**理由**：
1. **可擴展性**：未來新增格式只需實作 Importer 介面
2. **可測試性**：每個 importer 可獨立測試
3. **關注點分離**：格式解析邏輯與 UI 邏輯分離

**介面設計**：
```typescript
interface Importer {
  name: string;  // "Toby v4", "HTML Bookmarks", "LinkTrove"
  detect(content: string): boolean;  // 偵測檔案格式
  parse(content: string): ImportData;  // 解析並轉換為標準格式
}

interface ImportData {
  organizations: OrganizationData[];
  categories: CategoryData[];
  subcategories: SubcategoryData[];
  webpages: WebpageData[];
  orders: { subcategories: Record<string, string[]> };
}
```

**實作的 Importers**：
- `TobyV3Importer`: 處理 Toby v3 JSON 格式
- `TobyV4Importer`: 處理 Toby v4 JSON 格式
- `LinkTroveImporter`: 處理 LinkTrove 原生格式
- `HTMLBookmarksImporter`: 處理 HTML 書籤格式

**替代方案考量**：
- ❌ **單一巨大函式處理所有格式**：難以維護和測試
- ❌ **動態插件系統**：過度設計，專案規模不需要

**Trade-offs**：
- 優點：程式碼組織清晰，易於測試和擴展
- 優點：新增格式不影響既有程式碼
- 缺點：增加少許抽象層（但值得）

---

### Decision 2: 順序保留策略
**選擇**: 使用 `orders.subcategories` 集中管理順序，匯入時優先恢復順序資訊

**理由**：
1. **一致性**：與 bookmark-management capability 的順序管理機制一致
2. **Toby 相容**：Toby 的 `index` 欄位可直接轉換為順序陣列
3. **HTML 相容**：HTML 文件順序可映射為順序陣列

**不同格式的順序處理**：

**LinkTrove JSON**：
```typescript
// 匯出時包含順序資訊
const exportData = {
  // ...
  orders: {
    subcategories: {
      "g_123": ["w_3", "w_1", "w_2"]  // 明確的順序陣列
    }
  }
};

// 匯入時直接使用
const order = importData.orders.subcategories[groupId];
```

**Toby JSON**：
```typescript
// Toby 卡片包含 index 欄位
const tobyCard = { id: "card1", index: 2, ... };

// 轉換時排序並建立順序陣列
const orderedCards = cards.sort((a, b) => a.index - b.index);
const order = orderedCards.map(c => convertedCardId);
orders.subcategories[groupId] = order;
```

**HTML 書籤**：
```typescript
// HTML 文件中書籤有天然順序（出現順序）
// 解析時記錄順序
const bookmarks: Bookmark[] = [];
parseHTML(htmlContent, (bookmark) => {
  bookmarks.push(bookmark);  // 按解析順序添加
});

// 建立順序陣列
orders.subcategories[groupId] = bookmarks.map(b => b.id);
```

**Trade-offs**：
- 優點：所有格式統一處理，匯入後順序一致
- 優點：避免資料遺失（順序是關鍵 UX）
- 缺點：需要額外處理順序資訊的儲存和恢復

---

### Decision 3: Toby 格式轉換策略
**選擇**: 將 Toby 的扁平 Lists 結構映射到 LinkTrove 的 Categories/Subcategories 階層

**理由**：
1. **資料保留**：Toby 的 Lists 和 Cards 完整對應到 LinkTrove
2. **使用者期望**：匯入後結構與 Toby 類似
3. **簡單性**：不需要複雜的資料轉換邏輯

**映射規則**：
```
Toby Structure:
- Lists (collections)
  - Cards (bookmarks)

LinkTrove Structure:
- Organizations (預設: o_default "Personal")
  - Categories (from Toby Lists)
    - Subcategories (from Toby Lists，名稱相同)
      - Webpages (from Toby Cards)
```

**具體轉換**：
```typescript
// Toby List → LinkTrove Category + Subcategory
const tobyList = {
  id: "list1",
  title: "前端開發",
  cards: ["card1", "card2"]
};

// 建立 Category
const category = {
  id: `c_${Date.now()}`,
  name: tobyList.title,
  organizationId: "o_default",
  order: index,
  color: generateColor()
};

// 建立 Subcategory（同名）
const subcategory = {
  id: `g_${Date.now()}`,
  name: tobyList.title,
  categoryId: category.id,
  order: 0,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// Toby Card → LinkTrove Webpage
const tobyCard = {
  id: "card1",
  title: "React Docs",
  url: "https://react.dev",
  favicon: "...",
  index: 0
};

const webpage = {
  id: `w_${Date.now()}`,
  title: tobyCard.title,
  url: tobyCard.url,
  favicon: tobyCard.favicon,
  category: category.id,
  subcategoryId: subcategory.id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
```

**替代方案考量**：
- ❌ **Toby List → Category only**：失去階層結構，不符合 LinkTrove 設計
- ❌ **Toby List → Subcategory only**：需要預設 Category，語義不清楚

**Trade-offs**：
- 優點：結構清晰，易於理解
- 優點：保留 Toby 的組織邏輯
- 缺點：可能產生冗餘的 Category/Subcategory（同名）
- 緩解：未來可提供「合併重複分類」功能

---

### Decision 4: HTML 書籤解析策略
**選擇**: 使用 DOMParser API 解析 HTML，遞迴處理巢狀資料夾

**理由**：
1. **標準 API**：瀏覽器原生支援，無需引入額外 parser
2. **穩健性**：處理各種 HTML 變體（Chrome, Firefox, Safari）
3. **效能**：DOMParser 比字串正則解析更快

**解析邏輯**：
```typescript
function parseHTMLBookmarks(htmlContent: string): ImportData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const result: ImportData = {
    organizations: [createDefaultOrg()],
    categories: [],
    subcategories: [],
    webpages: [],
    orders: { subcategories: {} }
  };

  // 遞迴處理資料夾
  function processFolder(dlElement: Element, parentCategoryId?: string) {
    const items = dlElement.children;

    for (let i = 0; i < items.length; i++) {
      const dt = items[i];
      const h3 = dt.querySelector('H3');

      if (h3) {
        // 資料夾 → Category 或 Subcategory
        const name = h3.textContent || 'Untitled';
        const dl = dt.nextElementSibling;

        if (!parentCategoryId) {
          // 第一層 → Category
          const category = createCategory(name);
          const subcategory = createSubcategory(name, category.id);
          result.categories.push(category);
          result.subcategories.push(subcategory);

          if (dl) processFolder(dl, category.id);
        } else {
          // 第二層+ → Subcategory
          const subcategory = createSubcategory(name, parentCategoryId);
          result.subcategories.push(subcategory);

          if (dl) processBookmarks(dl, subcategory.id);
        }
      }

      const a = dt.querySelector('A');
      if (a) {
        // 書籤項目 → Webpage
        const webpage = createWebpage(a, parentCategoryId);
        result.webpages.push(webpage);
      }
    }
  }

  const rootDL = doc.querySelector('DL');
  if (rootDL) processFolder(rootDL);

  return result;
}
```

**處理巢狀深度**：
- 1 層：`<H3>` → Category（同時建立同名 Subcategory）
- 2 層：`<H3>` → Subcategory
- 3+ 層：扁平化為 Subcategory（使用「路徑」命名，例如：「父資料夾 / 子資料夾」）

**Trade-offs**：
- 優點：相容各種瀏覽器匯出的 HTML
- 優點：處理畸形 HTML 較穩健
- 缺點：深層巢狀會扁平化（但符合 LinkTrove 設計）

---

### Decision 5: 交易式匯入機制
**選擇**: 使用 IndexedDB 交易確保匯入的原子性

**理由**：
1. **資料完整性**：匯入失敗時自動回滾，避免部分資料寫入
2. **效能**：批次寫入比逐筆寫入快 10-100 倍
3. **IndexedDB 原生支援**：無需額外實作

**實作方式**：
```typescript
async function importData(data: ImportData, mode: 'merge' | 'replace') {
  const db = await openIndexedDB();

  // 建立讀寫交易，涵蓋所有 stores
  const tx = db.transaction([
    'organizations',
    'categories',
    'subcategories',
    'webpages',
    'meta'
  ], 'readwrite');

  try {
    // 覆蓋模式：先清空所有 stores
    if (mode === 'replace') {
      await Promise.all([
        tx.objectStore('organizations').clear(),
        tx.objectStore('categories').clear(),
        tx.objectStore('subcategories').clear(),
        tx.objectStore('webpages').clear()
      ]);
    }

    // 批次寫入資料
    const orgsStore = tx.objectStore('organizations');
    for (const org of data.organizations) {
      await orgsStore.put(org);
    }

    const catsStore = tx.objectStore('categories');
    for (const cat of data.categories) {
      await catsStore.put(cat);
    }

    // ... 類似處理 subcategories, webpages

    // 寫入順序資訊
    const metaStore = tx.objectStore('meta');
    await metaStore.put({ key: 'orders', value: data.orders });

    // 提交交易
    await tx.complete;

    return { success: true, count: data.webpages.length };
  } catch (error) {
    // 交易失敗自動回滾
    tx.abort();
    throw new Error(`匯入失敗: ${error.message}`);
  }
}
```

**錯誤處理**：
- IndexedDB 交易失敗時自動回滾所有變更
- 拋出錯誤並顯示給使用者
- 記錄詳細錯誤資訊到 console（方便除錯）

**Trade-offs**：
- 優點：保證資料完整性（ACID）
- 優點：效能佳（批次操作）
- 缺點：大型匯入可能觸發瀏覽器 quota 限制（需提前檢查）

---

## Data Format Specifications

### LinkTrove Native Format
完整定義參見 `/docs/specs/data-format.md`。

**關鍵欄位**：
```json
{
  "organizations": [
    { "id": "o_123", "name": "Personal", "order": 0 }
  ],
  "categories": [
    { "id": "c_456", "name": "前端開發", "organizationId": "o_123", "order": 0, "color": "#ff0000" }
  ],
  "subcategories": [
    { "id": "g_789", "name": "React", "categoryId": "c_456", "order": 0, "createdAt": 1234567890, "updatedAt": 1234567890 }
  ],
  "webpages": [
    { "id": "w_111", "title": "React Docs", "url": "https://react.dev", "category": "c_456", "subcategoryId": "g_789", "createdAt": "2026-01-07T...", "updatedAt": "2026-01-07T..." }
  ],
  "orders": {
    "subcategories": {
      "g_789": ["w_111", "w_222", "w_333"]
    }
  },
  "settings": {
    "selectedOrganizationId": "o_123",
    "selectedCategoryId": "c_456"
  }
}
```

### Toby v4 Format
**結構特徵**：
```json
{
  "lists": [
    {
      "id": "list_id",
      "title": "List Name",
      "cards": ["card_id_1", "card_id_2"]
    }
  ],
  "cards": [
    {
      "id": "card_id_1",
      "title": "Card Title",
      "url": "https://...",
      "favicon": "data:image/png;base64,...",
      "index": 0
    }
  ]
}
```

**與 v3 差異**：
- v4 使用 `lists.cards` 陣列（card IDs）
- v3 使用巢狀結構（cards 直接嵌入 lists）

### HTML Bookmarks Format
**標準結構**（Netscape Bookmark File Format）：
```html
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3>前端開發</H3>
  <DL><p>
    <DT><A HREF="https://react.dev" ADD_DATE="1234567890" ICON="data:image/png;base64,...">React</A>
  </DL><p>
</DL><p>
```

**關鍵標籤**：
- `<H3>`: 資料夾名稱
- `<A>`: 書籤項目
- `HREF`: URL
- `ADD_DATE`: 建立時間（Unix timestamp）
- `ICON`: Favicon（base64 或 URL）

---

## Performance Considerations

### 大型檔案匯入優化
**問題**: 匯入 1000+ 卡片時 UI 卡頓

**解決方案**：
1. **批次處理**: 每次寫入 100 筆，避免單一交易過大
   ```typescript
   const BATCH_SIZE = 100;
   for (let i = 0; i < webpages.length; i += BATCH_SIZE) {
     const batch = webpages.slice(i, i + BATCH_SIZE);
     await writeBatch(batch);
     updateProgress(i + batch.length, webpages.length);
   }
   ```

2. **非同步處理**: 使用 `setTimeout` 讓出執行緒，避免阻塞 UI
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 0));
   ```

3. **進度顯示**: 使用 React state 更新進度條
   ```typescript
   onProgress((current, total) => {
     setProgress({ current, total, percent: (current / total) * 100 });
   });
   ```

### 記憶體優化
**問題**: 大型 JSON 檔案解析消耗大量記憶體

**解決方案**：
- 使用串流解析（未來改進）
- 當前：限制單次匯入檔案大小（提示超過 50MB 時分批匯入）

---

## Error Handling Strategy

### 檔案格式驗證
```typescript
function validateImportData(data: unknown): ImportData {
  if (!data || typeof data !== 'object') {
    throw new ImportError('無效的 JSON 格式');
  }

  const d = data as any;

  if (!Array.isArray(d.categories)) {
    throw new ImportError('缺少 categories 陣列');
  }

  if (!Array.isArray(d.webpages)) {
    throw new ImportError('缺少 webpages 陣列');
  }

  // ... 更多驗證

  return d as ImportData;
}
```

### ID 衝突處理
```typescript
enum ConflictResolution {
  Replace = 'replace',  // 覆蓋現有資料
  Skip = 'skip',        // 跳過匯入項目
  Duplicate = 'duplicate'  // 重新生成 ID
}

async function handleIDConflict(
  existingItem: WebpageData,
  importItem: WebpageData,
  resolution: ConflictResolution
): Promise<WebpageData | null> {
  switch (resolution) {
    case ConflictResolution.Replace:
      return importItem;  // 直接覆蓋

    case ConflictResolution.Skip:
      return null;  // 跳過，保留現有

    case ConflictResolution.Duplicate:
      return {
        ...importItem,
        id: `w_${Date.now()}_dup`  // 生成新 ID
      };
  }
}
```

---

## Testing Strategy

### 單元測試
- 每個 Importer 獨立測試（使用 fixtures）
- 測試順序保留邏輯
- 測試錯誤處理（畸形 JSON, HTML）

**測試檔案**：
- `src/background/__tests__/import.toby.v4.groups.test.ts`
- `src/background/__tests__/import.html.bookmarks.test.ts`

### 整合測試
- 完整匯入匯出流程測試
- 驗證 IndexedDB 資料完整性
- 驗證順序恢復正確性

### 手動測試清單
- [ ] 匯入 Toby v3 範例檔案（`fixtures/toby-v3-sample.json`）
- [ ] 匯入 Toby v4 範例檔案（`fixtures/toby-v4-sample.json`）
- [ ] 匯入 Chrome 匯出的 HTML 書籤
- [ ] 匯出後重新匯入，驗證資料一致
- [ ] 測試 1000+ 卡片大型檔案效能

---

## Migration Path

### 從無匯入功能 → 完整匯入匯出
1. ✅ 實作 LinkTrove 原生格式匯出（已完成）
2. ✅ 實作 Toby v3/v4 匯入（已完成）
3. ✅ 實作 HTML 書籤匯入（已完成）
4. 🔄 優化大型檔案處理（進行中）
5. 📋 新增匯入選項 UI（計畫中）

---

## Open Questions
- [ ] 是否支援匯出單一組織的資料？（目前匯出全部）
- [ ] 是否需要「增量匯入」功能？（只匯入新增項目）
- [ ] 是否支援匯出為其他格式（CSV, Markdown）？

---

## References
- **需求規格**: `spec.md`
- **資料格式**: `/docs/specs/data-format.md`
- **實作位置**:
  - `src/app/groups/import/` - 匯入 UI 與邏輯
  - `src/background/importers/` - 格式轉換器
- **測試範例**: `fixtures/toby-v3-sample.json`, `fixtures/toby-v4-sample.json`
- **相關文檔**: `/docs/features/drag-drop-storage-display.md` - 順序管理
