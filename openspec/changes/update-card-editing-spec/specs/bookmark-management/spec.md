## MODIFIED Requirements

### Requirement: 手動編輯卡片標題和備註
系統必須（SHALL）透過卡片編輯對話框讓使用者修改標題與備註，且不提供卡片內的 inline 編輯。

#### Scenario: 透過編輯對話框更新標題與備註
- **GIVEN** 卡片 X 的標題為 "React Docs"
- **WHEN** 使用者點擊「編輯」開啟卡片編輯對話框
- **AND** 使用者將標題改為 "React 官方文檔"
- **AND** 使用者新增備註 "常用參考"
- **AND** 使用者點擊 Done（或按 Enter）
- **THEN** 系統更新該卡片的 `title` 與 `note`
- **THEN** 系統更新 `updatedAt` 時間戳記（ISO string 格式）

#### Scenario: 卡片本體不支援 inline 編輯
- **GIVEN** 卡片顯示於卡片格網中
- **WHEN** 使用者點擊卡片本體
- **THEN** 系統開啟該卡片的 URL
- **AND** 不會進入任何 inline 編輯狀態

## ADDED Requirements

### Requirement: 編輯儲存觸發條件
系統必須（SHALL）只在使用者明確觸發儲存動作時寫入編輯內容。

#### Scenario: Done 按鈕儲存
- **GIVEN** 使用者已在編輯對話框中修改欄位
- **WHEN** 使用者點擊 Done
- **THEN** 所有變更寫入資料庫並關閉對話框

#### Scenario: Enter 鍵儲存
- **GIVEN** 使用者正在編輯對話框內的任一輸入欄位
- **WHEN** 使用者按下 Enter
- **THEN** 所有變更寫入資料庫並關閉對話框

#### Scenario: 取消/ESC/背景點擊不儲存
- **GIVEN** 使用者已在編輯對話框中修改欄位
- **WHEN** 使用者點擊 Cancel 或按下 ESC 或點擊背景遮罩
- **THEN** 不會寫入任何變更
- **AND** 對話框關閉

#### Scenario: 不支援自動儲存
- **GIVEN** 使用者正在編輯對話框中輸入內容
- **WHEN** 使用者停止輸入但未觸發 Done/Enter
- **THEN** 系統不應自動寫入變更
