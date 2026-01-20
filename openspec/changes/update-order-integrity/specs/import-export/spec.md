## MODIFIED Requirements
### Requirement: 順序保留機制
系統必須（SHALL）在所有匯入匯出操作中保留卡片的顯示順序，並在順序資料缺漏時自動正規化與持久化。

#### Scenario: 匯出時包含順序資訊
- **GIVEN** 每個群組都有自訂的卡片順序
- **WHEN** 使用者匯出資料
- **THEN** JSON 包含 `orders.subcategories` 物件
- **THEN** 每個群組的順序陣列完整記錄（例如：`{"g_123": ["w_1", "w_2", "w_3"]}`）

#### Scenario: 匯入時恢復順序
- **GIVEN** 匯入檔案包含順序資訊
- **WHEN** 使用者匯入該檔案
- **THEN** 系統優先使用 `orders.subcategories` 的順序資訊
- **THEN** 若順序資訊缺失或不完整，系統以 createdAt 或匯入順序補齊缺漏卡片
- **THEN** 系統將補齊後的順序寫回 `orders.subcategories`

#### Scenario: Toby 匯入時從 index 欄位建立順序
- **GIVEN** Toby JSON 中每張卡片有 `index` 欄位
- **WHEN** 系統執行匯入
- **THEN** 系統將所有卡片按 `index` 排序
- **THEN** 系統為每個群組生成順序陣列寫入 `orders.subcategories`
- **THEN** 匯入後顯示順序與 Toby 一致

#### Scenario: HTML 匯入時按文件順序排列
- **GIVEN** HTML 書籤檔案中書籤項目有特定出現順序
- **WHEN** 系統執行匯入
- **THEN** 系統按 HTML 文件中的出現順序建立卡片
- **THEN** 系統生成對應的順序陣列
- **THEN** 匯入後顯示順序與 HTML 檔案一致

#### Scenario: 移除不存在的順序項目
- **GIVEN** `orders.subcategories[G]` 包含已不存在的卡片 ID
- **WHEN** 系統匯入或正規化順序
- **THEN** 系統移除不存在的卡片 ID
- **THEN** 系統寫回修正後的 `orders.subcategories[G]`

## ADDED Requirements
### Requirement: 合併與同步順序一致性
系統必須（SHALL）在合併與同步流程中保持順序資訊完整，避免因單邊覆寫導致順序缺漏。

#### Scenario: 合併兩端順序時補齊缺漏
- **GIVEN** 本機與雲端對同一群組有不同順序陣列
- **WHEN** 系統執行合併
- **THEN** 系統以較新的順序作為基準
- **THEN** 系統將另一端缺漏的卡片 ID 追加至尾端
- **THEN** 合併後順序不遺漏任何現存卡片

#### Scenario: 同步完成後正規化順序
- **GIVEN** 同步完成後某群組順序資訊不完整
- **WHEN** 系統完成還原或合併流程
- **THEN** 系統執行順序正規化並寫回 `orders.subcategories`
- **THEN** 卡片所屬群組（subcategoryId）不變
