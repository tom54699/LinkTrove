# Change: 儲存分頁後自動關閉分頁功能

## Why
使用者從 Open Tabs 拖曳分頁到卡片區儲存後，通常希望該分頁能自動關閉以保持瀏覽器整潔。目前儲存後分頁仍保持開啟，造成使用者需要手動關閉的額外操作。

## What Changes
- 新增「儲存後自動關閉分頁」設定開關（預設關閉）
- 修改 drag-drop 儲存流程，在設定啟用時自動關閉來源分頁
- 優化 meta enrichment 順序：先提取 meta 資料，再關閉分頁
- 處理邊界情況：最後一個分頁不關閉（Chrome 限制）

## Impact
- Affected specs: `drag-drop`, `settings`
- Affected code:
  - `src/app/groups/GroupsView.tsx` - onDropTab 回調
  - `src/app/webpages/WebpagesProvider.tsx` - addFromTab 函數
  - `src/app/settings/` - 設定 UI
  - `src/background/settingsService.ts` - 設定儲存
