# Change: 主頁卡片固定尺寸 + 桌面最多四欄

## Why
目前主頁卡片排列採用 `minmax(240px, 1fr)`，實際寬度會隨容器伸縮，導致卡片寬度不可預期。使用者需求為：桌面顯示最多四張、卡片寬度固定（270px），並維持固定比例高度；右側 Open Tabs 區塊寬度調整為 280px 以利四欄排列。

## What Changes
- 主頁卡片格線改為「固定卡寬 + 最大四欄」的版面規則，卡片寬度固定為 270px。
- 卡片高度固定為 135px，維持寬高比例一致（270:135）。
- 右側 Open Tabs 區塊展開/釘選寬度改為 280px。
- 不影響拖放或資料邏輯（僅視覺排列調整）。

## Impact
- Affected specs: `specs/bookmark-management/spec.md`
- Affected code:
  - `src/app/webpages/CardGrid.tsx`（卡片格線配置）
  - `src/app/webpages/TobyLikeCard.tsx`（卡片高度）
  - `src/app/layout/FourColumnLayout.tsx`（右側區塊寬度）
  - `src/styles/toby.css`（如需補充/移除舊規則，視實作而定）
- Risks: 固定寬度過大時，窄螢幕可能出現水平捲軸（視實際最小視窗寬度而定）。
