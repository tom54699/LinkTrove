# Tasks: No-Gap Layout and Borderless Design

## Stage 1: Layout Adjustment
- [ ] 修改 `FourColumnLayout.tsx`：
  - [ ] 移除父容器的 `p-4`。
  - [ ] 移除 Grid 的 `gap-4`。
  - [ ] 將 `rounded-2xl` 調整為 `rounded-none` 或適度縮小（若區塊相連，大圓角可能會產生空隙）。

## Stage 2: Border & Edge Refinement
- [ ] 重新定義區塊邊界：
  - [ ] 移除 Org Rail 的全邊框，改為僅 `border-right`。
  - [ ] 移除 Sidebar 的全邊框，改為僅 `border-right`。
  - [ ] 移除 Main Content 的全邊框。
  - [ ] 移除 Tabs Panel 的全邊框，改為僅 `border-left`。
- [ ] 弱化邊框顏色：將 `border-[var(--border)]` 替換為更柔和的顏色 class 或直接在 CSS 變數層級調整。

## Stage 3: Internal Padding Adjustment
- [ ] 確保每個區塊（Rail, Sidebar, Main, Tabs）內部仍有適當 padding（如 `p-4` 或 `p-5`），避免內容貼齊視窗邊緣。

## Stage 4: Verification
- [ ] 確認整體佈局是否真的無縫。
- [ ] 檢查側邊欄摺疊時的動畫與邊界表現。
- [ ] 確認在 Toby Light 主題下的邊界是否依然清晰。
