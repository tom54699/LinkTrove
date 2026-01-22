## ADDED Requirements

### Requirement: Browser Locale Detection
系統 SHALL 在初次使用時根據瀏覽器語系自動設定預設語言。

#### Scenario: 瀏覽器語系為支援的語言
- **WHEN** 使用者首次開啟應用程式
- **AND** 瀏覽器語系為 `zh-TW` 或 `zh_TW`
- **THEN** 系統自動將語言設為 `zh_TW`

#### Scenario: 瀏覽器語系為不支援的語言
- **WHEN** 使用者首次開啟應用程式
- **AND** 瀏覽器語系不在支援清單中（如 `ja`、`ko`）
- **THEN** 系統 fallback 到 `en`

#### Scenario: 已有儲存的語系偏好
- **WHEN** 使用者開啟應用程式
- **AND** `chrome.storage` 中已有儲存的語系偏好
- **THEN** 使用儲存的語系，忽略瀏覽器語系偵測
