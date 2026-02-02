## Context
Open Tabs 目前透過 MV3 Service Worker + runtime port 推送事件到 UI。此架構在「長時間閒置」與「同 tab URL 連續變化」場景會出現同步漂移：

- Service Worker 休眠/重啟後，port 可能短暫處於失活狀態。
- 某些網站的 URL 變化不保證在 `changeInfo` 內提供完整資訊。

## Goals / Non-Goals
- Goals:
  - 閒置後切回擴充分頁可快速自我校正同步。
  - 同一 tab 的 URL 變化可被可靠反映（包含尾段 path/頁碼變更）。
  - 不引入破壞性變更，維持既有事件處理相容。
- Non-Goals:
  - 本變更不新增 `webNavigation` 權限。
  - 本變更不重寫 Open Tabs 全部資料流。

## Decisions
- Decision 1: 前景校正優先於常駐高頻輪詢
  - 使用 `visibilitychange` / `focus` 觸發 `refresh()`，用較低成本修正長閒置漂移。
- Decision 2: 事件 payload 採「增量擴充」
  - `updated` 保留 `changeInfo`，同時加入完整 `tab`，避免只靠 `changeInfo` 造成 URL 漏更。
- Decision 3: heartbeat 僅在頁面可見時啟用
  - 減少背景資源消耗，並降低對雙螢幕常駐使用者的效能影響。
- Decision 4: 開頁路徑統一優先使用 Extension API
  - `GroupsView` 改用 `chrome.tabs.create`，提高 SW 喚醒與事件鏈一致性。

## Risks / Trade-offs
- 風險：`refresh()` 次數增加導致額外 `tabs.query` 開銷。
  - 緩解：加入節流與僅前景觸發。
- 風險：`updated` payload 改動影響既有測試。
  - 緩解：維持 `changeInfo` 不移除，更新測試期望為向後相容格式。
- 風險：heartbeat 若過於頻繁可能造成 UI 抖動。
  - 緩解：採 20–30 秒頻率，僅可見狀態啟用。

## Migration Plan
1. 先擴充 `tabsManager` payload（向後相容）。
2. 更新 `OpenTabsProvider` 的 `updated` 套用邏輯與前景校正。
3. 加入 heartbeat 失活重連。
4. 替換 `GroupsView` 開頁 API 並做手動驗證。

## Open Questions
- 是否需要在後續階段（P1）納入 `webNavigation.onHistoryStateUpdated` 以覆蓋更多 SPA 站點。
