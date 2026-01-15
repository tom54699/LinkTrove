# Capability: Open Tabs Sync

## Purpose
即時同步並顯示所有瀏覽器視窗的開啟分頁，提供快速瀏覽、切換和儲存分頁到書籤的功能。支援多視窗追蹤，確保使用者可以完整掌握所有開啟的分頁。
## Requirements
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

### Requirement: 多視窗支援
系統必須（SHALL）追蹤並顯示多個瀏覽器視窗的分頁，並提供視窗分組顯示。

#### Scenario: 顯示多個視窗的分頁
- **GIVEN** 使用者開啟 3 個瀏覽器視窗
- **GIVEN** 視窗 A 有 5 個分頁，視窗 B 有 3 個分頁，視窗 C 有 2 個分頁
- **WHEN** 使用者開啟 LinkTrove 新分頁
- **THEN** Open Tabs 區域以視窗為單位分組顯示：
  - **Window 1** (5 tabs)
  - **Window 2** (3 tabs)
  - **Window 3** (2 tabs)
- **THEN** 每個視窗組可折疊/展開

#### Scenario: 建立新視窗時新增分組
- **GIVEN** Open Tabs 區域顯示 2 個視窗的分頁
- **WHEN** 使用者開啟新視窗（Ctrl+N）
- **THEN** 系統透過 `chrome.windows.onCreated` 偵測到事件
- **THEN** Open Tabs 區域新增第 3 個視窗分組
- **THEN** 新視窗的分頁自動顯示在該分組下

#### Scenario: 關閉視窗時移除分組
- **GIVEN** Open Tabs 區域顯示 3 個視窗的分頁
- **WHEN** 使用者關閉其中一個視窗
- **THEN** 系統透過 `chrome.windows.onRemoved` 偵測到事件
- **THEN** 該視窗分組從 Open Tabs 區域移除
- **THEN** 該視窗的所有分頁也一併移除

#### Scenario: 跨視窗移動分頁
- **GIVEN** 分頁 A 屬於視窗 1
- **WHEN** 使用者將分頁 A 拖曳到視窗 2
- **THEN** 系統透過 `chrome.tabs.onAttached` 和 `onDetached` 偵測到事件
- **THEN** Open Tabs 區域將分頁 A 從視窗 1 移動到視窗 2
- **THEN** 兩個視窗的分頁計數即時更新

#### Scenario: 識別當前視窗
- **GIVEN** 使用者有 3 個視窗
- **GIVEN** LinkTrove 新分頁在視窗 2
- **WHEN** Open Tabs 區域顯示分頁列表
- **THEN** 視窗 2 的標題顯示「(Current Window)」標記
- **THEN** 視窗 2 預設展開，其他視窗預設折疊

### Requirement: 快速儲存分頁到書籤
系統必須（SHALL）提供一鍵將開啟的分頁儲存到書籤的功能。

#### Scenario: 單一分頁儲存到書籤
- **GIVEN** Open Tabs 區域顯示多個分頁
- **WHEN** 使用者懸停在分頁 A 上，點擊「儲存」按鈕（書籤圖示）
- **THEN** 系統顯示「選擇群組」對話框
- **WHEN** 使用者選擇目標群組 G
- **THEN** 系統將分頁 A 的資訊（title, url, favicon）儲存為新卡片
- **THEN** 卡片加入群組 G
- **THEN** 顯示成功訊息：「已儲存到 [群組名稱]」

#### Scenario: 批次儲存多個分頁
- **GIVEN** 視窗 A 有 10 個分頁
- **WHEN** 使用者點擊視窗 A 的「全部儲存」按鈕
- **THEN** 系統顯示「選擇群組」對話框
- **WHEN** 使用者選擇群組 G
- **THEN** 系統批次建立 10 張卡片並加入群組 G
- **THEN** 系統保留分頁的原始順序
- **THEN** 顯示成功訊息：「已儲存 10 個分頁到 [群組名稱]」

#### Scenario: 儲存時過濾系統分頁
- **GIVEN** 使用者有多個開啟的分頁，包含 Chrome 系統分頁（chrome://settings, chrome://extensions）
- **WHEN** 使用者批次儲存分頁
- **THEN** 系統自動過濾掉 `chrome://`, `edge://`, `about:` 等系統協議的分頁
- **THEN** 只儲存有效的 http/https 分頁
- **THEN** 顯示訊息：「已儲存 8 個分頁（跳過 2 個系統分頁）」

#### Scenario: 儲存重複 URL 時提示
- **GIVEN** 群組 G 已包含 URL 為 "https://react.dev" 的卡片
- **WHEN** 使用者嘗試儲存相同 URL 的分頁到群組 G
- **THEN** 系統偵測到重複 URL
- **THEN** 系統提示使用者：「此網址已存在於該群組，仍要新增？」
- **THEN** 使用者可選擇「取消」或「仍然新增」

#### Scenario: 儲存後關閉分頁（可選）
- **GIVEN** 使用者啟用「儲存後關閉分頁」選項
- **WHEN** 使用者儲存分頁 A 到書籤
- **THEN** 系統儲存卡片到 IndexedDB
- **THEN** 系統自動關閉分頁 A（呼叫 `chrome.tabs.remove()`）
- **THEN** 分頁 A 從 Open Tabs 區域移除

### Requirement: 分頁點擊切換
系統必須（SHALL）支援點擊 Open Tabs 區域的分頁項目以切換到該分頁。

#### Scenario: 點擊分頁切換焦點
- **GIVEN** 視窗 1 有分頁 A, B, C，當前啟用分頁 A
- **WHEN** 使用者在 Open Tabs 區域點擊分頁 C
- **THEN** 系統呼叫 `chrome.tabs.update(tabC.id, { active: true })`
- **THEN** 瀏覽器切換到分頁 C
- **THEN** Open Tabs 區域的分頁 C 顯示高亮

#### Scenario: 點擊不同視窗的分頁
- **GIVEN** 視窗 1 當前啟用，視窗 2 在背景
- **WHEN** 使用者點擊視窗 2 的分頁 B
- **THEN** 系統呼叫 `chrome.windows.update(window2.id, { focused: true })`
- **THEN** 視窗 2 切換到前景
- **THEN** 系統呼叫 `chrome.tabs.update(tabB.id, { active: true })`
- **THEN** 分頁 B 成為視窗 2 的啟用分頁

#### Scenario: 點擊已關閉的分頁時處理
- **GIVEN** Open Tabs 區域顯示分頁 A
- **GIVEN** 使用者在瀏覽器手動關閉分頁 A
- **GIVEN** Open Tabs 區域尚未更新（同步延遲）
- **WHEN** 使用者點擊 Open Tabs 區域的分頁 A
- **THEN** 系統嘗試切換但失敗（分頁不存在）
- **THEN** 系統立即從 Open Tabs 區域移除分頁 A
- **THEN** 顯示訊息：「該分頁已關閉」

### Requirement: 分頁搜尋與過濾
系統必須（SHALL）提供搜尋功能，讓使用者快速找到特定分頁。

#### Scenario: 搜尋分頁標題
- **GIVEN** 使用者有 50 個開啟的分頁
- **WHEN** 使用者在 Open Tabs 搜尋框輸入 "react"
- **THEN** Open Tabs 區域只顯示標題包含 "react" 的分頁
- **THEN** 匹配的關鍵字高亮顯示（黃色背景）
- **THEN** 顯示結果計數：「找到 5 個分頁」

#### Scenario: 搜尋分頁 URL
- **GIVEN** 使用者輸入搜尋關鍵字 "github.com"
- **WHEN** 系統執行搜尋
- **THEN** 顯示所有 URL 包含 "github.com" 的分頁
- **THEN** 標題和 URL 都會被搜尋

#### Scenario: 清空搜尋恢復完整列表
- **GIVEN** 使用者正在搜尋，只顯示 5 個匹配分頁
- **WHEN** 使用者清空搜尋框（刪除所有文字或按 ESC）
- **THEN** Open Tabs 區域恢復顯示所有分頁
- **THEN** 視窗分組結構保持不變

#### Scenario: 搜尋時保留視窗分組
- **GIVEN** 使用者搜尋 "docs"
- **GIVEN** 視窗 1 有 2 個匹配分頁，視窗 2 有 1 個匹配分頁
- **WHEN** 顯示搜尋結果
- **THEN** 結果仍按視窗分組顯示：
  - **Window 1** (2 tabs)
  - **Window 2** (1 tab)
- **THEN** 沒有匹配分頁的視窗不顯示

### Requirement: 效能優化
系統必須（SHALL）在大量分頁（100+）時仍保持流暢的同步和顯示效能。

#### Scenario: 處理 100+ 分頁不卡頓
- **GIVEN** 使用者開啟 150 個分頁（跨 5 個視窗）
- **WHEN** 使用者開啟 LinkTrove 新分頁
- **THEN** Open Tabs 區域在 500ms 內完成初始載入
- **THEN** 滾動列表時保持流暢（>30 FPS）

#### Scenario: 虛擬化滾動大量分頁
- **GIVEN** Open Tabs 區域需要顯示 200 個分頁
- **WHEN** 系統渲染列表
- **THEN** 系統使用虛擬化滾動（只渲染可見區域的分頁）
- **THEN** DOM 節點數量保持在 20-30 個（可見 + 緩衝區）
- **THEN** 滾動時動態加載分頁項目

#### Scenario: Debounce 快速變更
- **GIVEN** 使用者快速開啟/關閉多個分頁（<200ms 間隔）
- **WHEN** 系統接收到多個 `chrome.tabs` 事件
- **THEN** 系統使用 debounce 延遲 100ms 更新 UI
- **THEN** 多次變更合併為一次 React state 更新
- **THEN** 避免頻繁重新渲染

#### Scenario: 記憶化分頁項目組件
- **GIVEN** Open Tabs 區域渲染 100 個分頁項目
- **WHEN** 單一分頁狀態改變（例如：標題更新）
- **THEN** 系統只重新渲染該分頁項目（使用 React.memo）
- **THEN** 其他 99 個分頁項目不重新渲染
- **THEN** 更新延遲 <16ms（60 FPS）

### Requirement: 視覺化顯示
系統必須（SHALL）提供清楚的視覺化介面，包含 favicon、標題、URL 和狀態指示。

#### Scenario: 顯示分頁完整資訊
- **WHEN** Open Tabs 區域渲染分頁項目
- **THEN** 每個分頁項目顯示：
  - Favicon（16x16px，若無則顯示預設圖示）
  - 標題（最多 2 行，超出顯示省略號）
  - URL（灰色小字，顯示域名，例如："react.dev"）
  - 儲存按鈕（懸停時顯示）

#### Scenario: 載入中的分頁顯示動畫
- **GIVEN** 分頁正在載入網頁（`tab.status === 'loading'`）
- **WHEN** Open Tabs 區域渲染該分頁
- **THEN** Favicon 位置顯示載入動畫（旋轉圖示）
- **THEN** 標題顯示為 "Loading..."
- **WHEN** 載入完成（`tab.status === 'complete'`）
- **THEN** 載入動畫替換為實際 favicon
- **THEN** 標題更新為網頁標題

#### Scenario: 音訊播放中的分頁顯示指示
- **GIVEN** 分頁正在播放音訊（`tab.audible === true`）
- **WHEN** Open Tabs 區域渲染該分頁
- **THEN** 分頁項目右側顯示喇叭圖示（🔊）
- **THEN** 懸停時顯示「靜音」按鈕
- **WHEN** 使用者點擊靜音按鈕
- **THEN** 系統呼叫 `chrome.tabs.update(tabId, { muted: true })`
- **THEN** 喇叭圖示變為靜音圖示（🔇）

#### Scenario: 固定分頁顯示圖釘圖示
- **GIVEN** 分頁被固定（`tab.pinned === true`）
- **WHEN** Open Tabs 區域渲染該分頁
- **THEN** 分頁項目顯示圖釘圖示（📌）
- **THEN** 固定分頁置於視窗分組的頂部

### Requirement: 錯誤處理與權限管理
系統必須（SHALL）正確處理 Chrome Tabs API 權限和錯誤情況。

#### Scenario: 缺少 tabs 權限時提示
- **GIVEN** manifest.json 未宣告 `tabs` 權限
- **WHEN** 系統嘗試呼叫 `chrome.tabs.query()`
- **THEN** 系統捕獲權限錯誤
- **THEN** Open Tabs 區域顯示錯誤訊息：「缺少分頁權限，請重新安裝擴充套件」
- **THEN** 提供重新安裝連結

#### Scenario: Chrome API 呼叫失敗時重試
- **GIVEN** 系統呼叫 `chrome.tabs.query()` 失敗（網路問題或 API 異常）
- **WHEN** 系統偵測到錯誤
- **THEN** 系統自動重試（最多 3 次，間隔 1 秒）
- **THEN** 若重試仍失敗，顯示錯誤訊息並記錄到 console

#### Scenario: 隱私模式分頁處理
- **GIVEN** 使用者開啟隱私模式視窗
- **WHEN** Open Tabs 區域查詢分頁
- **THEN** 系統過濾掉隱私模式分頁（`tab.incognito === true`）
- **THEN** 隱私模式分頁不顯示（保護隱私）
- **THEN** 視窗計數不包含隱私模式視窗

### Requirement: 右側面板釘選功能
系統必須（SHALL）提供一個圖示讓使用者將右側面板釘選在展開狀態。

#### Scenario: 點擊圖示釘選面板
- **WHEN** 使用者點擊「釘選」圖示
- **THEN** 面板保持在 300px 寬度，滑鼠移開後不會縮回

#### Scenario: 取消釘選恢復縮放
- **WHEN** 使用者點擊「取消釘選」圖示
- **THEN** 面板恢復為「滑鼠懸停觸發」模式

#### Scenario: 記憶釘選狀態
- **GIVEN** 使用者將右側面板釘選
- **WHEN** 使用者關閉並重新開啟應用程式
- **THEN** 右側面板應自動保持在「已釘選」狀態
- **THEN** 無需使用者再次手動釘選

## Related Documentation
- **技術設計**: `design.md` - Chrome Tabs API 整合與效能優化
- **架構說明**: `/docs/architecture/component-map.md` - OpenTabsProvider 位置
- **實作位置**: `src/app/providers/OpenTabsProvider.tsx` - 主要實作
- **Chrome API 文檔**: https://developer.chrome.com/docs/extensions/reference/tabs/
