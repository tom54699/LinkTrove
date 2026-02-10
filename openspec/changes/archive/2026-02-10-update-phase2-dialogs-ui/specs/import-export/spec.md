## MODIFIED Requirements

### Requirement: 匯入匯出支援
系統必須（SHALL）支援匯出完整書籤資料為 JSON 格式，並能匯入相容的 JSON 資料（包含 Toby v3/v4 格式）。匯入確認過程必須使用符合現代 UI 標準的對話框。

#### Scenario: 匯入 Toby v3/v4 JSON 格式
- **GIVEN** 使用者有 Toby 匯出的 JSON 檔案
- **WHEN** 使用者選擇匯入該檔案
- **THEN** 系統顯示 `TobyImportDialog` 確認對話框
- **THEN** 對話框樣式必須遵循 Modern Dialog UI Standards (rounded-xl, backdrop-blur)
- **THEN** 系統轉換資料結構並執行匯入
