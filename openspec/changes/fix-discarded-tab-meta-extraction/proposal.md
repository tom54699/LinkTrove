# Change: 修復休眠標籤的 Meta 提取

## Why
當標籤頁被 Chrome 休眠（discarded）時，目前的 meta 提取機制會失敗。現有的喚醒方式使用 `chrome.tabs.update({ active: true })`，會將用戶焦點切換到該標籤，造成不良的使用體驗。另外，原本的等待邏輯會讓休眠標籤等待超時（約 15 秒），造成嚴重延遲。

## What Changes
- 休眠標籤跳過初始等待，直接進入 reload 流程
- 改用 `chrome.tabs.reload()` 在背景喚醒休眠標籤，不切換用戶焦點
- 降低超時時間從 15 秒到 8 秒
- 減少額外等待時間從 2 秒到 0.5 秒
- 修復 Open Tabs 的 `onReplaced` 事件處理，確保被替換的標籤正確同步

## Impact
- Affected specs: `bookmark-management`, `open-tabs-sync`
- Affected code:
  - `src/background/pageMeta.ts`
  - `src/app/webpages/WebpagesProvider.tsx`
  - `src/app/tabs/OpenTabsProvider.tsx`
