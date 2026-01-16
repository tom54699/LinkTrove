## MODIFIED Requirements

### Requirement: 卡片元資料管理
系統必須（SHALL）自動擷取並儲存網頁卡片的元資料（標題、URL、favicon、截圖）。

#### Scenario: 新增卡片時自動擷取元資料
- **WHEN** 使用者將網頁加入書籤
- **THEN** 系統自動擷取以下資訊：
  - `title`: 網頁標題
  - `url`: 完整 URL
  - `favicon`: 網站圖示 URL
  - `screenshot`: 網頁縮圖（可選）
- **THEN** 系統將元資料儲存到 WebpageData 記錄

#### Scenario: 休眠標籤的元資料提取
- **GIVEN** 標籤頁已被 Chrome 休眠（`tab.discarded === true`）
- **WHEN** 使用者將該標籤加入書籤
- **THEN** 系統跳過初始等待（因為休眠標籤不會有 complete 事件）
- **THEN** 系統使用 `chrome.tabs.reload()` 在背景喚醒標籤（不切換用戶焦點）
- **THEN** 系統等待頁面完全載入（`status === 'complete'`，最多 8 秒）
- **THEN** 系統提取 meta 標籤資訊（description, og:title 等）
- **THEN** 若喚醒失敗，系統將提取任務加入 pending queue，等待用戶手動喚醒標籤時再提取

#### Scenario: 手動編輯卡片標題和備註
- **GIVEN** 卡片 X 的標題為 "React Docs"
- **WHEN** 使用者手動將標題改為 "React 官方文檔"
- **THEN** 系統更新該卡片的 `title` 欄位
- **WHEN** 使用者新增備註 "常用參考"
- **THEN** 系統將備註儲存到 `note` 欄位
- **THEN** 系統更新 `updatedAt` 時間戳記（ISO string 格式）

#### Scenario: 卡片顯示時使用元資料
- **GIVEN** 卡片包含完整元資料
- **WHEN** 系統渲染卡片
- **THEN** 顯示 favicon 作為卡片圖示
- **THEN** 顯示 title 作為主標題
- **THEN** 顯示 URL（截短顯示域名）
- **THEN** 若有 note，顯示備註區塊
