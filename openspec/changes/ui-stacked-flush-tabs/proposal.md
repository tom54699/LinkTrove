# Proposal: Stacked Panels with Flush Right Tabs

## Change ID
`ui-stacked-flush-tabs`

## Status
Proposed

## Summary
將 Layout 調整為「堆疊面板」風格（參考 Mockup 01），保留區塊間的間隙與圓角。特別的是，最右側的分頁欄 (Tabs Panel) 將貼齊視窗邊緣，並實作自動縮放效果。同時大幅弱化邊框視覺感。

## Motivation
全貼合佈局 (No-gap) 視覺效果不佳。使用者希望回歸 01 號 Mockup 的層次感，但要求右側分頁欄必須貼邊。此外，目前的邊框顏色過亮 (白線感)，需要調整為更細緻的深色邊界。

## Scope
- **FourColumnLayout.tsx**:
  - 恢復外層容器 `p-4` (右側設為 `pr-0`)。
  - 恢復 Grid 的 `gap-4`。
  - 前三個區塊（Rail, Sidebar, Main）使用 `rounded-2xl` 與細邊框。
  - 右側區塊（Tabs）貼邊，使用 `rounded-l-2xl`（右側無圓角）。
- **Visual Style**:
  - 將邊框顏色改為 `border-white/5` 或 `border-slate-800`，移除高對比白線。

## References
- Mockup: `mockups/index.html` (01 - Stacked Panels)