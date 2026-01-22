## ADDED Requirements

### Requirement: Simplified Chinese Language Support
系統 SHALL 支援簡體中文 (zh_CN) 作為介面語言選項。

#### Scenario: 選擇簡體中文
- **WHEN** 使用者在語言設定中選擇「简体中文」
- **THEN** 介面顯示簡體中文翻譯

#### Scenario: 瀏覽器語系為簡體中文
- **WHEN** 使用者首次開啟應用程式
- **AND** 瀏覽器語系為 `zh-CN` 或 `zh`
- **THEN** 系統自動將語言設為 `zh_CN`

### Requirement: Korean Language Support
系統 SHALL 支援韓語 (ko) 作為介面語言選項。

#### Scenario: 選擇韓語
- **WHEN** 使用者在語言設定中選擇「한국어」
- **THEN** 介面顯示韓語翻譯

#### Scenario: 瀏覽器語系為韓語
- **WHEN** 使用者首次開啟應用程式
- **AND** 瀏覽器語系為 `ko` 或 `ko-KR`
- **THEN** 系統自動將語言設為 `ko`
