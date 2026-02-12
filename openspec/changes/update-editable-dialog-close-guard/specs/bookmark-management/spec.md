## MODIFIED Requirements

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

#### Scenario: 取消/ESC/純背景點擊不儲存
- **GIVEN** 使用者已在編輯對話框中修改欄位
- **WHEN** 使用者點擊 Cancel 或按下 ESC
- **THEN** 不會寫入任何變更
- **AND** 對話框關閉
- **WHEN** 使用者在背景遮罩上完成一次純點擊（`mousedown` 與 `mouseup` 皆發生於遮罩）
- **THEN** 不會寫入任何變更
- **AND** 對話框關閉

#### Scenario: 輸入欄位拖曳選取不應視為背景點擊
- **GIVEN** 使用者正在編輯對話框內的輸入欄位選取文字
- **WHEN** 使用者在欄位內按下滑鼠，拖曳後於背景遮罩放開
- **THEN** 系統不得將該操作視為背景點擊
- **AND** 對話框保持開啟

#### Scenario: 不支援自動儲存
- **GIVEN** 使用者正在編輯對話框中輸入內容
- **WHEN** 使用者停止輸入但未觸發 Done/Enter
- **THEN** 系統不應自動寫入變更

## ADDED Requirements

### Requirement: 管理型可編輯對話框防誤關閉
系統必須（SHALL）在所有管理型可編輯對話框中，避免因拖曳選字或拖曳游標路徑跨到遮罩而誤關閉。

#### Scenario: 從欄位內開始拖曳到遮罩不關閉
- **GIVEN** 使用者開啟任一管理型可編輯對話框（例如：新增/編輯 Collection、新增/管理 Organization、Share 設定、Token 設定、Move Selected）
- **WHEN** 使用者於對話框欄位內按下滑鼠並拖曳
- **AND** 於背景遮罩區域放開滑鼠
- **THEN** 對話框保持開啟
- **AND** 已輸入內容保持不變

#### Scenario: 純遮罩點擊仍可關閉
- **GIVEN** 使用者開啟任一管理型可編輯對話框
- **WHEN** 使用者在背景遮罩完成一次純點擊（`mousedown` 與 `mouseup` 皆在遮罩）
- **THEN** 對話框關閉
- **AND** 不觸發任何儲存動作

#### Scenario: 明確關閉入口維持可用
- **GIVEN** 使用者開啟任一管理型可編輯對話框
- **WHEN** 使用者按下 ESC 或點擊 Cancel/Close 按鈕
- **THEN** 對話框關閉
