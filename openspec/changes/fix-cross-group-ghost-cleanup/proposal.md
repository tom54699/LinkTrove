# Change: 修復跨 Group 拖曳時 Ghost 殘留問題

## Why

跨 Group 拖曳卡片並儲存後，ghost（拖曳預覽元素）有時候不會消失。這個問題通常發生在跨 group 拖移的情況。

### 問題根因

經過 debug log 分析，發現**真正的問題是 `onDragEnd` 事件不會被觸發**：

1. 卡片 A 在 Group A 開始拖曳
2. 卡片 A 被 drop 到 Group B
3. `moveCardToGroup` 執行，將卡片從 Group A 移動到 Group B
4. **React 重新渲染，Group A 中卡片 A 的 DOM 元素被移除**
5. 瀏覽器嘗試在已刪除的 DOM 元素上觸發 `onDragEnd`
6. **`onDragEnd` 不會觸發** → `setDragWebpage(null)` 不會執行 → ghost 狀態不會清理

### 重現步驟

1. 快速從 Group A 拖曳卡片到 Group B
2. 在 Group B 放下卡片
3. 由於 `onDragEnd` 沒觸發，ghost 殘留在畫面上

## What Changes

### 1. dragContext.ts
- 修改 `setDragWebpage(null)` 時自動廣播 `lt:ghost-clear` 事件
- 當拖曳狀態被清除時，通知所有 CardGrid 實例

### 2. CardGrid.tsx
- 新增 useEffect 監聽 `lt:ghost-clear` 事件，清理所有 ghost 相關狀態
- **關鍵修復**：在 `handleDrop` 的 finally 塊中直接調用 `setDragWebpage(null)`
  - 這確保無論 `onDragEnd` 是否觸發，ghost 都會被清理

### 修復策略

採用雙重保險機制：

| 場景 | 觸發點 | 清理機制 |
|------|--------|----------|
| 跨 Group 拖曳 | `handleDrop` finally | `setDragWebpage(null)` → 廣播 `lt:ghost-clear` |
| 同 Group 內排序 | `handleDrop` finally + `onDragEnd` | 雙重清理 |
| 按 Esc 取消 | `onDragEnd` | `setDragWebpage(null)` → 廣播 `lt:ghost-clear` |
| 拖到視窗外 | `onDragEnd` | `setDragWebpage(null)` → 廣播 `lt:ghost-clear` |

## Impact

- **Affected specs**: `drag-drop`
- **Affected code**:
  - `src/app/dnd/dragContext.ts` - 新增廣播邏輯（+5 行）
  - `src/app/webpages/CardGrid.tsx` - 新增事件監聽 + handleDrop 修復（+20 行）
- **風險評估**:
  - Tab → Card 拖曳：不影響（TabItem 使用獨立的 `setDragTab`）
  - Card 同 Group 排序：不影響
  - Card 跨 Group 移動：修復目標 ✅
  - Category 排序：不影響（獨立系統）
  - 檔案拖放還原：不影響（不使用 ghost 系統）
