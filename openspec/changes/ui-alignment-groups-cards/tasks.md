# Tasks: UI Alignment for Groups and Cards

## Stage 1: GroupsView (Container & Header)
- [ ] 修改 `src/app/groups/GroupsView.tsx`：
  - [ ] 實作 Mockup 01 風格的群組容器（Border, Radius）。
  - [ ] 更新標題列 (Header)：整合摺疊按鈕、標題輸入框、計數器。
  - [ ] **Critical**: 確保標題列的 Drag Handle 功能保留，不影響群組排序。
  - [ ] 在 `groups.map` 之後新增 "Create New Group" 虛線按鈕。

## Stage 2: Card Layout & Dimensions
- [ ] 修改 `src/app/webpages/TobyLikeCard.tsx`：
  - [ ] 設定固定高度 (140px) 與 Flex Column 佈局。
  - [ ] 實作 Top/Bottom 分區排版。
  - [ ] **Critical**: 驗證 `draggable` 屬性與 `onDragStart` 事件是否在根元素上正確運作。

## Stage 3: Card Interactions (Hover & Select)
- [ ] 修改 `src/app/webpages/TobyLikeCard.tsx`：
  - [ ] 實作 Hover 選單：包含 `Edit` 和 `Delete` 按鈕。
  - [ ] 整合 `Checkbox` (選取模式)：確保它在 Hover 或 Select Mode 下能正確顯示，且不被選單遮擋。
  - [ ] 調整樣式：確保文字截斷 (Truncate/Line-clamp) 符合 Mockup 01。

## Stage 4: Verification
- [ ] **Test**: 拖曳卡片以改變順序 (Reorder)。
- [ ] **Test**: 拖曳卡片跨群組移動 (Move)。
- [ ] **Test**: 點擊卡片勾選框進行多選。
- [ ] **Test**: 點擊 Edit/Delete 按鈕確認功能正常。
