## MODIFIED Requirements

### Requirement: 行為設定
系統必須（SHALL）提供行為設定選項，讓使用者自訂應用程式互動行為。

#### Scenario: 設定儲存後關閉分頁
- **WHEN** 使用者開啟設定頁面的「行為設定」區塊
- **THEN** 系統顯示「儲存後關閉分頁」開關
- **THEN** 開關預設為關閉狀態
- **WHEN** 使用者啟用此開關
- **THEN** 系統將設定儲存為 `closeTabAfterSave: true`
- **THEN** 設定立即生效，無需重新載入
- **WHEN** 使用者從 Open Tabs 拖曳儲存分頁到書籤
- **THEN** 系統儲存書籤後自動關閉該分頁
- **WHEN** 使用者停用此選項
- **THEN** 系統將設定儲存為 `closeTabAfterSave: false`
- **THEN** 儲存書籤後分頁保持開啟

#### Scenario: 設定拖放確認
- **WHEN** 使用者啟用「拖放時顯示確認」選項
- **WHEN** 使用者拖放卡片到另一個群組
- **THEN** 系統顯示確認對話框：「確定要將卡片移動到 [群組名稱]？」
- **WHEN** 使用者確認
- **THEN** 執行移動操作
- **WHEN** 使用者停用此選項
- **THEN** 拖放操作直接執行（無確認）

#### Scenario: 設定自動備份頻率
- **WHEN** 使用者設定「自動備份」選項
- **THEN** 提供選項：關閉/每日/每週/每月
- **WHEN** 使用者選擇「每日」
- **THEN** 系統每日自動匯出資料到下載資料夾
- **THEN** 備份檔案命名為 `linktrove-backup-[date].json`

#### Scenario: 設定新卡片預設位置
- **WHEN** 使用者設定「新卡片加入位置」
- **THEN** 提供選項：頂部/底部
- **WHEN** 使用者選擇「頂部」
- **WHEN** 使用者新增卡片到群組
- **THEN** 新卡片插入到群組的最前面

#### Scenario: 設定重複 URL 處理
- **WHEN** 使用者設定「重複 URL 處理」選項
- **THEN** 提供選項：提示/自動跳過/允許重複
- **WHEN** 使用者選擇「自動跳過」
- **WHEN** 使用者嘗試儲存已存在的 URL
- **THEN** 系統自動跳過該 URL 並顯示通知
- **THEN** 不顯示確認對話框
