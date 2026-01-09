# Spec Delta: Bookmark Management - Batch Operations

## Change ID
`add-batch-operations`

## Capability
`bookmark-management`

## Summary
為書籤管理系統增加批次操作功能，支援多選卡片後進行批次刪除、批次移動、批次開啟標籤頁。

---

## ADDED Requirements

### Requirement: 批次選擇與操作
系統必須（SHALL）支援使用者多選卡片，並提供批次刪除、批次移動、批次開啟標籤頁功能。

#### Scenario: 進入選擇模式
- **WHEN** 使用者點擊「Select」按鈕
- **THEN** 系統進入選擇模式（`selectMode = true`）
- **THEN** 所有卡片的 favicon 上方顯示 checkbox overlay
- **THEN** 按鈕文字變更為「Cancel」

#### Scenario: 多選卡片
- **GIVEN** 系統處於選擇模式
- **WHEN** 使用者點擊卡片上的 checkbox
- **THEN** 該卡片的選擇狀態切換（勾選 ↔ 未勾選）
- **THEN** 視覺上顯示勾選標記（藍色背景 + 白色勾號）
- **THEN** 系統更新選擇計數（`selectedCount`）

#### Scenario: 顯示批次操作工具列
- **GIVEN** 系統處於選擇模式
- **GIVEN** 至少選中 1 張卡片（`selectedCount > 0`）
- **WHEN** 系統渲染 UI
- **THEN** 畫面底部居中顯示浮動工具列
- **THEN** 工具列包含以下元素：
  - 選擇計數文字：「(N tabs selected)」
  - MOVE 按鈕（含資料夾圖示）
  - Open tabs 按鈕（含外部連結圖示）
  - DELETE 按鈕（含垃圾桶圖示）
  - 關閉按鈕 ✕

#### Scenario: 退出選擇模式
- **GIVEN** 系統處於選擇模式
- **WHEN** 使用者點擊「Cancel」按鈕或工具列的 ✕ 按鈕
- **THEN** 系統清空所有選擇（`selected = {}`）
- **THEN** 系統退出選擇模式（`selectMode = false`）
- **THEN** 工具列隱藏
- **THEN** 卡片恢復正常顯示（checkbox 隱藏）

---

### Requirement: 批次開啟標籤頁
系統必須（SHALL）支援一鍵開啟所有選中卡片的網頁到新標籤頁。

#### Scenario: 批次開啟少量標籤頁
- **GIVEN** 使用者選中 3 張卡片（URL 分別為 A, B, C）
- **WHEN** 使用者點擊「Open tabs」按鈕
- **THEN** 系統使用 `window.open(url, '_blank')` 開啟 3 個新標籤頁
- **THEN** 新標籤頁依序載入網頁 A, B, C
- **THEN** 系統清空選擇並退出選擇模式
- **THEN** 顯示成功提示（可選）

#### Scenario: 開啟標籤頁失敗處理
- **GIVEN** 使用者選中 2 張卡片
- **WHEN** 系統嘗試開啟標籤頁但被瀏覽器阻擋（彈窗攔截器）
- **THEN** 系統捕捉錯誤並顯示 toast 提示：「Failed to open tabs」
- **THEN** 系統仍清空選擇並退出選擇模式

---

### Requirement: 批次移動卡片
系統必須（SHALL）支援將選中的卡片批次移動到指定的組織和分類。

#### Scenario: 開啟批次移動對話框
- **GIVEN** 使用者選中 3 張卡片
- **WHEN** 使用者點擊「MOVE」按鈕
- **THEN** 系統顯示「Move N Cards to」對話框（N 為選中數量）
- **THEN** 對話框包含：
  - Space 下拉選單（顯示所有組織）
  - Collection 下拉選單（顯示選中組織的所有分類）
  - Cancel 按鈕
  - Move 按鈕

#### Scenario: 選擇目標組織和分類
- **GIVEN** 批次移動對話框已開啟
- **WHEN** 使用者在 Space 下拉選單選擇組織 A
- **THEN** Collection 下拉選單更新為組織 A 的所有分類
- **WHEN** 使用者在 Collection 下拉選單選擇分類 B
- **THEN** Move 按鈕啟用（可點擊）

#### Scenario: 執行批次移動
- **GIVEN** 使用者選中 3 張卡片（ID: card1, card2, card3）
- **GIVEN** 使用者選擇目標分類為 C
- **WHEN** 使用者點擊「Move」按鈕
- **THEN** 系統迭代呼叫 `onUpdateCategory(cardId, targetCategoryId)` 更新每張卡片
- **THEN** 系統更新 IndexedDB 中這 3 張卡片的 `category` 和 `subcategoryId` 欄位
- **THEN** 系統關閉對話框
- **THEN** 系統清空選擇並退出選擇模式
- **THEN** 系統重新載入資料（視圖刷新）
- **THEN** 顯示成功提示：「已移動 3 張卡片」

#### Scenario: 移動到目標分類的群組選擇
- **GIVEN** 目標分類包含多個群組（Group A, Group B）
- **WHEN** 系統執行批次移動
- **THEN** 系統將所有選中的卡片移動到該分類的第一個群組
- **THEN** 卡片的 `subcategoryId` 設為該群組的 ID
- **THEN** 卡片保持原有的相對順序（在新群組的末尾）

#### Scenario: 批次開啟大量標籤頁警告
- **GIVEN** 使用者選中超過 10 張卡片
- **WHEN** 使用者點擊「Open tabs」按鈕
- **THEN** 系統顯示確認對話框：「確定要開啟 N 個標籤頁嗎？」
- **THEN** 對話框包含 Cancel 和 Confirm 按鈕
- **WHEN** 使用者點擊 Confirm
- **THEN** 系統開啟所有標籤頁
- **WHEN** 使用者點擊 Cancel
- **THEN** 系統取消操作，不開啟任何標籤頁

#### Scenario: 取消批次移動
- **GIVEN** 批次移動對話框已開啟
- **WHEN** 使用者點擊「Cancel」按鈕或 ESC 鍵或點擊對話框外部
- **THEN** 系統關閉對話框
- **THEN** 不執行任何移動操作
- **THEN** 選擇狀態保持不變（仍在選擇模式）

---

### Requirement: 批次刪除卡片
系統必須（SHALL）支援批次刪除選中的卡片，並提供確認機制防止誤刪。

#### Scenario: 批次刪除確認
- **GIVEN** 使用者選中 5 張卡片
- **WHEN** 使用者點擊「DELETE」按鈕
- **THEN** 系統顯示確認對話框
- **THEN** 對話框標題為「Confirm Delete Selected」
- **THEN** 對話框包含 Cancel 和 Delete 按鈕

#### Scenario: 執行批次刪除
- **GIVEN** 使用者選中 5 張卡片（ID: card1, card2, card3, card4, card5）
- **GIVEN** 確認對話框已顯示
- **WHEN** 使用者點擊「Delete」按鈕
- **THEN** 系統呼叫 `onDeleteMany([card1, card2, card3, card4, card5])`
- **THEN** 系統從 IndexedDB 的 `webpages` store 刪除這 5 筆記錄
- **THEN** 系統從對應群組的順序陣列中移除這 5 張卡片的 ID
- **THEN** 系統更新順序資訊到 `meta` store
- **THEN** 系統關閉確認對話框
- **THEN** 系統清空選擇並退出選擇模式
- **THEN** 系統重新載入資料（視圖刷新）
- **THEN** 顯示成功提示：「已刪除 5 張卡片」

#### Scenario: 取消批次刪除
- **GIVEN** 確認對話框已顯示
- **WHEN** 使用者點擊「Cancel」按鈕
- **THEN** 系統關閉確認對話框
- **THEN** 不執行任何刪除操作
- **THEN** 選擇狀態保持不變（仍在選擇模式，卡片仍被選中）

---

## MODIFIED Requirements

### Requirement: 卡片順序保存（修改）
系統必須（SHALL）為每個 Subcategory（群組）獨立保存 Webpages（卡片）的顯示順序，包括批次操作後的順序更新。

#### Scenario: 批次移動後更新順序
- **GIVEN** 群組 A 的卡片順序為 [card1, card2, card3, card4, card5]
- **GIVEN** 使用者選中 card2 和 card4
- **WHEN** 使用者將這 2 張卡片批次移動到群組 B
- **THEN** 群組 A 的順序更新為 [card1, card3, card5]
- **THEN** 群組 B 的順序在末尾新增 [card2, card4]
- **THEN** 兩個群組的順序資訊都更新到 IndexedDB

#### Scenario: 批次刪除後更新順序
- **GIVEN** 群組 A 的卡片順序為 [card1, card2, card3, card4, card5]
- **GIVEN** 使用者選中 card2 和 card4
- **WHEN** 使用者批次刪除這 2 張卡片
- **THEN** 群組 A 的順序更新為 [card1, card3, card5]
- **THEN** 順序資訊立即更新到 IndexedDB

---

## Related Changes
- **新增組件**: `MoveSelectedDialog.tsx` - 批次移動對話框
- **修改組件**: `CardGrid.tsx` - 新增浮動工具列和批次操作邏輯
- **影響 Spec**: `bookmark-management` - 新增批次操作需求

## Implementation Notes
1. **狀態管理**: 在 `CardGrid` 內部管理 `selectMode` 和 `selected` 狀態
2. **Props 傳遞**: 確保 `onUpdateCategory` 和 `onDeleteMany` 正確傳遞給 `CardGrid`
3. **錯誤處理**: 所有批次操作都需要錯誤捕捉和 toast 提示
4. **效能考量**: 批次操作使用迭代呼叫，大量卡片（100+）時可能需要優化為單次批次 API 呼叫
