# Change: Sync Native Tab Group Collapse State & Reordering

## Why
1. **Collapse Sync**: 當使用者在 LinkTrove 的 Open Tabs 側邊欄收合/展開原生分頁群組時，瀏覽器的分頁群組狀態並不會同步改變。這導致使用者在 LinkTrove 和瀏覽器之間看到不一致的狀態，造成困惑和不良的使用體驗。
2. **Reordering**: 目前側邊欄無法調整分頁或群組的順序。使用者期望能像在瀏覽器上方標籤列一樣，直接在 LinkTrove 側邊欄拖曳分頁與群組來重新排序，並即時反映到瀏覽器實際狀態。

## What Changes
- **Collapse Sync**:
  - 在 TabsPanel 中，當使用者點擊群組標題收合/展開群組時，同步呼叫 `chrome.tabGroups.update()` 更新瀏覽器的原生群組狀態。
  - 確保 UI 狀態（local state）和瀏覽器狀態（native state）保持一致。
  
- **Drag & Drop Reordering**:
  - 實作 Native HTML5 Drag & Drop 在 `TabsPanel` 側邊欄。
  - 支援 **Tab 拖曳**：
    - 在同一群組內排序。
    - 跨群組移動（從 Group A 移到 Group B）。
    - 從群組移出成為獨立分頁。
    - 從獨立分頁移入群組。
    - 跨視窗移動（如果技術可行且 UI 支援）。
  - 支援 **Group 拖曳**：
    - 調整群組在視窗中的順序。
  - 使用 `chrome.tabs.move`, `chrome.tabs.group`, `chrome.tabs.ungroup`, `chrome.tabGroups.move` API 實作實際變更。

## Impact
- Affected specs: `open-tabs-sync`
- Affected code:
  - `src/app/tabs/TabsPanel.tsx` - 新增收合同步邏輯與 DnD 事件處理
  - `src/app/tabs/TabItem.tsx` - 支援 draggable
  - `src/app/dnd/dragContext.ts` - 可能需要擴充以支援 Tab/Group 拖曳狀態