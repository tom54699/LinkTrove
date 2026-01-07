# Design: Bookmark Management

## Context
LinkTrove 是一個 Chrome 擴充套件，提供類似 Toby 的書籤管理功能。使用者需要：
- 管理大量書籤（預期 1000+ 卡片）
- 快速存取和組織書籤
- 在不同裝置間匯入匯出資料
- 從 Toby 遷移到 LinkTrove

**約束條件**：
- Chrome Manifest V3 限制（service worker 無 DOM 存取）
- chrome.storage.local 有 10MB 儲存限制
- 需要與 Toby v3/v4 格式相容
- 需要保持簡單性（參見 `openspec/project.md`: Simplicity First）

## Goals / Non-Goals

### Goals
- ✅ 支援大量書籤（1000+ 卡片）不影響效能
- ✅ 提供靈活的階層式組織架構
- ✅ 保證資料持久化和可靠性
- ✅ 完整的匯入匯出功能（包含 Toby 相容）
- ✅ 簡單直覺的狀態管理（適合中型專案）

### Non-Goals
- ❌ 雲端同步（未來可能支援，但非核心功能）
- ❌ 多使用者協作
- ❌ 即時搜尋和全文檢索（基本搜尋即可）
- ❌ 複雜的權限管理

## Technical Decisions

### Decision 1: 使用 IndexedDB 而非 chrome.storage
**選擇**: IndexedDB 作為主要儲存方案

**理由**：
1. **容量限制**: chrome.storage.local 只有 10MB 限制，無法支援大量卡片（1000+ 卡片 + 截圖 ≈ 20-50MB）
2. **查詢效能**: IndexedDB 支援索引查詢（例如：按 `subcategoryId` 查詢特定群組的卡片），避免全表掃描
3. **Blob 支援**: 可儲存二進位資料（未來支援本地截圖快取）
4. **標準 API**: IndexedDB 是 Web 標準，不受 Chrome 擴充套件政策變更影響

**替代方案考量**：
- ❌ **chrome.storage**: 容量不足，無索引查詢
- ❌ **LocalStorage**: 同步 API 會阻塞 UI，容量更小（5-10MB）
- ❌ **Chrome File System API**: 已被廢棄

**Trade-offs**：
- 缺點：異步 API 增加程式碼複雜度（需要 Promise/async-await）
- 缺點：需要處理從 chrome.storage 到 IndexedDB 的遷移邏輯
- 優點：長期擴展性佳（支援未來功能如截圖快取、全文索引）

**實作細節**：
- IndexedDB 版本: v3（參見 `src/app/data/gcService.ts`）
- Stores: `organizations`, `categories`, `subcategories`, `webpages`, `templates`, `meta`
- 索引: `webpages` store 建立 `subcategoryId` 和 `category` 索引以加速查詢

---

### Decision 2: Provider-based 狀態管理（React Context）
**選擇**: 使用 React Context API 進行全域狀態管理

**理由**：
1. **專案規模**: 中型專案（<10K LOC），Context API 足夠應付
2. **簡單性**: 避免引入額外依賴（Redux, MobX, Zustand）
3. **符合專案慣例**: `openspec/project.md` 強調 "Simplicity First"
4. **Provider 階層對應資料階層**: `OrganizationsProvider` → `CategoriesProvider` → `WebpagesProvider` 清楚反映資料依賴關係

**替代方案考量**：
- ❌ **Redux**: 過於複雜（需要 actions, reducers, middleware），增加學習曲線
- ❌ **Zustand/Jotai**: 引入新依賴，團隊不熟悉
- ❌ **Component State**: 無法跨組件共享（例如：左側邊欄選擇影響中央卡片顯示）

**Trade-offs**：
- 缺點：大規模應用可能有效能問題（但目前規模不需擔心）
- 缺點：缺少 Redux DevTools 的時間旅行除錯
- 優點：程式碼量少，易於理解和維護
- 優點：與 React 18 concurrent features 相容性佳

**實作細節**：
- `OrganizationsProvider`: 管理組織列表和當前選擇
- `CategoriesProvider`: 管理類別/群組（依賴 `organizationId`）
- `WebpagesProvider`: 管理卡片資料（依賴 `categoryId` 和 `subcategoryId`）
- `OpenTabsProvider`: 獨立管理瀏覽器分頁同步（使用 Chrome Tabs API）

**Provider 階層**：
```
<OrganizationsProvider>
  <CategoriesProvider>
    <WebpagesProvider>
      <OpenTabsProvider>
        <App />
      </OpenTabsProvider>
    </WebpagesProvider>
  </CategoriesProvider>
</OrganizationsProvider>
```

---

### Decision 3: 四層階層架構
**選擇**: Organizations → Categories → Subcategories → Webpages

**理由**：
1. **多工作區支援**: Organizations 允許使用者分離個人/工作書籤
2. **靈活性**: 支援巢狀分類（例如：「前端開發」類別下有「React」、「Vue」子群組）
3. **Toby 相容**: Toby 使用 Lists → Cards 二層架構，可對應到 Categories/Subcategories → Webpages
4. **避免過度巢狀**: 限制四層避免無限遞迴（類似檔案系統）

**替代方案考量**：
- ❌ **二層架構**（Folders → Bookmarks）: 不夠靈活，無法支援多工作區
- ❌ **五層或更多**: 過度複雜，違反簡單性原則
- ❌ **標籤系統取代階層**: 標籤搜尋效能較差，不利於視覺化瀏覽

**Trade-offs**：
- 缺點：四層架構增加資料查詢複雜度（需要 JOIN 邏輯）
- 缺點：UI 需要處理多層級選擇狀態
- 優點：符合使用者心智模型（工作區 → 專案 → 分類 → 項目）
- 優點：擴展性佳（未來可新增權限管理、分享等功能）

---

### Decision 4: 每群組獨立順序管理
**選擇**: 使用 `orders.subcategories: Record<groupId, string[]>` 儲存順序

**理由**：
1. **使用者期望**: 每個群組的卡片順序應該獨立（拖放排序是核心 UX）
2. **Toby 相容**: Toby 也使用每個 List 獨立的 `index` 欄位
3. **效能考量**: 只需更新單一群組的順序陣列，不影響其他群組

**替代方案考量**：
- ❌ **全域順序**: 跨群組移動卡片時需要重新計算所有順序
- ❌ **卡片自帶 order 欄位**: 跨群組移動時需要更新多張卡片，容易產生衝突
- ❌ **Linked List**: 查詢整個列表需要 O(n) 操作，效能差

**Trade-offs**：
- 缺點：新增卡片時需要同步更新順序陣列
- 缺點：刪除卡片時需要清理順序陣列中的孤兒 ID
- 優點：查詢簡單（一次讀取即可）
- 優點：拖放操作只影響單一群組

**實作細節**：
```typescript
// 儲存格式
orders: {
  subcategories: {
    "g_1234567890": ["w_111", "w_222", "w_333"],
    "g_9876543210": ["w_444", "w_555"]
  }
}

// 渲染時邏輯
const orderedWebpages = orders.subcategories[groupId]
  ?.map(id => webpagesMap[id])
  .filter(Boolean) || webpages;
```

---

## Data Model

完整資料結構參見 `/docs/specs/data-format.md`。

**核心實體**：
```typescript
// Organizations (組織)
interface OrganizationData {
  id: string;          // o_[timestamp]
  name: string;        // "Personal", "Work"
  color?: string;      // 顏色標記
  order: number;       // 顯示順序
}

// Categories (類別/集合)
interface CategoryData {
  id: string;          // c_[timestamp]
  name: string;        // "前端開發"
  color: string;       // 類別顏色
  order: number;       // 顯示順序
  organizationId: string;  // 所屬組織
}

// Subcategories (子類別/群組)
interface SubcategoryData {
  id: string;          // g_[timestamp]
  name: string;        // "React"
  categoryId: string;  // 所屬類別
  order: number;
  createdAt: number;   // epoch ms
  updatedAt: number;
}

// Webpages (網頁卡片)
interface WebpageData {
  id: string;          // w_[timestamp]
  title: string;
  url: string;
  favicon?: string;
  screenshot?: string;
  note?: string;       // 備註
  category: string;    // 所屬類別（冗餘欄位，加速查詢）
  subcategoryId: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;
}
```

**關聯關係**：
- Organization 1:N Category (via `organizationId`)
- Category 1:N Subcategory (via `categoryId`)
- Subcategory 1:N Webpage (via `subcategoryId`)
- Webpage 冗餘儲存 `category` 以避免多次 JOIN

---

## Migration Strategy

### 從 chrome.storage v2 → IndexedDB v3

**觸發時機**: 應用程式啟動時偵測 IndexedDB 為空

**步驟**：
1. 檢查 IndexedDB 是否為空（查詢 `organizations` store）
2. 若為空，從 `chrome.storage.local` 讀取舊資料
3. 轉換資料格式：
   ```typescript
   // 舊格式缺少 organizationId
   const oldCategories = await chrome.storage.local.get('categories');

   // 建立預設組織
   const defaultOrg = {
     id: 'o_default',
     name: 'Personal',
     order: 0
   };

   // 為所有類別補上 organizationId
   const newCategories = oldCategories.map(cat => ({
     ...cat,
     organizationId: 'o_default'
   }));
   ```
4. 寫入 IndexedDB
5. 清除 `chrome.storage.local` 舊資料（標記遷移完成）

**錯誤處理**：
- 若 IndexedDB 寫入失敗，保留 chrome.storage 資料作為備份
- 記錄錯誤到 console，提示使用者匯出資料

**測試策略**：
- 模擬各種舊格式（有/無 organizationId，有/無順序資訊）
- 驗證遷移後資料完整性（測試檔案: `src/app/data/__tests__/gcService.test.ts`）

---

## Performance Considerations

### 查詢優化
- **問題**: 顯示群組 A 的卡片時，需要過濾所有 webpages
- **解決**: IndexedDB 索引 `subcategoryId`，查詢複雜度從 O(n) 降到 O(log n)
  ```typescript
  const tx = db.transaction('webpages', 'readonly');
  const index = tx.objectStore('webpages').index('subcategoryId');
  const webpages = await index.getAll(groupId); // 使用索引
  ```

### 渲染優化
- **問題**: 1000+ 卡片同時渲染導致卡頓
- **解決**: 虛擬化滾動（未來可考慮 `react-window`）
- **當前**: 限制每個群組最多顯示 500 張卡片（超過時提示分組）

### 狀態更新優化
- **問題**: Context 更新觸發大量子組件重新渲染
- **解決**: 使用 `React.memo` 和 `useMemo` 優化卡片組件
- **解決**: 拆分 Context（避免單一大 Context）

---

## Risks / Trade-offs

### Risk 1: IndexedDB 瀏覽器相容性
- **風險**: 部分瀏覽器 IndexedDB 實作有 bug（例如：Safari 隱私模式）
- **緩解**: Chrome 擴充套件只在 Chrome 執行，不受影響
- **回退方案**: 若偵測 IndexedDB 不可用，降級到 chrome.storage（提示容量限制）

### Risk 2: 遷移失敗導致資料遺失
- **風險**: 遷移過程中斷（例如：使用者關閉分頁）
- **緩解**: 遷移完成前不刪除 chrome.storage 資料
- **緩解**: 提供「重新遷移」按鈕（設定頁面）

### Risk 3: 多分頁同時寫入資料衝突
- **風險**: 使用者開啟多個新分頁，同時寫入 IndexedDB
- **緩解**: IndexedDB 交易機制保證 ACID
- **緩解**: 使用 Broadcast Channel API 同步多分頁狀態（未來改進）

---

## Open Questions
- [ ] 是否需要支援匯出單一組織的資料？（目前匯出全部）
- [ ] 是否需要軟刪除（Trash）功能？（目前直接刪除）
- [ ] 卡片截圖是否應該儲存在 IndexedDB？（目前使用 URL，依賴外部服務）

---

## References
- **資料格式規格**: `/docs/specs/data-format.md`
- **需求規格**: `spec.md`
- **實作檔案**:
  - `src/app/data/gcService.ts` - IndexedDB 服務
  - `src/app/providers/` - Context Providers
  - `src/app/groups/GroupsView.tsx` - 主要 UI 組件
