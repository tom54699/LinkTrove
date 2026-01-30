# Delta: Open Tabs Sync

## ADDED Requirements

### Requirement: 原生分頁群組收合狀態同步
系統必須（SHALL）在使用者於 LinkTrove UI 收合/展開原生分頁群組時，同步更新瀏覽器的原生分頁群組狀態。

#### Scenario: 在 UI 收合群組時同步瀏覽器
- **GIVEN** 使用者在瀏覽器中建立了一個原生分頁群組「Work」（展開狀態）
- **GIVEN** LinkTrove Open Tabs 側邊欄顯示該群組為展開狀態
- **WHEN** 使用者在 LinkTrove UI 點擊群組標題收合該群組
- **THEN** 系統更新 local state，將群組標記為收合
- **THEN** 系統呼叫 `chrome.tabGroups.update(groupId, { collapsed: true })`
- **THEN** 瀏覽器的原生分頁群組同步收合
- **THEN** UI 和瀏覽器的狀態保持一致

#### Scenario: 在 UI 展開群組時同步瀏覽器
- **GIVEN** 原生分頁群組「Social」目前為收合狀態（UI 和瀏覽器皆收合）
- **WHEN** 使用者在 LinkTrove UI 點擊群組標題展開該群組
- **THEN** 系統更新 local state，將群組標記為展開
- **THEN** 系統呼叫 `chrome.tabGroups.update(groupId, { collapsed: false })`
- **THEN** 瀏覽器的原生分頁群組同步展開
- **THEN** 群組內的分頁在 UI 和瀏覽器中皆可見

#### Scenario: API 呼叫失敗時的錯誤處理
- **GIVEN** 使用者嘗試收合一個原生分頁群組
- **WHEN** `chrome.tabGroups.update()` 呼叫失敗（例如：群組已被刪除、權限不足）
- **THEN** 系統捕獲錯誤並記錄到 console
- **THEN** 系統保持 UI 狀態不變（或恢復到之前的狀態）
- **THEN** 顯示錯誤訊息給使用者：「無法更新分頁群組狀態」
- **THEN** 不影響其他群組的正常操作

#### Scenario: 瀏覽器端手動收合群組時 UI 同步
- **GIVEN** 原生分頁群組「Dev」在 UI 和瀏覽器皆為展開狀態
- **WHEN** 使用者在瀏覽器端手動收合該群組（點擊群組標題）
- **THEN** 系統透過 `chrome.tabGroups.onUpdated` 偵測到狀態變更
- **THEN** OpenTabsProvider 更新該群組的 `collapsed` 屬性
- **THEN** UI 自動更新，顯示該群組為收合狀態
- **THEN** UI 和瀏覽器的狀態保持一致

#### Scenario: 初始載入時同步瀏覽器的收合狀態
- **GIVEN** 瀏覽器有 3 個原生分頁群組：A（展開）、B（收合）、C（展開）
- **WHEN** 使用者開啟 LinkTrove 新分頁
- **THEN** 系統查詢所有分頁群組（`chrome.tabGroups.query({})`）
- **THEN** UI 顯示群組 A 為展開、群組 B 為收合、群組 C 為展開
- **THEN** UI 的初始狀態與瀏覽器的實際狀態一致

### Requirement: Open Tabs 側邊欄拖曳排序 (Drag & Drop Reordering)
系統必須（SHALL）支援使用者在 Open Tabs 側邊欄透過拖曳來調整分頁和群組的順序，並將變更即時同步至瀏覽器。

#### Scenario: 分頁在同群組內重新排序
- **GIVEN** 群組 A 內有分頁 [1, 2, 3]
- **WHEN** 使用者拖曳分頁 1 至分頁 3 的下方
- **THEN** 系統呼叫 `chrome.tabs.move` 將分頁 1 移動至新位置
- **THEN** 瀏覽器實際分頁順序更新為 [2, 3, 1]
- **THEN** UI 即時更新顯示新順序

#### Scenario: 分頁跨群組移動
- **GIVEN** 群組 A 有分頁 [1]，群組 B 有分頁 [2]
- **WHEN** 使用者拖曳分頁 1 至群組 B 的標題上
- **THEN** 系統呼叫 `chrome.tabs.group` 將分頁 1 加入群組 B
- **THEN** 系統呼叫 `chrome.tabs.move` 確保分頁 1 位於群組 B 的末端（或指定位置）
- **THEN** 群組 A 變空（或被移除），群組 B 包含 [2, 1]

#### Scenario: 分頁移出群組
- **GIVEN** 群組 A 有分頁 [1, 2]
- **WHEN** 使用者拖曳分頁 2 至群組外（如視窗底部的 Loose Tabs 區域）
- **THEN** 系統呼叫 `chrome.tabs.ungroup` 將分頁 2 移出群組
- **THEN** 系統呼叫 `chrome.tabs.move` 將分頁 2 移動至指定位置
- **THEN** 群組 A 剩 [1]，分頁 2 變為獨立分頁

#### Scenario: 原生群組重新排序
- **GIVEN** 視窗內有群組 [A, B]
- **WHEN** 使用者拖曳群組 B 的標題至群組 A 的上方
- **THEN** 系統呼叫 `chrome.tabGroups.move` 將群組 B 移動至群組 A 之前
- **THEN** 瀏覽器實際群組順序更新為 [B, A]
- **THEN** UI 即時更新顯示新順序