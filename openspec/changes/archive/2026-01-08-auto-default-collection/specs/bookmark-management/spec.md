# Spec Delta: Bookmark Management

## MODIFIED Requirements

### Requirement: 階層式組織架構
系統必須（SHALL）支援四層式書籤組織架構：Organizations（組織）、Categories（類別/集合）、Subcategories（子類別/群組）、Webpages（網頁卡片）。

#### Scenario: 建立新組織
- **WHEN** 使用者建立新組織
- **THEN** 系統產生唯一 ID（格式：`o_` + timestamp）
- **THEN** 允許使用者設定組織名稱和顏色（可選）
- **THEN** 該組織出現在組織切換器中

#### Scenario: 建立新組織時自動創建預設類別
- **WHEN** 使用者建立新組織
- **THEN** 系統自動創建名為 "General" 的預設類別
- **THEN** 該預設類別的 `organizationId` 自動關聯到新組織的 ID
- **THEN** 該預設類別的 `order` 設為 0
- **THEN** 該預設類別立即顯示在左側邊欄（當該組織被選中時）
- **THEN** 使用者可以立即在該預設類別下新增群組和卡片

#### Scenario: 匯入資料時不重複創建預設類別
- **GIVEN** 使用者正在匯入包含組織和類別的 JSON 資料
- **WHEN** 匯入流程創建新組織
- **THEN** 系統跳過自動創建預設類別（避免與匯入資料中的類別重複）
- **THEN** 匯入的類別資料正確關聯到對應的組織

#### Scenario: 建立類別並關聯組織
- **WHEN** 使用者在組織 A 下建立新類別
- **THEN** 系統產生唯一 ID（格式：`c_` + timestamp）
- **THEN** 該類別的 `organizationId` 自動設為組織 A 的 ID
- **THEN** 該類別顯示在左側邊欄（僅當組織 A 被選中時）

#### Scenario: 建立群組並關聯類別
- **WHEN** 使用者在類別 B 下建立新群組
- **THEN** 系統產生唯一 ID（格式：`g_` + timestamp）
- **THEN** 該群組的 `categoryId` 自動設為類別 B 的 ID
- **THEN** 該群組顯示在類別 B 的展開區域

#### Scenario: 新增網頁卡片到群組
- **WHEN** 使用者將網頁加入群組 C
- **THEN** 系統產生唯一 ID（格式：`w_` + timestamp）
- **THEN** 該卡片的 `subcategoryId` 設為群組 C 的 ID
- **THEN** 該卡片的 `category` 設為群組 C 所屬的類別 ID
- **THEN** 卡片顯示在中央區域（當群組 C 被選中時）
