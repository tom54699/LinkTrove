# Change: 修復 Open Tabs 閒置後失去同步與同分頁 URL 漂移

## Why
在實際使用中，Open Tabs 會出現兩種失同步情境：

1. LinkTrove 分頁放置一段時間後，右側 Open Tabs 停止追蹤最新變化。
2. 使用者在同一分頁內連續翻頁（例如小說站 `/chapter/1` → `/chapter/30`）時，右側仍停留在舊 URL。

這會讓使用者誤判目前分頁狀態，降低 Open Tabs 作為「即時分頁鏡像」的可信度。

## What Changes
- 在 `OpenTabsProvider` 新增「可見性/焦點觸發校正」：當頁面回到前景時主動全量 refresh。
- 在 `OpenTabsProvider` 新增「可見狀態下輕量 heartbeat」：偵測長時間無事件或疑似死連線時自動重連並重抓。
- 在 `tabsManager` 的 `updated` 事件中，保留 `changeInfo` 同時新增完整 `tab` payload（向後相容）。
- 在 `OpenTabsProvider` 的 `updated` 分支優先套用完整 `tab` payload，避免僅依賴 `changeInfo` 導致 URL 不更新。
- 將 `GroupsView` 的「OPEN TABS」開頁路徑由 `window.open` 改為 `chrome.tabs.create`（保留 fallback）。

## Impact
- Affected specs: `open-tabs-sync`
- Affected code:
  - `src/app/tabs/OpenTabsProvider.tsx`
  - `src/background/tabsManager.ts`
  - `src/background.ts`（若需型別/事件傳遞微調）
  - `src/app/groups/GroupsView.tsx`
  - `src/background/__tests__/tabsManager.test.ts`（事件 payload 期望值）
- Breaking changes: 無（`updated` payload 採向後相容擴充）
