# Change: 修復擴充程式內部開啟分頁無法即時同步

## Why

從擴充程式內部卡片開啟的分頁（單張卡片點擊或批量開啟）無法在右側 Open Tabs 區域即時顯示。這是因為：

1. 目前使用 `window.open()` 開啟分頁，這是 Web API 而非 Chrome Extension API
2. Manifest V3 的 Service Worker 在閒置時會休眠
3. `window.open()` 不會可靠地喚醒休眠的 Service Worker
4. 即使 SW 被喚醒，舊的 port 連接可能已失效

## What Changes

- 將卡片開啟分頁的方式從 `window.open()` 改為 `chrome.tabs.create()`
- 確保 Chrome Extension API 調用能可靠喚醒 Service Worker
- 維持與一般瀏覽器新開分頁相同的同步行為
- **新增**：支援 Ctrl+Click 在背景開啟分頁（不切換焦點，留在原頁面）
- **新增**：Port 斷開自動重連機制，確保 SW 休眠後仍能同步

## Impact

- Affected specs: `open-tabs-sync`
- Affected code:
  - `src/app/webpages/CardGrid.tsx` - 批量開啟分頁 (`executeOpenTabs`)、單張卡片開啟 (`onOpen`)
  - `src/app/webpages/TobyLikeCard.tsx` - 傳遞 Ctrl 鍵狀態給 `onOpen`
  - `src/app/tabs/OpenTabsProvider.tsx` - Port 斷開自動重連
