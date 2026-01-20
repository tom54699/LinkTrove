# Change: 強化順序一致性與匯入/合併修復

## Why
- `orders.subcategories` 可能缺漏或過期，導致載入排序不穩定、拖放後重載順序跳動。
- 目前合併/同步採用整組 order 覆蓋，可能遺漏卡片順序資訊。
- 需要把「上次順序跳動 bug 的修正」納入正式規格，確保之後匯入/同步也不再破壞順序。

## What Changes
- 讀取時以「群組內 order 合併」組裝清單，不再用全域排序比較器。
- 匯入/合併/同步後做順序正規化（補缺、去除不存在 ID），並寫回 `orders.subcategories`。
- 合併策略改為「基準 order + 補齊缺漏」而非整組覆寫。
- 匯出時為所有群組輸出 `orders.subcategories`（含空陣列）。

## Impact
- Affected specs: `import-export`, `bookmark-management`
- Affected code: `src/background/webpageService.ts`, `src/background/idb/storage.ts`, `src/app/data/mergeService.ts`, `src/app/data/syncService.ts`
