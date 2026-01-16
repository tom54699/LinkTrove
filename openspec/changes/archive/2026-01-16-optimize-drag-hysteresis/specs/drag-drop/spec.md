## MODIFIED Requirements
### Requirement: 卡片拖放排序
系統必須（SHALL）支援在同一群組內拖放卡片以調整顯示順序，並即時儲存變更。

#### Scenario: 拖動卡片時顯示視覺反饋
- **WHEN** 使用者開始拖動卡片 A
- **THEN** 卡片 A 變為半透明（opacity: 0.5）
- **THEN** 滑鼠游標變為「抓取」圖示
- **THEN** 其他卡片保持正常顯示

#### Scenario: 拖動過程中顯示插入位置
- **GIVEN** 使用者正在拖動卡片 A
- **WHEN** 滑鼠游標超過目標卡片 B 的中心點（Center Point）
- **THEN** 系統判定插入位置變更
- **THEN** 視覺上立即反映新的排序預覽
- **THEN** 系統應包含緩衝區（Buffer）以防止在中心點附近發生頻繁跳動

#### Scenario: 放下卡片時更新順序
- **GIVEN** 群組 G 的原始順序為 [card1, card2, card3, card4]
- **WHEN** 使用者將 card4 拖放到 card1 和 card2 之間
- **THEN** 卡片立即重新排列為 [card1, card4, card2, card3]
- **THEN** 系統更新 IndexedDB 的 `orders.subcategories[G]` 為 `["card1", "card4", "card2", "card3"]`
- **THEN** 視覺反饋消失（半透明和插入線移除）

#### Scenario: 取消拖動操作
- **GIVEN** 使用者正在拖動卡片 A
- **WHEN** 使用者按下 ESC 鍵或將卡片拖到無效區域
- **THEN** 卡片 A 返回原始位置
- **THEN** 順序保持不變
- **THEN** 視覺反饋消失

#### Scenario: 拖放後重新載入保持順序
- **GIVEN** 使用者將群組 G 的卡片順序調整為 [card3, card1, card2]
- **WHEN** 使用者關閉並重新開啟新分頁
- **THEN** 系統從 IndexedDB 讀取 `orders.subcategories[G]`
- **THEN** 群組 G 的卡片以 [card3, card1, card2] 順序顯示
