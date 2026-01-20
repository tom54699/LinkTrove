## MODIFIED Requirements
### Requirement: 卡片順序保存
系統必須（SHALL）為每個 Subcategory（群組）獨立保存 Webpages（卡片）的顯示順序，並在順序資料缺漏時自動修復以保持穩定顯示。

#### Scenario: 拖放排序後持久化
- **WHEN** 使用者在群組 A 拖放卡片調整順序
- **THEN** 系統立即將該群組的卡片 ID 順序陣列儲存到 IndexedDB 的 `orders.subcategories[groupId]`
- **THEN** 視覺上卡片順序立即更新

#### Scenario: 重新載入後順序保持
- **GIVEN** 群組 A 的卡片順序為 [card3, card1, card2]
- **WHEN** 使用者關閉並重新開啟新分頁
- **THEN** 系統從 IndexedDB 讀取順序資訊
- **THEN** 群組 A 的卡片以 [card3, card1, card2] 順序顯示

#### Scenario: 跨群組移動卡片時更新順序
- **GIVEN** 卡片 X 原本在群組 A 的順序陣列中
- **WHEN** 使用者將卡片 X 拖放到群組 B
- **THEN** 系統從群組 A 的順序陣列中移除卡片 X
- **THEN** 系統將卡片 X 加入群組 B 的順序陣列（位置由拖放位置決定）
- **THEN** 兩個群組的順序資訊都更新到 IndexedDB

#### Scenario: 順序資料缺漏時自動補齊
- **GIVEN** 群組 A 目前有卡片 [card1, card2, card3]
- **GIVEN** `orders.subcategories[A]` 缺少 card2
- **WHEN** 系統載入或同步完成
- **THEN** 系統將缺漏卡片追加至順序尾端（依 createdAt 或原始順序）
- **THEN** 系統寫回補齊後的 `orders.subcategories[A]`
- **THEN** 卡片所屬群組（subcategoryId）不變
