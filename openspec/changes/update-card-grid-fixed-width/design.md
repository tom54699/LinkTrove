# Design: CardGrid 固定尺寸與最大四欄

## 目標
- 桌面：一列最多四張，卡片寬度固定（270px），高度固定（135px）
- 其他 RWD：不限制欄數，自動縮為 3/2/1 欄
- 右側 Open Tabs 區塊寬度為 280px

## 方案（推薦）
在 `CardGrid` 使用 CSS Grid 固定欄寬，並設定容器最大寬度：

```ts
const CARD_W = 270; // 固定卡片寬度
const GAP = 24;     // gap-6 = 24px
const MAX_W = (CARD_W * 4) + (GAP * 3); // 4欄 + 3間距

<div
  className="grid gap-6"
  style={{
    gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 270px))',
    maxWidth: `${MAX_W}px`,
    width: '100%',
    justifyContent: 'center'
  }}
>
```

## 行為說明
- 桌面寬度足夠時，最多 4 欄。
- 視窗變窄時，自動縮為 3/2/1 欄。
- 卡片寬高固定，不再隨容器伸縮。

## 風險與對策
- **風險**：固定寬度可能在窄螢幕造成水平捲軸。
- **對策**：若遇到低解析度裝置，再改為 `min(270px, 100%)`。
