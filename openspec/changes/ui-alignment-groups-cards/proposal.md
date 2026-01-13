# Change: UI Alignment for Groups and Cards

## Change ID
`ui-alignment-groups-cards`

## Status
✅ Completed (2026-01-13)

## Summary
全面更新了主內容區域的視覺樣式以對齊 "01 - Stacked Panels" Mockup，並修復了因佈局變更導致的拖曳排序 (DnD) 問題。

## Changes Implemented

### 1. WebpageCard (TobyLikeCard)
- **視覺樣式**:
  - 固定高度 140px，寬度固定 320px (Grid 控制)。
  - 內部排版：Icon/Title/URL (Top) + Description (Bottom)。
  - 字體優化：標題不加粗 (Medium)，描述文字加大至 13px。
  - 按鈕樣式：恢復原專案的懸浮泡泡風格 (Delete 右上，Edit/Move 右下)。
  - Favicon 背景：使用 `bg-[var(--accent)]/20` 增加品牌感。
- **互動邏輯**:
  - **Portal Modal**: 編輯視窗改用 `createPortal` 渲染至 Body，解決被裁切與定位問題。
  - **Checkbox**: 僅在 Hover 或 Selected 狀態下顯示。

### 2. GroupsView
- **Header**: 實作 Mockup 01 風格標題列（摺疊箭頭、計數徽章）。
- **Actions**: 重構為橫向工具列，包含 "OPEN TABS" 與 "Settings" 按鈕，使用 Toby Pink 主色。
- **Create Button**: 底部新增虛線框 "Create New Group" 按鈕。
- **DnD Fix**: 修正 `onDropExistingCard` 邏輯，跨群組移動時先 `moveToEnd` 確保資料一致性再 `reorder`。

### 3. CardGrid (Critical DnD Fix)
- **Layout**: 使用 `repeat(auto-fill, 320px)` 固定寬度 Grid，解決寬螢幕拉伸問題。
- **Ghost Calculation**: **還原回 Row-based 算法** (from commit 3cdb389)，並增加 tolerance 至 16px。這解決了 Nearest Neighbor 在 Grid 換行時的抖動問題。
- **Drop Logic**: **還原回 DOM-based 查找**，在 Drop 瞬間直接尋找 Ghost 的鄰居元素 ID，確保「所見即所得」。
- **DOM Marker**: 加回 `.toby-card-flex` class 作為選擇器錨點。

## Verification
- [x] 卡片樣式符合 Mockup 01。
- [x] 編輯彈窗顯示正常。
- [x] 同群組拖曳排序穩定。
- [x] 跨群組拖曳移動準確。
- [x] 刪除群組無跳動 (Optimistic UI)。