## ADDED Requirements

### Requirement: French Language Support
系統 SHALL 支援法語 (fr) 作為介面語言選項。

#### Scenario: 選擇法語
- **WHEN** 使用者在語言設定中選擇「Français」
- **THEN** 介面顯示法語翻譯

#### Scenario: 瀏覽器語系為法語
- **WHEN** 使用者首次開啟應用程式
- **AND** 瀏覽器語系為 `fr` 或 `fr-*`
- **THEN** 系統自動將語言設為 `fr`

### Requirement: Portuguese (Brazil) Language Support
系統 SHALL 支援葡萄牙語巴西 (pt_BR) 作為介面語言選項。

#### Scenario: 選擇葡萄牙語
- **WHEN** 使用者在語言設定中選擇「Português」
- **THEN** 介面顯示葡萄牙語翻譯

#### Scenario: 瀏覽器語系為葡萄牙語
- **WHEN** 使用者首次開啟應用程式
- **AND** 瀏覽器語系為 `pt` 或 `pt-BR`
- **THEN** 系統自動將語言設為 `pt_BR`
