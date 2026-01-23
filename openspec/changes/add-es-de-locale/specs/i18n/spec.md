## ADDED Requirements

### Requirement: Spanish Language Support
系統 SHALL 支援西班牙語 (es) 作為介面語言選項。

#### Scenario: 選擇西班牙語
- **WHEN** 使用者在語言設定中選擇「Español」
- **THEN** 介面顯示西班牙語翻譯

#### Scenario: 瀏覽器語系為西班牙語
- **WHEN** 使用者首次開啟應用程式
- **AND** 瀏覽器語系為 `es` 或 `es-*`
- **THEN** 系統自動將語言設為 `es`

### Requirement: German Language Support
系統 SHALL 支援德語 (de) 作為介面語言選項。

#### Scenario: 選擇德語
- **WHEN** 使用者在語言設定中選擇「Deutsch」
- **THEN** 介面顯示德語翻譯

#### Scenario: 瀏覽器語系為德語
- **WHEN** 使用者首次開啟應用程式
- **AND** 瀏覽器語系為 `de` 或 `de-*`
- **THEN** 系統自動將語言設為 `de`
