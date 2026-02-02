## 1. Implementation
- [x] 1.1 `OpenTabsProvider` 新增 `visibilitychange` / `focus` 觸發的全量 `refresh()` 校正機制（含節流）
- [x] 1.2 `OpenTabsProvider` 新增可見狀態 heartbeat，偵測疑似失活 port 後自動重連
- [x] 1.3 `tabsManager` 的 `updated` 事件 payload 改為 `{ tabId, changeInfo, tab }`（保留 `changeInfo`）
- [x] 1.4 `OpenTabsProvider` 在 `updated` 事件優先使用完整 `tab` 套用狀態，`changeInfo` 作為 fallback
- [x] 1.5 `GroupsView` 的批次開頁從 `window.open` 改為 `chrome.tabs.create`（保留 fallback）

## 2. Validation
- [ ] 2.1 手動驗證：擴充分頁閒置 3~5 分鐘後，切回前景可在 1 秒內完成同步校正
- [ ] 2.2 手動驗證：同一分頁 URL 尾段連續變化（例 `/1` → `/30`）時，Open Tabs URL 正確更新
- [ ] 2.3 手動驗證：使用 Group 的「OPEN TABS」開頁後，右側 Open Tabs 可即時顯示新增分頁
- [ ] 2.4 手動驗證：雙螢幕長開情境下，Open Tabs 持續可用且無明顯卡頓/重連抖動

## 3. Documentation
- [x] 3.1 更新 `docs/features/batch-operations.md` 中「批次開頁」實作描述（改為 `chrome.tabs.create` 優先）
- [x] 3.2 更新 `docs/meta/SESSION_HANDOFF.md` 記錄本次同步穩定性修復
