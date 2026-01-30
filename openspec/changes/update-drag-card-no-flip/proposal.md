# Change: 拖曳期間取消卡片翻轉效果

## Why
拖曳中間區塊卡片時，卡片會出現翻轉（背面顯示）現象，造成視覺干擾並降低拖曳操作的可預期性。

## What Changes
- 拖曳期間停用卡片 3D 翻轉/透視效果，保持正面顯示
- 放開拖曳後，卡片翻轉功能仍可透過既有按鈕使用

## Impact
- Affected specs: drag-drop
- Affected code: src/app/webpages/CardGrid.tsx, src/app/webpages/TobyLikeCard.tsx, src/styles/toby-like.css
