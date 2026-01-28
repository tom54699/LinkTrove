# Change: 統一級聯刪除為軟刪除機制

## Why

當前系統存在**刪除機制不一致**的問題：
- Webpages 使用軟刪除（標記 `deleted: true`），支援雲端同步和回收站功能
- Organizations/Categories/Subcategories 的級聯刪除使用硬刪除（直接從 IDB 刪除）

這導致以下問題：
1. **同步衝突風險**：級聯硬刪除無法產生 tombstone，跨設備同步時無法正確處理刪除狀態
2. **無法恢復**：組織/類別被刪除後無法透過任何方式恢復（使用者誤操作風險高）
3. **邏輯不一致**：級聯刪除時未過濾已軟刪除的項目，可能重複處理
4. **維護困難**：兩套刪除邏輯增加代碼複雜度和錯誤風險

## What Changes

### 1. 統一刪除機制（核心變更）
- **BREAKING**: 修改所有實體刪除為軟刪除
  - `organizations.tsx:173-249` - Organization 級聯軟刪除
  - `categories.tsx:345-413` - Category 級聯軟刪除
  - `storage.ts:599-642` - Subcategory 軟刪除（reassign 模式）
  - `storage.ts:643-684` - Subcategory + Webpages 級聯軟刪除
  - ~~`storage.ts:897-952` - Organization 軟刪除（reassign 模式）~~ **已移除**
  - `webpageService.ts:292-318` - Webpage 軟刪除（已存在）
- **BREAKING**: 級聯刪除改為級聯軟刪除
  - 刪除 Organization → 軟刪除所有 Categories/Subcategories/Webpages（單一交易）
  - 刪除 Category → 軟刪除所有 Subcategories/Webpages（單一交易）
  - 刪除 Subcategory → 軟刪除所有 Webpages（單一交易）
- **BREAKING**: 移除不一致的刪除 API
  - 完全移除 `storage.deleteOrganization()` API（reassign 模式）
  - 統一使用 UI 層的級聯軟刪除邏輯

### 2. 過濾邏輯修正
- **所有讀取路徑**加入 `.filter(x => !x.deleted)` 過濾
  - `categories.tsx:91, 98, 129, 131, 172, 179` - 載入時過濾
  - `categories.tsx:281` - 同步合併時過濾
  - `categories.tsx:240` - 刪除前檢查時過濾
  - `storage.ts:107, 485, 498, 562, 568` - Storage layer 過濾
  - `organizations.tsx:195, 205, 214` - 級聯刪除時過濾
- **Bug 修正**：
  - `categories.tsx:293` - 新增 Category 時補充 `organizationId`
  - `storage.ts:483-496` - `saveToLocal` 合併保留軟刪除記錄
  - `sidebar.tsx:240` - 前置檢查加入 `!c.deleted` 過濾

### 3. GC 增強
- `gcService.ts:150-185` - GC 清理 order metadata
  - 收集被刪除的 subcategory IDs
  - 清理對應的 `order.subcat.{id}` metadata
  - 防止 meta store 膨脹

### 4. 設計決策
- **isDefault 不轉移**：刪除預設項目時不轉移 `isDefault` 標記
  - 理由：isDefault 代表「系統自動建立的預設」，使用者建立的不該標記
  - fallback 機制會自動選第一個，不依賴 isDefault
- **時間戳格式**：內部統一使用 Unix ms（`Date.now()`，number）
  - 所有新增/更新的 `deletedAt` 和 `updatedAt` 使用 number
  - 對外輸出/顯示時轉 ISO 8601（`new Date(ms).toISOString()`）
  - 相容舊資料：讀取時允許 string | number，寫入前統一轉成 number
- **刪除路徑統一**：
  - **BREAKING**: 完全移除 `storage.deleteOrganization()` API（reassign 模式）
  - Runtime 統一使用 `organizations.tsx:remove()` 進行級聯軟刪除
  - 移除理由：
    - `deleteOrganization()` 的 reassign 行為與 UI 層的級聯刪除不一致
    - 僅在測試中使用，未在生產代碼中使用
    - 保留會造成維護困難和誤用風險
  - 受影響檔案：
    - `src/background/idb/storage.ts`: 移除實作（66 行）
    - `src/background/storageService.ts`: 移除介面定義
    - `src/background/idb/__tests__/organizations.crud.test.ts`: 移除相關測試用例

### 5. 更新規格文件
- 更新 `specs/bookmark-management/spec.md` 的刪除相關 Requirements
- 明確定義軟刪除行為和 tombstone 生命週期
- 標註效能優化為後續改進項目

## Impact

### 受影響的 Specs
- `specs/bookmark-management/spec.md` - 刪除行為變更

### 受影響的代碼
- `src/app/sidebar/organizations.tsx` - ✅ Organization 級聯軟刪除
- `src/app/sidebar/categories.tsx` - ✅ Category 級聯軟刪除 + 過濾邏輯修正
- `src/app/sidebar/sidebar.tsx` - ✅ 前置檢查加入過濾
- `src/background/idb/storage.ts` - ✅ Subcategory 軟刪除 + saveToLocal 修正 + **移除 deleteOrganization API**
- `src/background/storageService.ts` - ✅ **移除 deleteOrganization 介面定義**
- `src/app/data/gcService.ts` - ✅ 加入 order metadata 清理
- `src/app/webpages/__tests__/add-to-selected-category.test.tsx` - ✅ 修正測試時序問題
- `src/background/idb/__tests__/organizations.crud.test.ts` - ✅ **移除 reassign 測試用例**
- `src/app/data/mergeService.ts` - ✅ 已支援 tombstone（無需修改）

### 受影響的測試
- `src/app/__tests__/delete-protection.integration.test.tsx` - ✅ 已更新預期（軟刪除）
- `src/app/sidebar/__tests__/organizations.delete.test.tsx` - ✅ 已更新預期（軟刪除）
- `src/app/sidebar/__tests__/categories.delete.test.tsx` - ✅ 已更新預期（軟刪除）
- `src/app/webpages/__tests__/add-to-selected-category.test.tsx` - ✅ 修正 useEffect 重複執行
- **測試結果**：75 個測試文件，244 個測試全部通過 ✅

### Breaking Changes
- **資料庫行為**：刪除操作不再從 IDB 移除記錄，而是標記 `deleted: true`
- **API 變更**：移除 `storage.deleteOrganization()` API（僅內部 API，無外部影響）
- **使用者體驗**：刪除後的項目在 30 天內可透過同步合併恢復（若遠端有更新的版本）

### 向後兼容性
- ✅ 現有資料無需遷移（已刪除的項目本就不存在）
- ✅ 匯出格式無需變更（已包含 `deleted` 欄位）
- ✅ 同步機制已支援 tombstone（LWW 合併邏輯完善）

## Risks

### 高風險
- **測試回歸**：級聯刪除邏輯變更可能影響多個測試用例

### 中風險
- **UI 顯示**：需確保所有查詢位置正確過濾 `deleted` 項目（已有保護機制，但需驗證）

### 低風險
- **GC 累積**：軟刪除會增加 tombstone 數量，但現有 GC 機制可處理

## Migration Plan

### Phase 1: 代碼修改（1 天）
1. 修改 `organizations.tsx` 級聯刪除邏輯
2. 修改 `categories.tsx` 刪除邏輯
3. 加入 `.filter(x => !x.deleted)` 保護

### Phase 2: 測試驗證（半天）
1. 運行所有刪除相關測試
2. 修正測試用例的預期行為
3. 手動測試級聯刪除流程

### Phase 3: 規格更新（半天）
1. 更新 `specs/bookmark-management/spec.md`
2. 運行 `openspec validate --strict` 確認無誤

### Rollback Plan
若發現重大問題，可透過以下方式回滾：
1. Git revert 提交
2. 測試保護網可快速偵測回歸
3. 資料無損（只是標記方式不同）

## Success Metrics

- [x] 所有刪除操作使用軟刪除（標記 `deleted: true`）
- [x] 級聯刪除正確傳播軟刪除標記（單一交易，統一時間戳）
- [x] 已刪除項目不會在 UI 顯示（所有讀取路徑過濾 `deleted`）
- [x] 所有現有測試通過（244 個測試全部通過）
- [x] GC 清理 order metadata（防止 meta store 膨脹）
- [x] Bug 修正（organizationId 缺失、saveToLocal 清空軟刪除記錄）
- [ ] `openspec validate --strict` 無錯誤
- [x] 雲端同步合併正確處理刪除 tombstone（已有機制，無需修改）

## 手動測試完成

- [x] 單項刪除（Org/Category/Group/Card）→ 軟刪除 ✓
- [x] 級聯刪除 ✓
- [x] 連續刪除 ✓
- [x] 自動切換 ✓
- [x] 保護機制（每個 org 至少一個 category）✓
- [x] 數據完整性（deleted: true, deletedAt, updatedAt）✓
- [x] UI 狀態更新 ✓
