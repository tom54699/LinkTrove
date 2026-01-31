## MODIFIED Requirements

### Requirement: 即時分頁同步
系統必須（SHALL）即時追蹤並同步所有瀏覽器視窗的開啟分頁，並在右側 Open Tabs 區域顯示。

#### Scenario: 開啟新分頁時自動顯示
- **WHEN** 使用者在任何視窗開啟新分頁（例如：按 Ctrl+T 或點擊連結）
- **THEN** 系統透過 Chrome Tabs API 偵測到新分頁事件（`chrome.tabs.onCreated`）
- **THEN** 新分頁立即出現在右側 Open Tabs 區域（延遲 <100ms）
- **THEN** 顯示分頁的 favicon、標題和 URL

#### Scenario: 關閉分頁時自動移除
- **GIVEN** Open Tabs 區域顯示 10 個分頁
- **WHEN** 使用者關閉其中一個分頁
- **THEN** 系統透過 `chrome.tabs.onRemoved` 偵測到事件
- **THEN** 該分頁從 Open Tabs 區域移除
- **THEN** 剩餘 9 個分頁的顯示順序保持不變

#### Scenario: 更新分頁資訊時同步顯示
- **GIVEN** 分頁 A 正在載入網頁
- **WHEN** 網頁載入完成，標題從 "Loading..." 變為 "React Documentation"
- **THEN** 系統透過 `chrome.tabs.onUpdated` 偵測到變更
- **THEN** Open Tabs 區域的該分頁標題即時更新
- **THEN** favicon 也同步更新

#### Scenario: 切換分頁時高亮顯示
- **GIVEN** 使用者有 5 個開啟的分頁
- **WHEN** 使用者切換到分頁 B（點擊分頁或使用快捷鍵）
- **THEN** 系統透過 `chrome.tabs.onActivated` 偵測到事件
- **THEN** Open Tabs 區域的分頁 B 顯示高亮邊框（藍色）
- **THEN** 其他分頁恢復正常顯示

#### Scenario: 應用程式啟動時載入所有分頁
- **WHEN** 使用者開啟 LinkTrove 新分頁
- **THEN** 系統呼叫 `chrome.tabs.query({})` 查詢所有分頁
- **THEN** Open Tabs 區域顯示所有分頁（按視窗分組）
- **THEN** 當前啟用的分頁顯示高亮

#### Scenario: 從擴充程式內部開啟分頁時即時同步
- **GIVEN** 使用者在 LinkTrove 新分頁頁面操作
- **WHEN** 使用者點擊卡片開啟分頁（單張或批量）
- **THEN** 系統使用 `chrome.tabs.create()` API 開啟新分頁
- **THEN** Chrome 觸發 `chrome.tabs.onCreated` 事件
- **THEN** 新分頁立即出現在右側 Open Tabs 區域（延遲 <100ms）
- **THEN** 即使 Service Worker 之前處於休眠狀態，同步仍能正常運作

#### Scenario: Ctrl+Click 在背景開啟分頁
- **GIVEN** 使用者在 LinkTrove 新分頁頁面操作
- **WHEN** 使用者按住 Ctrl 鍵並點擊卡片
- **THEN** 系統使用 `chrome.tabs.create({ active: false })` 在背景開啟新分頁
- **THEN** 使用者留在原本的 LinkTrove 頁面（焦點不切換）
- **THEN** 新分頁仍然出現在右側 Open Tabs 區域

#### Scenario: Port 斷開後自動重連
- **GIVEN** UI 與 Service Worker 建立了 port 連接
- **WHEN** Service Worker 休眠導致 port 斷開
- **THEN** UI 偵測到 `port.onDisconnect` 事件
- **THEN** UI 在 500ms 後自動重新建立 port 連接
- **THEN** 重連後發送 `ready` 訊息觸發初始化
- **THEN** 後續分頁事件能正常同步到 UI
