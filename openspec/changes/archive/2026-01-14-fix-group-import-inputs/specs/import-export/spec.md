## ADDED Requirements
### Requirement: 群組層級匯入介面
系統必須（SHALL）允許使用者從個別群組的右鍵選單中觸發匯入功能，將內容直接匯入至該群組。

#### Scenario: 從群組選單匯入 HTML
- **GIVEN** 使用者對群組 A 開啟右鍵選單
- **WHEN** 使用者點擊「匯入 HTML」
- **THEN** 系統開啟檔案選擇對話框
- **THEN** 使用者選擇檔案後，系統將內容匯入至群組 A

#### Scenario: 從群組選單匯入 Toby JSON
- **GIVEN** 使用者對群組 B 開啟右鍵選單
- **WHEN** 使用者點擊「匯入 Toby」
- **THEN** 系統開啟檔案選擇對話框
- **THEN** 使用者選擇檔案後，系統將內容匯入至群組 B
