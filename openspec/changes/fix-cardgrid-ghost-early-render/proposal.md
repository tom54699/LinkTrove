# Change: 修正卡片拖曳時 Ghost 過早顯示

## Why
Windows 上卡片拖曳事件節奏較密集，偶發「Ghost 還在，但實體卡片提前出現」的閃爍。此現象雖不改變最終結果，但會降低拖曳過程可預期性。

## What Changes
- 拖曳開始（onDragStart）即記錄 `draggingCardId`，避免等待 `dragover` 才建立來源卡片識別
- 卡片型 ghost 僅在狀態就緒時渲染（需同時有 `draggingCardId` 與 `ghostIndex`）
- 保留既有 drop、跨群組移動與 tab 拖曳流程，不調整資料寫入邏輯

## Impact
- Affected specs: drag-drop
- Affected code: `src/app/webpages/CardGrid.tsx`
