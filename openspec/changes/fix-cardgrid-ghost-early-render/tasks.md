## 1. Implementation
- [x] 1.1 在卡片 `onDragStart` 立即設定 `draggingCardId`，避免來源卡片識別延遲
- [x] 1.2 調整 ghost 顯示條件：卡片拖曳需 `draggingCardId + ghostIndex` 就緒才渲染
- [x] 1.3 移除 `onDragStart` 的 ghost active 廣播，避免拖曳來源被設為 `pointer-events: none`
- [x] 1.4 執行 `openspec validate fix-cardgrid-ghost-early-render --strict`
