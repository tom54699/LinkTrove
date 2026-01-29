# Implementation Tasks

## 1. 版面調整
- [x] 1.1 在 `src/app/webpages/CardGrid.tsx` 套用固定欄寬（270px）+ 最大四欄的 grid 規則
- [x] 1.2 在 `src/app/webpages/TobyLikeCard.tsx` 套用固定高度（135px）
- [x] 1.3 右側 Open Tabs 展開/釘選寬度調整為 280px

## 2. 手動測試
- [ ] 2.1 桌面寬度：一列最多四張卡、卡片寬度固定 270px
- [ ] 2.2 右側 Open Tabs 打開時：仍可維持一列最多四張
- [ ] 2.3 縮小視窗：自動變成 3/2/1 欄（若裝置寬度足夠）
- [ ] 2.4 拖放卡片：拖曳儲存與排序正常

## 3. 規格更新
- [x] 3.1 更新 `specs/bookmark-management/spec.md`
- [x] 3.2 `openspec validate update-card-grid-fixed-width --strict`
