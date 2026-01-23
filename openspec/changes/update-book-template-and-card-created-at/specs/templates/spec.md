## ADDED Requirements

### Requirement: 書籍模板快速建立欄位
系統必須（SHALL）在模板管理的「書籍模板」快速建立功能中，預先建立 8 個固定欄位鍵名，且順序固定如下：
1) bookTitle
2) author
3) serialStatus
4) genre
5) wordCount
6) rating
7) siteName
8) lastUpdate

#### Scenario: 點擊書籍模板快速建立
- **WHEN** 使用者在模板管理點擊「書籍模板」快速建立
- **THEN** 系統建立模板並包含上述 8 個欄位
- **THEN** 欄位 key 與書籍 metadata 規格一致，可直接對應 `webpage.meta`

### Requirement: 書籍模板欄位鎖定
系統必須（SHALL）在書籍模板中鎖定固定欄位，禁止修改欄位內容與新增/刪除欄位。

#### Scenario: 編輯書籍模板固定欄位
- **GIVEN** 使用者正在編輯書籍模板
- **WHEN** 使用者嘗試修改固定欄位的顯示名稱、必填狀態或選項
- **THEN** 系統顯示欄位為唯讀且不可修改

#### Scenario: 變更書籍模板欄位結構
- **GIVEN** 使用者正在編輯書籍模板
- **WHEN** 使用者嘗試新增或刪除固定欄位
- **THEN** 系統阻止操作並保持欄位結構不變

## REMOVED Requirements

### Requirement: 工具模板快速建立
系統不再提供「工具模板」的快速建立預設。

#### Scenario: 檢視模板預設
- **WHEN** 使用者檢視模板預設按鈕
- **THEN** 系統僅顯示「書籍模板」預設

### Requirement: 模板欄位預設值設定
系統不再提供模板欄位的預設值設定與編輯功能。

#### Scenario: 編輯模板欄位
- **WHEN** 使用者在模板管理編輯欄位
- **THEN** 系統不顯示「預設值」相關輸入介面
