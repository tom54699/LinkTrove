# Change: 修復 Hooks 依賴警告（維持現有行為）

## Why
目前多個 Hooks 依賴警告會遮蔽真正重要的問題；但直接補依賴可能改變行為，需採用最小風險的修法。

## What Changes
- 使用 ref/穩定 callback 的方式修正 Hooks 依賴，避免重連或重載。
- 保留既有行為：不因 selectedId 變化而重載 DB；OpenTabs 不重連 port。

## Impact
- Affected specs: code-quality
- Affected code: src/app/sidebar/categories.tsx, src/app/tabs/OpenTabsProvider.tsx, src/app/templates/TemplatesProvider.tsx, src/app/webpages/WebpagesProvider.tsx
