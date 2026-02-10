## MODIFIED Requirements

### Requirement: Group Sharing via Gist
系統必須（SHALL）支援將書籤群組發布到 GitHub Gist 並提供分享連結。

#### Scenario: Share Result Display
- **WHEN** 群組發布成功
- **THEN** 系統顯示 `ShareResultDialog`
- **THEN** 對話框標頭必須有明顯的成功視覺指標（如綠色 Check 指標）
- **THEN** 提供一鍵複製功能，且 URL 顯示區塊採用 Mono 字體與現代化邊框
- **THEN** 樣式必須遵循 Modern Dialog UI Standards
