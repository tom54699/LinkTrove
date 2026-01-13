# Change: Layout Realignment (Stacked Panels & Flush Tabs)

## Change ID
`layout-realignment-stacked`

## Status
✅ Completed (2026-01-09)

## Summary
重構了應用程式的佈局結構，採用「堆疊面板 (Stacked Panels)」風格，並實作了右側分頁欄的「貼邊 (Flush Right)」設計。此改動提升了視覺層次感，並優化了空間利用率。

## Changes Implemented
- **Layout Structure**: 將 `FourColumnLayout` 改為 Flexbox 結構。
  - 左側與中間區塊 (Rail, Sidebar, Main) 包裹在帶有 `p-4` 的容器中，保持懸浮面板質感。
  - 右側區塊 (Tabs) 獨立於 padding 之外，實現 100vh 高度與右側貼邊效果。
- **Tabs Panel**:
  - 移除右側圓角。
  - 實作 Hover 自動展開 (70px -> 300px) 與陰影效果。
- **Component Styling**:
  - 弱化了面板邊框顏色 (`border-white/5`)，使其更融入深色背景。
  - 保留了側邊欄摺疊功能。

## Verification
- [x] 編譯成功 (npm run build)
- [x] 右側欄位上下貼齊視窗邊緣
- [x] 左側面板保持圓角與間隙