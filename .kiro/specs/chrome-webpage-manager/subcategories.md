# 小分類（Subcategory）功能規格

## 目標

在現有大分類（Category）底下新增「小分類（Subcategory）」階層，用於組織同一大分類中的卡片。小分類以主內容區的段落呈現，可摺疊、可命名、可拖放搬移；資料以 IndexedDB 為主存，並相容現有匯出/匯入格式。

## 名詞定義

- 大分類（Category）：既有側欄清單項目。
- 小分類（Subcategory）：隸屬某一大分類之下的次階層。
- 卡片（Webpage/Card）：歸屬於某一大分類；新增可選屬於某一小分類。

## 主要需求

- 階層關係：每個大分類可擁有多個小分類；可排序、可重新命名、可刪除。
- 呈現位置：小分類以「段落」呈現在中間主內容區，每段可摺疊；側欄僅作為導覽（顯示/選取），不放任何 CRUD/排序操作。
- 命名與模板：小分類可自訂名稱；不支援 Template。
- 移動方式：卡片可在同一大分類內跨小分類移動，也可跨大分類移動；支援拖放與既有「切換分類」流程（延伸支援小分類）。
- 其他：沿用現有規格（回饋提示、快取、權限與存取模式等）；主存維持 IndexedDB。

## 資料模型

- SubcategoryData
  - `id: string`
  - `categoryId: string`
  - `name: string`
  - `order: number`
  - `createdAt: number`
  - `updatedAt: number`
- WebpageData 變更
  - 新增 `subcategoryId?: string | null`（null 代表「未分組」）。
- App/UI 狀態
  - `selectedCategoryId: string | null`（既有）
  - `selectedSubcategoryId: string | null`（可選；為 null 時顯示全部小分類段落）。

## IndexedDB 結構與遷移

- 新增 objectStore：`subcategories`（key：`id`）
  - 索引：`by_categoryId`（categoryId）、`by_categoryId_order`（categoryId+order）。
- 既有 `webpages` store：
  - 新增 composite index：`by_categoryId_subcategoryId`（categoryId+subcategoryId）。
- 遷移：DB 版本 +1；建立新 store 與索引；既有卡片 `subcategoryId` 預設為 null（未分組）。
- 匯出/匯入：
  - 匯出 JSON 包含 `subcategories` 陣列與每張卡片的 `subcategoryId`。
  - 匯入時相容舊版（缺少欄位視為 null）。

## 儲存層與服務 API

- Subcategory CRUD/排序
  - `listSubcategories(categoryId)`
  - `createSubcategory(categoryId, name)`
  - `renameSubcategory(id, name)`
  - `deleteSubcategory(id, { reassignTo?: string | null })`
  - `reorderSubcategories(categoryId, orderedIds)`
- 卡片小分類
  - `updateCardSubcategory(cardId, subcategoryId | null)`
  - 跨大分類搬移：先 `updateCategory`，再 `updateCardSubcategory`（預設 null，可在 UI 另外選目標小分類）。

## UI/UX 規劃

- 側欄（Sidebar）
  - 僅導覽用途：列出大分類下的小分類，可展開/收合、點擊以過濾主內容。
  - 不提供新增/改名/刪除/排序/拖放等操作。

- 主內容（Content）
  - 每個小分類為一段，段首為「標題列＋工具列」。
    - 重新命名：標題可點擊 inline edit，或透過操作選單。
    - 刪除：按鈕/選單；彈出確認並支援將卡片轉移到「未分組」或指定其他小分類。
    - 排序：拖曳段首在同一大分類內重排。
    - 摺疊：可切換並持久化（本地）。
  - 新增小分類：類別頁面頂部提供「新增小分類」按鈕；建立後自動進入重命名。
  - 「未分組」段落：呈現 `subcategoryId=null` 的卡片，可摺疊。

## 拖放（DnD）規格

- 卡片移動
  - 同大分類內：拖到目標小分類段落（段首/空狀態/段內）→ `updateCardSubcategory`。
  - 跨大分類：沿用「切換分類」流程；完成後 `subcategoryId` 預設為 null（可選擇目標小分類）。
  - 載荷：`{ type: 'card', id, fromCategoryId, fromSubcategoryId }`。

- 小分類排序
  - 僅支援拖曳段首在同一大分類內重排。
  - 載荷：`{ type: 'subcategory', id, categoryId }`；
  - 放下後呼叫 `reorderSubcategories` 並更新 `order`。

## 可近性（A11y）

- 段首具 `aria-expanded`；操作按鈕可鍵盤操作；提供可鍵盤使用的功能表。
- 鍵盤重排：可用快捷鍵（如 Alt+↑/↓）或功能表項目（向上/向下移動）。
- 拖放把手與落點有適當 ARIA 提示。

## 錯誤處理與回饋

- 成功/失敗以現有 Toast 呈現；失敗時回滾 UI 狀態；拖放過程提供視覺高亮與狀態指示。

## 測試計畫

- 儲存層：Subcategory CRUD/排序、卡片同/跨大分類搬移、索引查詢、DB 遷移相容。
- UI 行為：
  - 側欄僅導覽（無操作控制）。
  - 主內容段落：重命名、刪除（含轉移）、摺疊、拖曳排序（含鍵盤）。
  - 卡片拖放：拖到段首/段內改變 `subcategoryId`；跨大分類後行為正確。
- 匯出/匯入：含/不含小分類的匯入相容與正確對應。
- 邊界：刪除含大量卡片的小分類；允許同名（建議允許不強制唯一）。

## 驗收標準（DoD）

- 主內容以「小分類段落」呈現卡片，各段可摺疊且狀態可記憶。
- 小分類可新增/改名/刪除/排序；所有操作皆於主內容段首完成；側欄僅導覽。
- 卡片可於小分類間或跨大分類移動（拖放與既有「切換分類」皆可）。
- IndexedDB 版本升級成功；舊資料自動歸入「未分組」；匯出含小分類，匯入相容。
- 測試通過（覆蓋率 ≥ 80%）、型別嚴格、lint/format 乾淨；文件更新。

