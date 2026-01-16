## 1. Implementation

- [x] 1.1 修改 `extractMetaForTab` 函數，將休眠標籤喚醒方式從 `chrome.tabs.update({ active: true })` 改為 `chrome.tabs.reload()`
- [x] 1.2 增加喚醒後的等待時間，使用 `waitForTabComplete` 等待頁面載入
- [x] 1.3 在 `WebpagesProvider` 中，休眠標籤跳過初始等待直接進入 meta 提取
- [x] 1.4 降低超時時間從 15 秒到 8 秒，額外等待從 2 秒到 0.5 秒
- [x] 1.5 修復 `OpenTabsProvider` 的 `onReplaced` 事件處理，確保新標籤被正確加入

## 2. Testing

- [x] 2.1 手動測試：使用 `chrome.tabs.discard()` 休眠標籤後驗證 meta 提取功能
- [x] 2.2 驗證 Open Tabs 區域在 reload 後正確顯示標籤
