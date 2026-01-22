## ADDED Requirements

### Requirement: Japanese Language Support
系統 SHALL 支援日文 (ja) 作為介面語言選項。

#### Scenario: 選擇日文語系
- **WHEN** 使用者在語言設定中選擇「日本語」
- **THEN** 介面顯示日文翻譯

#### Scenario: 瀏覽器語系為日文
- **WHEN** 使用者首次開啟應用程式
- **AND** 瀏覽器語系為 `ja` 或 `ja-JP`
- **THEN** 系統自動將語言設為 `ja`
