## ADDED Requirements
### Requirement: Unused Variable Hygiene
專案原始碼在執行 ESLint（含 @typescript-eslint/no-unused-vars 規則）時，正式程式碼檔案不得出現未使用變數/參數警告。

#### Scenario: Lint clean for unused variables
- **WHEN** 開發者執行 ESLint 檢查 src/ 目錄
- **THEN** 不會出現未使用變數/參數的警告
