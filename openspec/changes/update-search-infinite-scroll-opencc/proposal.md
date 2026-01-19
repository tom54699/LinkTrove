# Change: 搜尋結果自動載入與簡繁互通（OpenCC WASM）

## Why
目前搜尋結果固定上限 20 筆，超過即無法查看，且簡體/繁體互通不足，會造成使用者找不到結果。

## What Changes
- 新增搜尋結果分頁與「接近底部自動載入」機制，初始顯示 20 筆，逐步載入更多
- 導入 OpenCC WASM 進行簡繁互通搜尋（查詢字串與索引文本雙向匹配）
- 搜尋結果計數增加「已載入 / 總數」提示（仍保留總數）

## Impact
- Affected specs: `search`
- Affected code: `src/app/ui/SearchBox.tsx`, `src/utils/*`（新增搜尋工具）, `package.json`
- Breaking changes: 無
