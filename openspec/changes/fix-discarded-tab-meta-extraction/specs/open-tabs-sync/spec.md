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

#### Scenario: 分頁被替換時保持同步
- **GIVEN** 分頁 A（tabId: 100）正在顯示於 Open Tabs 區域
- **WHEN** Chrome 觸發 `onReplaced` 事件（例如：休眠標籤被 reload，或預渲染標籤被替換）
- **THEN** 系統移除舊的分頁（removedTabId: 100）
- **THEN** 系統查詢新分頁的完整資訊（addedTabId）
- **THEN** 系統將新分頁加入 Open Tabs 區域
- **THEN** 使用者無感知地繼續看到該分頁
