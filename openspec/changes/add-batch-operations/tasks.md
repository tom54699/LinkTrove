# Implementation Tasks: Add Batch Operations

## Change ID
`add-batch-operations`

## Overview
實作批次操作功能，包含多選、批次刪除、批次移動、批次開啟標籤頁。

## Prerequisites
- [x] Proposal approved
- [x] Design reviewed
- [x] Spec deltas validated

## Tasks

### Phase 1: UI Components

#### Task 1.1: 增強 CardGrid 浮動工具列
- [x] 在 `CardGrid.tsx` 中新增浮動工具列 JSX（當 `selectedCount > 0` 時顯示）
- [x] 工具列顯示選擇計數：`({selectedCount} tabs selected)`
- [x] 新增三個操作按鈕：MOVE、Open tabs、DELETE
- [x] 新增關閉按鈕（✕）退出選擇模式
- [x] **改進**：移除 Select/Cancel 按鈕，改為 hover 顯示 checkbox（更直覺）
- [x] 添加 `showMoveDialog` 狀態控制移動對話框顯示

**Validation**:
- 進入選擇模式且選中卡片後，工具列出現在底部居中
- 工具列顯示正確的選擇數量
- 點擊 ✕ 按鈕可退出選擇模式並清空選擇

**Files**: `src/app/webpages/CardGrid.tsx`

---

#### Task 1.2: 創建 MoveSelectedDialog 組件
- [x] 創建 `src/app/webpages/MoveSelectedDialog.tsx` 檔案
- [x] 實作對話框基礎結構（Modal overlay + content）
- [x] **修正**：新增 Collection 下拉選單（載入 categories 列表）
- [x] **修正**：新增 Group 下拉選單（根據選中的 Collection 動態載入 subcategories）
- [x] 新增 Cancel 和 Move 按鈕
- [x] 實作關閉邏輯（ESC 鍵、點擊外部、Cancel 按鈕）

**Validation**:
- 對話框正確顯示在畫面中央
- Space 下拉選單顯示所有組織
- 選擇 Space 後，Collection 下拉選單更新為該組織的分類
- 點擊 Cancel 或 ESC 可關閉對話框

**Files**: `src/app/webpages/MoveSelectedDialog.tsx` (新檔案)

---

### Phase 2: Batch Operations Logic

#### Task 2.1: 實作批次開啟標籤頁
- [x] 在 `CardGrid.tsx` 新增 `handleOpenTabs` 函數
- [x] 迭代 `selected` 記錄，取得選中的卡片 ID 列表
- [x] 從 `items` 中過濾出選中的卡片
- [x] 使用 `window.open(url, '_blank')` 開啟每張卡片的 URL
- [x] **新增**：超過 10 張卡片時顯示確認對話框
- [x] 操作完成後清空選擇
- [x] 新增錯誤處理（若開啟失敗顯示 toast 提示）

**Validation**:
- 選中 3 張卡片，點擊 Open tabs → 開啟 3 個新標籤頁
- 操作完成後自動退出選擇模式
- 若開啟失敗顯示錯誤提示

**Files**: `src/app/webpages/CardGrid.tsx`

---

#### Task 2.2: 實作批次移動功能
- [x] 在 `CardGrid.tsx` 新增 `handleBatchMove` 函數，接收 `(categoryId, subcategoryId)` 參數
- [x] 取得選中的卡片 ID 列表
- [x] **修正**：使用兩步驟更新 - `onUpdateCategory()` + `svc.updateCardSubcategory()`
- [x] 使用 `Promise.all` 等待所有更新完成
- [x] 操作完成後關閉對話框、清空選擇
- [x] 新增成功/失敗 toast 提示
- [x] 將 `handleBatchMove` 傳遞給 `MoveSelectedDialog`

**Validation**:
- 選中 3 張卡片 → 開啟 Move 對話框 → 選擇目標 Space/Collection → 點擊 Move
- 3 張卡片移動到目標分類，並出現在該分類的卡片列表中
- IndexedDB 的 `category` 和 `subcategoryId` 欄位正確更新
- 顯示成功提示「已移動 3 張卡片」

**Files**: `src/app/webpages/CardGrid.tsx`, `src/app/webpages/MoveSelectedDialog.tsx`

---

#### Task 2.3: 確保批次刪除功能完整
- [x] 驗證現有的批次刪除邏輯（`onDeleteMany`）可正常運作
- [x] 確認刪除確認對話框顯示選擇數量（「Confirm Delete Selected」）
- [x] 確認操作完成後清空選擇
- [x] 新增成功 toast 提示「已刪除 N 張卡片」

**Validation**:
- 選中 3 張卡片 → 點擊 DELETE → 確認對話框顯示
- 點擊 Delete → 3 張卡片從列表和 IndexedDB 中刪除
- 顯示成功提示

**Files**: `src/app/webpages/CardGrid.tsx`

---

### Phase 3: Styling

#### Task 3.1: 浮動工具列樣式
- [x] 確保工具列固定在畫面底部居中（`fixed bottom-6 left-1/2 transform -translate-x-1/2`）
- [x] 設定適當的 z-index（確保不被其他元素遮蓋）
- [x] 使用 `bg-[var(--panel)]` 和 `border-slate-700` 保持一致性
- [x] 新增 shadow 效果（`shadow-2xl`）提升視覺層次
- [x] 按鈕間距和 padding 調整為舒適的點擊區域
- [x] 按鈕 hover 效果（`hover:bg-slate-800`）

**Validation**:
- 工具列在各種螢幕尺寸下都居中顯示
- 工具列不被其他元素遮蓋
- 按鈕 hover 效果流暢

**Files**: `src/app/webpages/CardGrid.tsx`

---

#### Task 3.2: MoveSelectedDialog 樣式
- [x] 對話框背景遮罩（`bg-black/60`）
- [x] 對話框主體樣式（圓角、邊框、padding）
- [x] 下拉選單樣式（與現有 UI 一致）
- [x] 按鈕樣式（Cancel 和 Move 按鈕區分）
- [x] 響應式設計（小螢幕適配）

**Validation**:
- 對話框視覺效果與現有 UI 風格一致
- 在小螢幕上不會超出畫面
- 按鈕清晰可辨

**Files**: `src/app/webpages/MoveSelectedDialog.tsx`

---

### Phase 4: Integration & Testing

#### Task 4.1: GroupsView 整合
- [x] 確認 `CardGrid` 的 props 傳遞完整（`onUpdateCategory`, `onDeleteMany`）
- [x] 測試在 GroupsView 中使用批次操作的完整流程
- [x] 確認操作後資料重新載入（`actions.load()`）

**Validation**:
- 在 GroupsView 中進行批次操作，資料正確更新
- 操作完成後視圖自動刷新

**Files**: `src/app/groups/GroupsView.tsx`, `src/app/webpages/CardGrid.tsx`

---

#### Task 4.2: 測試批次操作完整流程
- [x] **測試場景 1**：多選 3 張卡片 → 批次移動到另一分類 → 驗證位置正確
- [x] **測試場景 2**：多選 5 張卡片 → 批次刪除 → 驗證 IndexedDB 已刪除
- [x] **測試場景 3**：多選 2 張卡片 → Open tabs → 驗證開啟 2 個新標籤頁
- [x] **測試場景 4**：Hover 顯示 checkbox → 選卡片 → 清除選擇流暢
- [x] **測試場景 5**：工具列顯示/隱藏正確（0 張選中時不顯示）
- [x] **測試場景 6**：對話框操作流暢（開啟 → 選擇 → 取消/確認）
- [x] **使用者確認**：功能測試完成並通過

**Validation**:
- 所有測試場景通過
- 無錯誤或警告訊息
- 使用者體驗流暢

**Files**: 手動測試（載入擴充功能後在新分頁測試）

---

### Phase 5: Documentation

#### Task 5.1: 更新專案文檔
- [x] 更新 `CLAUDE.md` 的 Common Tasks 區塊，新增批次操作說明
- [x] 更新 `docs/meta/SESSION_HANDOFF.md` 記錄本次變更
- [x] 新增 OpenSpec 提案文檔到 `openspec/changes/add-batch-operations/`

**Validation**:
- 文檔清晰描述批次操作功能
- 後續開發者可根據文檔理解功能

**Files**: `CLAUDE.md`, `docs/meta/SESSION_HANDOFF.md`, `docs/architecture/component-map.md`

---

## Completion Checklist
- [x] All tasks marked as complete
- [x] All validation criteria passed
- [x] Manual testing completed (at least 3 scenarios)
- [x] User confirmed testing passed
- [x] Documentation updated
- [x] No regressions in existing functionality
- [x] Code follows project conventions (ESLint, Prettier)
- [x] Build successful with no errors

## Notes
- 實作順序：UI → Logic → Styling → Testing → Documentation
- 每個 Phase 完成後進行基礎測試
- 遇到技術問題隨時記錄到 Open Questions
