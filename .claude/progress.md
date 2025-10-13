# LinkTrove 開發進度記錄

## 最新完成：衝突檢測與提示功能 (2025-10-13)

### 功能概述
實作了 Cloud Sync 的「衝突檢測與提示」功能，在啟用 Auto Sync 或執行手動合併前，自動檢測本地與雲端資料差異並提示使用者確認。

### 新增檔案

1. **`src/app/data/conflictDetection.ts`**
   - `detectConflict()`: 比較本地與雲端資料，計算差異
   - `formatConflictMessage()`: 產生中文差異描述
   - 衝突嚴重程度判定：none / minor / major
   - 規則：網頁差異 >10 或 ≥20% = major

2. **`src/app/ui/ConflictDialog.tsx`**
   - React 對話框元件
   - 顯示本地 vs 雲端資料對比表格
   - 三個按鈕：確定/先備份/取消
   - 支援兩種操作模式：auto-sync / manual-merge

3. **`src/app/data/__tests__/conflictDetection.test.ts`**
   - 15 個單元測試，全部通過 ✓
   - 測試涵蓋：無衝突、輕微衝突、重大衝突、空資料等

### 修改檔案

1. **`src/app/ui/SettingsModal.tsx`**
   - 新增衝突檢測狀態：`conflictInfo`, `conflictOperation`
   - 修改 `toggleAutoSync()`: 開啟前檢測衝突
   - 修改 `doRestore()`: 合併模式檢測衝突，完全還原不檢測
   - 新增 `confirmAutoSync()`: 確認啟用 Auto Sync
   - 新增 `backupAndConfirmAutoSync()`: 先備份再啟用
   - 新增 `confirmManualMerge()`: 確認手動合併
   - 新增 `backupAndConfirmMerge()`: 先備份再合併
   - 整合 `ConflictDialog` 元件

2. **`src/app/data/conflictDetection.ts`** (修正)
   - 修正 import: 從 `./mergeService` 導入 `ExportPayload`

3. **`src/app/data/__tests__/conflictDetection.test.ts`** (修正)
   - 修正 import: 從 `../mergeService` 導入 `ExportPayload`

### 技術細節

**衝突判定邏輯：**
- 比較五種資料類型：webpages, categories, subcategories, templates, organizations
- 計算網頁數量差異百分比：`abs(diff) / max(local, remote) * 100`
- 嚴重程度只基於網頁數量差異（其他類型不影響 severity）

**整合流程：**
1. Auto Sync 啟用：
   - 檢查雲端是否有備份
   - 有 → 下載並檢測衝突 → 有差異顯示對話框
   - 無 → 直接啟用

2. 手動合併：
   - 下載雲端資料
   - 檢測衝突
   - 有差異 → 顯示對話框
   - 無差異 → 直接執行

3. 完全還原：
   - 不檢測衝突，直接覆蓋

**UI 互動：**
- 對話框顯示資料對比表格（本地 vs 雲端）
- 重大衝突時顯示警告訊息和「先備份」按鈕
- 使用者可選擇：確定/先備份/取消

### 測試狀態

✅ 單元測試：15/15 通過
✅ TypeScript 編譯：修正 ExportPayload import 錯誤
✅ Build 成功：`npm run build` 完成
⏳ 手動測試：待使用者測試

### 相關 Commits

**已完成 commits：**
1. "fix(sync): 修復 Auto Sync 無法觸發並優化 UI"
2. "feat(sync): 實作 LWW 細粒度合併策略"

**待 commit：**
- "feat(sync): 實作衝突檢測與提示功能"

### 下一步

使用者重開機後進行測試：
1. 測試 Auto Sync 啟用時的衝突檢測
2. 測試手動合併時的衝突檢測
3. 測試各種衝突情境（無衝突、輕微、重大）
4. 確認對話框 UI 顯示正確
5. 測試「先備份」功能
6. 確認測試通過後 commit

### 相關檔案位置

```
src/app/data/
├── conflictDetection.ts          (新增)
├── mergeService.ts                (已存在，定義 ExportPayload)
├── syncService.ts                 (已存在)
└── __tests__/
    └── conflictDetection.test.ts  (新增)

src/app/ui/
├── ConflictDialog.tsx             (新增)
└── SettingsModal.tsx              (修改)
```

### ExportPayload 類型定義

位於 `src/app/data/mergeService.ts`:

```typescript
export interface ExportPayload {
  schemaVersion: number;
  webpages: WebpageData[];
  categories: CategoryData[];
  templates: TemplateData[];
  subcategories: SubcategoryData[];
  organizations: OrganizationData[];
  settings?: {
    theme?: string;
    selectedCategoryId?: string;
    selectedOrganizationId?: string;
  };
  orders: {
    subcategories: Record<string, string[]>;
  };
  exportedAt?: string;
}
```

### 重要注意事項

1. **衝突檢測時機：**
   - Auto Sync 啟用：每次從關閉切換到開啟時
   - 手動合併：每次點擊「合併雲端資料」按鈕時
   - 完全還原：不檢測，直接覆蓋

2. **不檢測的情況：**
   - 關閉 Auto Sync
   - 點擊「完全還原」
   - 雲端無備份時啟用 Auto Sync

3. **對話框行為：**
   - 按「確定」→ 直接執行操作
   - 按「先備份」→ 先執行 `doBackup()` 再執行操作
   - 按「取消」→ 關閉對話框，不執行任何操作

## 之前完成的功能

### Cloud Sync 基礎功能
- ✅ Google Drive 認證與連線
- ✅ 手動備份/還原
- ✅ Auto Sync (自動同步)
- ✅ LWW (Last-Write-Wins) 合併策略
- ✅ IDB 變更監聽 (custom event)
- ✅ 防止遞迴同步 (restoring flag)
- ✅ 2 秒 debounce

### 資料管理
- ✅ IndexedDB 儲存 (v3)
- ✅ 從 chrome.storage 自動遷移
- ✅ Import/Export (Toby, HTML)
- ✅ Per-group ordering

### 測試
- ✅ mergeService 測試 (15 個測試)
- ✅ conflictDetection 測試 (15 個測試)

---

**最後更新：** 2025-10-13 12:21
**狀態：** 衝突檢測功能實作完成，待使用者測試
