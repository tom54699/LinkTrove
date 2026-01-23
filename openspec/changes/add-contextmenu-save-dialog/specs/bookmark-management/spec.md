## ADDED Requirements

### Requirement: 右鍵選單保存入口
系統必須（SHALL）提供右鍵選單操作，讓使用者可從當前分頁、連結或選取文字啟動保存流程。

#### Scenario: 右鍵選單顯示保存項目
- **WHEN** 使用者在頁面或連結上右鍵
- **THEN** 看到保存目前分頁與保存連結的選單項目
- **AND** 若有選取文字，額外提供保存選取文字的選單項目

### Requirement: 右鍵選單階層式目標選擇
系統必須（SHALL）在右鍵選單內提供 Organization → Collection → Group 的階層式選擇，使用者必須完成選擇才能保存。

#### Scenario: 右鍵選單完成選擇後保存
- **WHEN** 使用者在右鍵選單依序選擇 Organization、Collection、Group
- **THEN** 系統立即保存至指定 Group
- **AND** 不彈出額外視窗

### Requirement: 無可用組織時提供入口
系統必須（SHALL）在沒有任何 Organization 時，於右鍵選單提供開啟 LinkTrove 的入口並提示尚無組織。

#### Scenario: 無組織時顯示開啟入口
- **GIVEN** 系統尚無任何 Organization
- **WHEN** 使用者開啟右鍵選單
- **THEN** 顯示「開啟 LinkTrove」入口
- **AND** 顯示尚無組織的提示項目

### Requirement: 儲存邏輯與拖拉一致
系統必須（SHALL）使用與拖拉新增卡片相同的儲存流程，並將新卡片追加至目標群組的最後順位。

#### Scenario: 保存後追加至末端順位
- **GIVEN** 使用者選擇 Group G 並完成保存
- **WHEN** 系統建立新卡片
- **THEN** 卡片寫入 `webpages` 與對應群組
- **AND** 順序追加至群組 G 的最後位置

### Requirement: 右鍵保存後補抓頁面 meta
系統必須（SHALL）在右鍵保存完成後嘗試擷取頁面 meta，並依卡片流程更新標題與 meta 欄位。

#### Scenario: 保存後自動補抓 meta
- **WHEN** 使用者透過右鍵選單保存分頁
- **THEN** 系統嘗試擷取頁面 meta
- **AND** 依卡片流程更新標題與 meta 欄位

### Requirement: 來源資訊建立卡片
系統必須（SHALL）依保存來源建立卡片，並保留原始頁面/連結的標題與 URL。

#### Scenario: 保存連結
- **GIVEN** 使用者在網頁上右鍵保存連結
- **WHEN** 系統建立卡片
- **THEN** 卡片的 URL 來自連結目標
- **AND** 選取文字不寫入卡片描述
