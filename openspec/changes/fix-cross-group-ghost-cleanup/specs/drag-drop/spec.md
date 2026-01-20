## MODIFIED Requirements

### Requirement: 跨群組拖放移動
系統必須（SHALL）支援將卡片從一個群組拖放到另一個群組，並正確更新卡片的歸屬和順序資訊。拖曳結束時，系統必須確保所有 CardGrid 實例的 ghost 預覽狀態都被正確清理。

#### Scenario: 將卡片拖放到另一個群組
- **GIVEN** 卡片 X 屬於群組 A
- **GIVEN** 群組 A 的順序為 [cardX, cardY]
- **GIVEN** 群組 B 的順序為 [card1, card2]
- **WHEN** 使用者將卡片 X 拖放到群組 B（在 card1 和 card2 之間）
- **THEN** 卡片 X 的 `subcategoryId` 更新為群組 B 的 ID
- **THEN** 卡片 X 的 `category` 更新為群組 B 所屬的類別 ID
- **THEN** 群組 A 的順序更新為 `["cardY"]`（移除 cardX）
- **THEN** 群組 B 的順序更新為 `["card1", "cardX", "card2"]`（插入 cardX）
- **THEN** 兩個群組的 IndexedDB 資料都更新

#### Scenario: 拖放到空群組
- **GIVEN** 群組 C 目前沒有任何卡片
- **WHEN** 使用者將卡片 Z 拖放到群組 C
- **THEN** 卡片 Z 的 `subcategoryId` 更新為群組 C 的 ID
- **THEN** 群組 C 的順序建立為 `["cardZ"]`
- **THEN** 群組 C 顯示該卡片

#### Scenario: 跨群組拖放時更新卡片計數
- **GIVEN** 群組 A 有 5 張卡片，群組 B 有 3 張卡片
- **WHEN** 使用者將卡片從群組 A 拖放到群組 B
- **THEN** 群組 A 的卡片計數顯示為 4
- **THEN** 群組 B 的卡片計數顯示為 4
- **THEN** UI 即時更新計數數字

#### Scenario: 跨類別移動卡片
- **GIVEN** 卡片 X 屬於類別 A 的群組 A1
- **WHEN** 使用者將卡片 X 拖放到類別 B 的群組 B1
- **THEN** 卡片 X 的 `category` 更新為類別 B 的 ID
- **THEN** 卡片 X 的 `subcategoryId` 更新為群組 B1 的 ID
- **THEN** 兩個類別的資料都正確更新

#### Scenario: 跨群組拖放結束時清理所有 ghost 狀態
- **GIVEN** 使用者從群組 A 拖曳卡片 X
- **GIVEN** 群組 B 顯示 ghost 預覽（ghostTab, ghostIndex 等狀態已設置）
- **WHEN** 使用者在群組 B 放下卡片（或拖曳以任何方式結束）
- **THEN** 系統廣播 `lt:ghost-clear` 事件
- **THEN** 所有 CardGrid 實例清理 ghost 相關狀態（ghostTab, ghostType, ghostIndex, isOver, draggingCardId）
- **THEN** 無論異步操作是否完成，ghost 預覽都不會殘留在畫面上
