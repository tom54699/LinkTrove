## ADDED Requirements
### Requirement: Template Field Key Validation
系統 MUST 驗證模板欄位鍵符合指定格式，避免不合法鍵名造成資料對應錯誤。

#### Scenario: Valid key accepted
- **WHEN** 使用者輸入符合格式的欄位鍵（例如 `author`, `site_name`）
- **THEN** 允許建立欄位

#### Scenario: Invalid key rejected
- **WHEN** 使用者輸入不符合格式的欄位鍵（例如含空白或中文）
- **THEN** 顯示錯誤訊息並阻止儲存
