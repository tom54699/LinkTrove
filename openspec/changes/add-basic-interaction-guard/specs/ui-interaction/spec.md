## ADDED Requirements
### Requirement: 擴充功能頁面基礎互動防護
系統必須（SHALL）在 LinkTrove 擴充功能頁面阻擋瀏覽器右鍵選單。

#### Scenario: 右鍵選單被阻擋
- **GIVEN** 使用者在 LinkTrove 擴充功能頁面
- **WHEN** 使用者觸發右鍵（contextmenu）
- **THEN** 系統不顯示瀏覽器右鍵選單

### Requirement: 按鈕文字不可被選取
系統必須（SHALL）讓擴充功能頁面中的按鈕類型文字無法被選取，且不影響連結文字的選取。

#### Scenario: 按鈕文字選取被阻擋
- **GIVEN** 按鈕元件出現在 LinkTrove 擴充功能頁面
- **WHEN** 使用者嘗試拖曳選取按鈕文字
- **THEN** 文字選取不成立

#### Scenario: 連結文字仍可選取
- **GIVEN** 連結文字出現在 LinkTrove 擴充功能頁面
- **WHEN** 使用者嘗試選取連結文字
- **THEN** 文字可被正常選取
