# 卡片拖曳儲存與顯示資料流（現況與改進方案）

> ⚠️ **重要提醒：** 本文檔撰寫於 GroupsView.tsx 重構前（2026-01-06 之前）。文檔中引用的行號已過期，實際程式碼已重新組織：
> - GroupsView.tsx 已從 1,622 行重構為 468 行（-71%）
> - 分享功能已提取至 `src/app/groups/share/`
> - 匯入功能已提取至 `src/app/groups/import/`
> - 文檔中的行號僅供參考，請以最新程式碼為準
> - 詳見 [REFACTORING_SUMMARY.md](../meta/REFACTORING_SUMMARY.md)

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
1. `actions.addFromTab(tab)` 建卡（category 預設為「預設 collection」，`note=''`），並先行插入 UI state 以提升回饋（src/app/webpages/WebpagesProvider.tsx:100, 145, 161）。
2. `actions.updateCategory(id, group.categoryId)`：
   - 依目標 collection 的 template 欄位計算 `meta` 預設值（`computeAutoMeta`），並嘗試合併 cache 的常見欄位（siteName/author）（src/app/webpages/WebpagesProvider.tsx:219 之後）。
3. `(storage as any).updateCardSubcategory(id, group.id)`：設定 `subcategoryId` 並維護群組內順序（src/background/idb/storage.ts:515）。
4. `actions.load()` 重新載入顯示（src/app/groups/GroupsView.tsx:916）。
5. 若為真實 Chrome 分頁（有 tab.id），背景會等待分頁完成並萃取 meta，若 `note` 仍為空會以 `meta.description` 回填（src/app/webpages/WebpagesProvider.tsx:104-160）。

> 註：自 2025-09 起，已移除「拖到 Sidebar 的 Collection」以新增/移動卡片的功能；僅保留「拖曳類別以重新排序」。新卡片的拖放入口統一集中於各 Group 的內容區 CardGrid。

### B) 拖到群組內的卡片格網（建立新卡 / 移動既有卡片）
- **Drop 新分頁**：`CardGrid` 計算 `beforeId` → `GroupsView` 呼叫 `actions.addFromTab(tab, { categoryId, subcategoryId, beforeId })` → `webpageService.addWebpageFromTab` 一步寫入 `category/subcategoryId/order` → 重新載入列表顯示（避免先塞預設 collection 再改）。
- **Drop 既有卡片**：`CardGrid` 計算 `beforeId` → `GroupsView` 呼叫 `actions.moveCardToGroup(cardId, categoryId, groupId, beforeId)` → `webpageService.moveCardToGroup` 原子更新 `category/subcategoryId/order`。
- **效能補強**：`WebpagesProvider` 的 `operationLockRef` 會在 drop 期間短暫鎖定，避免 `chrome.storage.onChanged` 觸發重複 `load()`（減少冗餘重渲染）。

## 描述（description/note）來源邏輯
- `note` 初值為空字串（`addWebpageFromTab`）。
- 僅在「可取得 tab.id 且頁面 meta 有 description」時，於背景補填 `note`（`pageMeta`）。
- 若 tab 被 Chrome 休眠（discarded），會以 `chrome.tabs.reload()` 背景喚醒後再嘗試擷取（不切換焦點）。
- `updateCategory` 不會把 `description` 寫入 `note`，只更新 `meta`（並刻意排除 `title/description` 兩個 key）。
→ 因此：拖入非真實分頁、頁面無 description、或擷取失敗時，卡片描述仍可能保持為空。

## 自訂欄位顯示邏輯
- 顯示取決於「卡片所屬 collection 的 `defaultTemplateId`」，若該 template 有欄位才會渲染。
- **當從 Group 內 drop 新分頁**：已改為一步寫入目標 `category/subcategoryId`，減少「先塞預設 collection 再改」的短暫空窗。
- **其他新增流程**（未指定 group）仍可能先以預設 collection 插入，再更新 collection；在此期間開啟編輯可能會看到欄位未出現（時序現象）。

## 已知問題（根因）
1) 描述有時抓不到：meta 擷取需真實 tab.id 且頁面含 description；已補強休眠分頁 reload，但仍可能因頁面無 meta 或權限限制而空白。
2) 自訂欄位忽隱忽現：**僅在「非 group drop」新增流程**仍會先插入預設 collection，再改到目標 collection（加上 Templates/Categories 非同步載入）。
3) DB 有存但畫面沒顯：目前 drop 已改為原子更新 + 操作鎖定，**機率降低**；但若更新失敗或 `load` 尚未完成仍可能短暫看不到。
4) 偶有重複：drop 已加上 `stopPropagation()` 與 ghost 清理，**機率降低**；同 URL 仍可能在**短時間窗之外**重複新增（目前有 1 秒內去重）。

## 改進方案（現況與待補）

### 已落地的改進（摘要）
- `addFromTab(tab, { categoryId, subcategoryId, beforeId })` 已支援一步建立 + 設定 group + 排序（取代先塞預設 collection 再改的流程）。
- `actions.moveCardToGroup` 與 `webpageService.moveCardToGroup` 原子更新跨群組移動與排序。
- `operationLockRef` 降低 drop 期間的重複 `load()`，減少冗餘重渲染。
- drop handler 已加 `stopPropagation()` 與 ghost 清理，避免重覆觸發。

### 仍待補的項目
- 同 URL 的去重範圍擴充（目前僅 1 秒內去重）。
- 更完整的拖放批次操作與撤銷機制。
- 非 group 新增流程的欄位短暫錯位（可用 skeleton 或延後渲染策略）。

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
