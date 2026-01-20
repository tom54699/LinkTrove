## 1. Implementation

- [x] 1.1 在 `dragContext.ts` 的 `setDragWebpage()` 中添加自動廣播邏輯
  - 當 `card === null` 時，廣播 `lt:ghost-clear` 事件
  - 使用 try-catch 包裹以確保安全

- [x] 1.2 在 `CardGrid.tsx` 新增 useEffect 監聽 `lt:ghost-clear` 事件
  - 清理所有 ghost 相關狀態：`ghostTab`, `ghostType`, `ghostIndex`, `isOver`, `draggingCardId`
  - 清理 ref：`ghostBeforeRef`, `prevGiRef`
  - 取消任何待處理的 `dragLeaveTimeoutRef`

- [x] 1.3 在 `CardGrid.tsx` 的 `handleDrop` finally 中調用 `setDragWebpage(null)`
  - 關鍵修復：跨 group 拖曳時原卡片 DOM 會被移除，導致 `onDragEnd` 不會觸發
  - 必須在 `handleDrop` 完成時手動觸發全局清理

- [x] 1.4 驗證 build 成功無錯誤

## 2. Testing

- [x] 2.1 手動測試跨 Group 拖曳
  - 快速拖曳卡片從 Group A 到 Group B
  - 確認 ghost 在放下後立即消失
  - 測試多次連續跨 Group 拖曳

- [x] 2.2 測試邊界情況
  - 拖曳取消（按 Esc）
  - 拖曳到視窗外
  - 拖曳過程中快速切換目標 Group
