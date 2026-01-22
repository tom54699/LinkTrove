# Change: 改進側邊欄收合體驗

## Why
原本的側邊欄收合按鈕位置在 main content 左上角，視覺上突兀且不直覺。收合時只隱藏 Collections Sidebar，Organization Rail 仍然顯示，使用者反應應該要一起收起。

## What Changes
- 收合按鈕移至 Collections Sidebar 頂部標題列
- 收起時 Organization Rail 和 Collections Sidebar 一起隱藏
- 收起後顯示一個置中的小把手（w-3）來展開
- 使用 CSS transition 實現絲滑動畫效果
- 展開時維持原本的左邊距（16px / p-4）

## Impact
- Affected code: `src/app/layout/FourColumnLayout.tsx`
- UI/UX: 更直覺的側邊欄收合操作
- No breaking changes
