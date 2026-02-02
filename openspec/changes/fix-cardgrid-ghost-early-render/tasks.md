## 1. Implementation
- [x] 1.1 在卡片 `onDragStart` 立即設定 `draggingCardId`，避免來源卡片識別延遲
- [x] 1.2 調整 ghost 顯示條件：卡片拖曳需 `draggingCardId + ghostIndex` 就緒才渲染
- [x] 1.3 執行 `openspec validate fix-cardgrid-ghost-early-render --strict`
