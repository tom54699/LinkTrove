## MODIFIED Requirements

### Requirement: 即時分頁同步
系統必須（SHALL）即時追蹤並同步所有瀏覽器視窗的開啟分頁，並在右側 Open Tabs 區域顯示；在 Service Worker 閒置或事件不完整時，仍需具備自我校正能力。

#### Scenario: 閒置後回到擴充分頁時自我校正
- **GIVEN** 使用者已開啟 LinkTrove 新分頁，Open Tabs 已初始化
- **AND** 該分頁在背景閒置一段時間
- **WHEN** 使用者將 LinkTrove 分頁切回前景（`visibilitychange` 或 `focus`）
- **THEN** 系統主動執行一次全量分頁查詢（`chrome.tabs.query({})`）
- **THEN** 右側 Open Tabs 在短時間內校正為最新狀態

#### Scenario: Port 失活時可自動恢復同步
- **GIVEN** UI 與 Service Worker 曾建立 port 連線
- **WHEN** 連線因閒置或重啟而失活
- **THEN** UI 能在可見狀態下偵測並觸發自動重連
- **THEN** 重連後送出 `ready` 並重新初始化快照
- **THEN** 後續分頁事件可持續同步

#### Scenario: 同分頁 URL 尾段變化能反映在 Open Tabs
- **GIVEN** 使用者停留在同一個分頁並連續翻頁（例如 `/chapter/1` 到 `/chapter/30`）
- **WHEN** 系統收到 `chrome.tabs.onUpdated` 事件
- **THEN** 事件 payload 應包含 `changeInfo` 與完整 tab 快照
- **THEN** UI 優先使用完整 tab 快照更新，確保 URL 變更被正確呈現

#### Scenario: 擴充程式內批次開頁維持即時同步
- **GIVEN** 使用者在 LinkTrove 的群組區點擊「OPEN TABS」
- **WHEN** 系統批次開啟多個分頁
- **THEN** 系統優先使用 `chrome.tabs.create()` 開啟分頁
- **THEN** 新分頁可被 Open Tabs 即時追蹤，不因 `window.open` 路徑造成同步不穩
