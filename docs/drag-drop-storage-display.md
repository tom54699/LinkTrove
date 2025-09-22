# 卡片拖曳儲存與顯示資料流（現況與改進方案）

本文紀錄本專案中「拖曳卡片（或分頁）→ 儲存到 IndexedDB → 顯示卡片」的現有實作、已知問題、以及不影響現有功能的改進方案草案。僅文件，無程式更動。

## 範疇與名詞
- 卡片／書籤：Webpage 物件。
- Collection：類別（`category`）。
- Group：群組（`subcategoryId`）。
- Template：模板（決定卡片的自訂欄位 `meta` 要顯示哪些 key）。

## 資料模型與映射
- 儲存層 Webpage 資料：`title`, `url`, `favicon`, `note`, `category`, `subcategoryId`, `meta`, `templateId`, `templateData`, `createdAt`, `updatedAt`（src/background/storageService.ts:1）。
- UI 卡片映射：`note` → UI 的 `description`（src/app/webpages/WebpagesProvider.tsx:21）。
- 每個 Group 的卡片順序存於 IDB `meta` store：`order.subcat.<groupId>`（src/background/webpageService.ts:73）。

## 儲存元件
- Webpages 主要經由 `webpageService` 操作（src/background/webpageService.ts:1）。
  - 新增：`addWebpageFromTab(tab)`（src/background/webpageService.ts:145）。
  - 更新：`updateWebpage(id, patch)`（src/background/webpageService.ts:166）。
  - 重新排序：`reorderWebpages(fromId, toId)`（src/background/webpageService.ts:211）。
  - 跨群組移動（原子）：`moveCardToGroup(cardId, categoryId, groupId, beforeId?)`（src/background/webpageService.ts:298）。
- `saveWebpages` 每次覆寫整個 `webpages` 表（src/background/webpageService.ts:139）。
- 載入時會根據 `order.subcat.*` 做群組內排序（src/background/webpageService.ts:88）。

## 目前拖曳流程（高層描述）

> 註：自 2025-09 起，已移除「拖到群組標題列 header」的拖放功能，僅保留內容區 CardGrid 拖放。以下保留過去行為供參考。

（已移除）A) 拖到群組標題列 header（建立新卡→指派 collection→指派 group）
1. `actions.addFromTab(tab)` 建卡（category 預設為 `default`，`note=''`），並先行插入 UI state 以提升回饋（src/app/webpages/WebpagesProvider.tsx:100, 145, 161）。
2. `actions.updateCategory(id, group.categoryId)`：
   - 依目標 collection 的 template 欄位計算 `meta` 預設值（`computeAutoMeta`），並嘗試合併 cache 的常見欄位（siteName/author）（src/app/webpages/WebpagesProvider.tsx:219 之後）。
3. `(storage as any).updateCardSubcategory(id, group.id)`：設定 `subcategoryId` 並維護群組內順序（src/background/idb/storage.ts:515）。
4. `actions.load()` 重新載入顯示（src/app/groups/GroupsView.tsx:916）。
5. 若為真實 Chrome 分頁（有 tab.id），背景會等待分頁完成並萃取 meta，若 `note` 仍為空會以 `meta.description` 回填（src/app/webpages/WebpagesProvider.tsx:104-160）。

### B) 拖到群組內的卡片格網（建立新卡→指派 collection/group→依位置插入）
- 同 A)，但根據 ghost 位置在同 group 內做 `reorder` 或 `moveToEnd`（src/app/groups/GroupsView.tsx:903-969）。

## 描述（description/note）來源邏輯
- `note` 初值為空字串（`addWebpageFromTab`）。
- 僅在「可取得 tab.id 且頁面 meta 有 description」時，於背景補填 `note`（src/app/webpages/WebpagesProvider.tsx:104-160）。
- `updateCategory` 不會把 `description` 寫入 `note`，只更新 `meta`（並刻意排除 `title/description` 兩個 key）（src/app/webpages/WebpagesProvider.tsx:232-235）。
→ 因此：拖入非真實分頁、頁面無 description、或擷取失敗時，卡片描述可能保持為空。

## 自訂欄位顯示邏輯
- 顯示取決於「卡片所屬 collection 的 `defaultTemplateId`」，若該 template 有欄位才會渲染（src/app/webpages/WebpageCard.tsx:600-690）。
- 新增卡片先插入 state（category='default'），再改 collection → UI 有短暫空窗期；在此期間開啟編輯可能會看到欄位未出現（時序現象）。

## 已知問題（根因）
1) 描述有時抓不到：meta 擷取需真實 tab.id 且頁面含 description，否則不回填。
2) 自訂欄位忽隱忽現：新增卡先顯示於 default collection，再改到目標 collection，UI 短暫不同步（再加上 Templates/Categories 非同步載入）。
3) DB 有存但畫面沒顯：因 GroupsView 以 `category+subcategoryId` 篩選，若中途有一步失敗（如未成功更新 group）或 UI 尚未 `load` 完成，會看不到。
4) 偶有重複：drop 事件可能重覆觸發，或 header 與 grid 在邊界都吃到；`addWebpageFromTab` 用隨機 id，短時間內相同 URL 也能加出多筆。

## 改進方案（不影響現有功能的草案）

目標：把「新增/移動/排序」整合為單一原子操作，避免三段式時序競態；UI 以一次 `loadWebpages()` 的結果更新。

### 新增 API（草案，僅文件）
`addTabToGroup(tab, targetCategoryId, targetGroupId, beforeId?) => Promise<WebpageData>`

步驟：
1. 正常化 URL/標題，產生 id。
2. 先以目標 collection 的 template 欄位計算 `meta` 初值（同 `computeAutoMeta`），並嘗試合併已緩存的 siteName/author。
3. 一次寫入 DB：`webpages`（含 category/subcategoryId）＋更新群組內 `order.subcat.*`（若提供 `beforeId`）。
4. 回傳寫入結果；UI 再以 `loadWebpages()` 取回並渲染。
5. 若為真實 tab，背景可再做一次延後補強（描述/更多 meta），成功後再 `updateWebpage`。

UI 行為：
- 不再直接把「預設 default 的新卡」插入 state；改為顯示 skeleton（可選），待 DB 操作完成、`loadWebpages()` 回來再替換為真實卡片，以避免欄位/分類的短暫錯位。

### 去重與防抖（建議）
- 在同一次 drop session/短時間窗（例如 1-2 秒）內，對相同 URL 去重，避免重複新增。
- drop handler `stopPropagation()` 防止事件冒泡到其他區域。

### 非破壞性導入策略
- 以 feature flag/選項切換新舊流程。
- 新 API 為「加法」，舊三段式流程保留（相容）。
- 逐步把 `GroupsView` 的 drop handler 改為單一呼叫；若失敗自動 fallback 回現有三段式。

## 除錯建議
- 針對以下節點加上 debug log：
  - `addFromTab`、`updateCategory`、`updateCardSubcategory`、`reorderWebpages` 回傳結果與錯誤
  - `loadWebpages` 前後清單長度、特定 id 是否存在
  - `order.subcat.*` 在 drop 前後的內容
  - drop 事件次數、目標 beforeId 的決定流程（ghost 計算）

## 關聯檔案索引（參考）
- WebpagesProvider：src/app/webpages/WebpagesProvider.tsx:100（新增與即時插卡）、src/app/webpages/WebpagesProvider.tsx:219（更新 category → 計算/合併 meta）、src/app/webpages/WebpagesProvider.tsx:145（新增寫入）
- WebpageService：src/background/webpageService.ts:145（addWebpageFromTab）、src/background/webpageService.ts:166（updateWebpage）、src/background/webpageService.ts:211（reorderWebpages）、src/background/webpageService.ts:298（moveCardToGroup）、src/background/webpageService.ts:88（排序）
- Storage（IDB）：src/background/idb/storage.ts:515（updateCardSubcategory）
- GroupsView drop handler：src/app/groups/GroupsView.tsx:903（onDropTab）、src/app/groups/GroupsView.tsx:925（onDropExistingCard）
- Template 欄位渲染：src/app/webpages/WebpageCard.tsx:600（TemplateFields）
- 自動欄位推斷：src/app/webpages/metaAutoFill.ts:13

---

以上為現況與方案整理；未更動任何程式邏輯。後續若要採用原子 API，建議先以旗標導入並補測試案例（拖入 header vs grid、同 URL 重覆拖入、meta 擷取延後補強）。
