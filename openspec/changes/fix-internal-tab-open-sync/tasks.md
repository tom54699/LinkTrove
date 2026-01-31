## 1. Implementation

- [x] 1.1 修改 `CardGrid.tsx` 的 `executeOpenTabs` 函數，將 `window.open()` 改為 `chrome.tabs.create()`
- [x] 1.2 修改 `CardGrid.tsx` 的 `onOpen` callback，將 `window.open()` 改為 `chrome.tabs.create()`
- [x] 1.3 確保錯誤處理邏輯適用於新的 API 調用（保留 fallback 到 window.open）
- [x] 1.4 修改 `TobyLikeCard.tsx` 的 `onOpen` props 支援傳遞 ctrlKey 參數
- [x] 1.5 修改 `CardGrid.tsx` 的 `onOpen` callback 根據 ctrlKey 決定 active 參數
- [x] 1.6 修改 `OpenTabsProvider.tsx` 加入 port 斷開自動重連機制

## 2. Testing

- [x] 2.1 手動測試：點擊單張卡片開啟分頁，確認右側 Open Tabs 即時更新
- [x] 2.2 手動測試：批量勾選多張卡片開啟分頁，確認右側 Open Tabs 即時更新
- [x] 2.3 手動測試：在 SW 休眠後（等待 30+ 秒）執行上述操作，確認仍能正常同步
- [x] 2.4 手動測試：Ctrl+Click 卡片，確認在背景開啟分頁且留在原頁面
- [x] 2.5 手動測試：放置一段時間後開啟分頁，確認自動重連後同步正常
