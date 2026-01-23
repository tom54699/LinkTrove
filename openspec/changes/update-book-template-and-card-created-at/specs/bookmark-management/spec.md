## ADDED Requirements

### Requirement: 卡片翻面顯示時間資訊
系統必須（SHALL）在卡片背面（翻面）顯示該卡片的新增時間（createdAt）與最後編輯時間（updatedAt），並以唯讀方式呈現。

#### Scenario: 翻面查看時間資訊
- **GIVEN** 卡片包含 createdAt 與 updatedAt 時間戳
- **WHEN** 使用者點擊卡片右下角的翻面圖示
- **THEN** 卡片翻面顯示「新增時間」與「最後編輯時間」欄位
- **THEN** 欄位文字支援 i18n（依目前語系）
- **THEN** 使用者無法在此欄位修改值

#### Scenario: 翻面狀態下的點擊行為
- **GIVEN** 卡片已翻面
- **WHEN** 使用者點擊卡片主體
- **THEN** 卡片翻回正面
- **THEN** 不開啟卡片 URL
