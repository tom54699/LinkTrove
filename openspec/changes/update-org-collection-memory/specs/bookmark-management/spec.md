## MODIFIED Requirements
### Requirement: 多組織支援
系統必須（SHALL）支援使用者建立和切換多個組織，各組織的資料完全獨立，且必須記憶各組織的狀態。

#### Scenario: 切換組織時更新視圖
- **GIVEN** 系統包含組織 A（包含類別 C1, C2）和組織 B（包含類別 C3）
- **WHEN** 使用者切換到組織 A
- **THEN** 左側邊欄只顯示類別 C1, C2
- **THEN** 系統將選擇狀態（`selectedOrganizationId = A`）儲存到 chrome.storage.local

#### Scenario: 重新開啟時恢復組織選擇
- **GIVEN** 使用者上次選擇的組織為 A
- **WHEN** 使用者重新開啟新分頁
- **THEN** 系統從 chrome.storage.local 讀取 `selectedOrganizationId`
- **THEN** 自動切換到組織 A
- **THEN** 顯示組織 A 的類別和卡片

#### Scenario: 刪除組織時清理關聯資料
- **GIVEN** 組織 A 包含類別 C1, C2 和多張卡片
- **WHEN** 使用者刪除組織 A
- **THEN** 系統提示確認（警告：將刪除所有關聯資料）
- **WHEN** 使用者確認刪除
- **THEN** 系統刪除所有 `organizationId = A` 的類別
- **THEN** 系統刪除所有屬於這些類別的群組和卡片
- **THEN** 系統自動切換到另一個組織（若存在）

#### Scenario: 切換組織時恢復上次停留的 Collection
- **GIVEN** 使用者在組織 A 選擇了類別 C2
- **WHEN** 使用者切換到組織 B，選擇了類別 C3
- **WHEN** 使用者再次切換回組織 A
- **THEN** 系統自動恢復顯示類別 C2（而不是 C1）
- **THEN** 此狀態在重新開啟應用程式後必須（SHALL）保持
