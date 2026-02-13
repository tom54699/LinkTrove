# Change: 修復右側面板拖曳結束後 DropIndicator 殘留問題

## Why
右側 TabsPanel 拖曳 Tab 或 Group 結束後,有時會出現「殘留空白卡片」視覺問題。根源是 `dropTarget` state 清理時機不完整:拖曳結束時 `onDragEnd` 只清除 `dragTab/dragGroup`,但未清除 `dropTarget`,導致 DropIndicator 仍然渲染。

用戶報告此問題偶發但明顯,影響拖曳體驗流暢度與 UI 可信度。

## What Changes
- **新增本地 state**: 在 TabsPanel 新增 `dragVersion` state 用於觸發 re-render
- **渲染防護**: DropIndicator 只在拖曳進行中(`getDragTab() || getDragGroup()`)時渲染
- **清理防護**: Window 全域監聽 `dragend`/`drop` 事件(capture phase),統一清理 `dropTarget` 和 `dragVersion`
- **修改範圍**: 僅 `src/app/tabs/TabsPanel.tsx` 單一檔案,6 處渲染條件 + 1 個 useEffect

## Impact
- **Affected specs**:
  - `open-tabs-sync` - 右側面板拖曳清理機制
- **Affected code**:
  - `src/app/tabs/TabsPanel.tsx` (主要修改)
  - `src/app/dnd/dragContext.ts` (無修改,僅讀取)
- **Risk**: 🟡 低風險
  - 只修改右側內部 state,不影響中間 CardGrid
  - 不修改 dragContext 全域變數
  - 支援現有跨區拖曳(右側 Tab → 中間 CardGrid)
- **Regression**:
  - 右側 Tab/Group 排序拖曳
  - 拖到 Window 背景尾端插入
  - 拖曳取消(ESC/非有效區域)後無殘留
