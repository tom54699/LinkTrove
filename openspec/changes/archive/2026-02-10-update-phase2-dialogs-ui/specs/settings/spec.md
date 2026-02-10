## MODIFIED Requirements

### Requirement: GitHub Gist Sync Configuration
系統必須（SHALL）允許使用者配置 GitHub Token 以支援 Gist 同步功能。配置界面必須使用現代化對話框。

#### Scenario: Token Configuration Dialog
- **WHEN** 使用者點擊配置 GitHub Token
- **THEN** 系統顯示 `TokenDialog`
- **THEN** 對話框必須包含安全提醒 (Callout) 區塊，且樣式符合 Modern Dialog UI Standards
- **THEN** 儲存後 Token 安全地儲存在本地

### Requirement: Cloud Sync Conflict Detection
系統必須（SHALL）在同步前偵測本地與雲端衝突，並透過對話框引導使用者解決。

#### Scenario: Conflict Resolution Dialog
- **WHEN** 偵測到資料衝突
- **THEN** 系統顯示 `ConflictDialog`
- **THEN** 對話框必須以 Grid 佈局清晰對比本地與雲端數據（Webpages, Groups 等數量）
- **THEN** 嚴重的衝突必須顯示顯眼的紅色警告 Callout
- **THEN** 樣式必須遵循 Modern Dialog UI Standards
