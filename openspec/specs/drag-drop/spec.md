# Capability: Drag and Drop

## Purpose
提供直覺的拖放操作介面，讓使用者可以重新排列卡片順序、跨群組移動卡片，並即時持久化變更到 IndexedDB。拖放操作是 LinkTrove 的核心 UX 功能。

## Requirements

### Requirement: 卡片拖放排序
系統必須（SHALL）支援在同一群組內拖放卡片以調整顯示順序，並即時儲存變更。

#### Scenario: 拖動卡片時顯示視覺反饋
- **WHEN** 使用者開始拖動卡片 A
- **THEN** 卡片 A 變為半透明（opacity: 0.5）
- **THEN** 滑鼠游標變為「抓取」圖示
- **THEN** 其他卡片保持正常顯示

#### Scenario: 拖動過程中顯示插入位置
- **GIVEN** 使用者正在拖動卡片 A
- **WHEN** 滑鼠移動到卡片 B 和卡片 C 之間
- **THEN** 系統在 B 和 C 之間顯示插入指示線（藍色虛線）
- **THEN** 其他卡片保持原位

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

### Requirement: 跨群組拖放移動
系統必須（SHALL）支援將卡片從一個群組拖放到另一個群組，並正確更新卡片的歸屬和順序資訊。

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

### Requirement: 拖放區域偵測
系統必須（SHALL）正確偵測有效的拖放目標區域，並提供明確的視覺反饋。

#### Scenario: 懸停在有效拖放區域時高亮顯示
- **GIVEN** 使用者正在拖動卡片
- **WHEN** 滑鼠懸停在其他群組的卡片區域上方
- **THEN** 該群組的背景顏色變為淺藍色（表示可放置）
- **THEN** 顯示「放置到此群組」的提示文字

#### Scenario: 懸停在無效區域時顯示禁止圖示
- **GIVEN** 使用者正在拖動卡片
- **WHEN** 滑鼠移到左側邊欄或右側 Open Tabs 區域
- **THEN** 滑鼠游標變為「禁止」圖示（🚫）
- **THEN** 不顯示插入指示線

#### Scenario: 拖放到無效區域時取消操作
- **GIVEN** 使用者正在拖動卡片
- **WHEN** 使用者在無效區域（如標題列、邊界外）放開滑鼠
- **THEN** 卡片返回原始位置
- **THEN** 順序不變

### Requirement: 拖放效能優化
系統必須（SHALL）確保拖放操作流暢，即使在包含大量卡片的群組中也不卡頓。

#### Scenario: 拖放 100 張卡片的群組時保持流暢
- **GIVEN** 群組包含 100 張卡片
- **WHEN** 使用者拖動其中一張卡片
- **THEN** 拖動過程中幀率保持 >30 FPS
- **THEN** 插入指示線即時更新（延遲 <50ms）
- **THEN** 放下卡片後重新排序在 100ms 內完成

#### Scenario: 批次更新 IndexedDB 避免頻繁寫入
- **GIVEN** 使用者快速連續拖放多張卡片
- **WHEN** 系統偵測到連續操作（間隔 <500ms）
- **THEN** 系統使用 debounce 延遲寫入 IndexedDB（延遲 300ms）
- **THEN** 多次拖放合併為一次 IndexedDB 寫入
- **THEN** UI 立即更新（不等待寫入完成）

#### Scenario: 使用虛擬化處理大量卡片
- **GIVEN** 群組包含 500+ 張卡片
- **WHEN** 使用者開啟該群組
- **THEN** 系統只渲染可見區域的卡片（虛擬化滾動）
- **THEN** 拖放操作不受影響（拖到可見區域外時自動滾動）

### Requirement: 多張卡片批次拖放
系統必須（SHALL）支援同時選擇多張卡片並一次拖放移動。

#### Scenario: 選擇多張卡片
- **WHEN** 使用者按住 Ctrl/Cmd 鍵並點擊多張卡片
- **THEN** 選中的卡片顯示藍色邊框
- **THEN** 顯示選中數量提示（例如：「已選擇 3 張卡片」）

#### Scenario: 拖放多張選中的卡片
- **GIVEN** 使用者選中 3 張卡片（cardA, cardB, cardC）
- **WHEN** 使用者拖動其中任一張卡片
- **THEN** 3 張卡片一起移動（顯示為堆疊效果）
- **WHEN** 使用者放下卡片到新位置
- **THEN** 3 張卡片按原始相對順序插入（保持 A-B-C 順序）
- **THEN** 系統更新順序陣列

#### Scenario: 跨群組批次移動
- **GIVEN** 使用者選中群組 A 的 5 張卡片
- **WHEN** 使用者將選中卡片拖放到群組 B
- **THEN** 5 張卡片的 `subcategoryId` 都更新為群組 B
- **THEN** 群組 A 的順序移除這 5 張卡片
- **THEN** 群組 B 的順序新增這 5 張卡片
- **THEN** 系統使用交易一次更新所有變更

### Requirement: 撤銷拖放操作
系統必須（SHALL）支援撤銷最近一次的拖放操作（Undo）。

#### Scenario: 拖放後立即撤銷
- **GIVEN** 使用者將 cardX 從位置 2 移動到位置 5
- **WHEN** 使用者按下 Ctrl+Z（或點擊撤銷按鈕）
- **THEN** cardX 返回位置 2
- **THEN** 順序恢復為拖放前的狀態
- **THEN** IndexedDB 更新為原始順序

#### Scenario: 撤銷跨群組移動
- **GIVEN** 使用者將 cardX 從群組 A 移動到群組 B
- **WHEN** 使用者按下 Ctrl+Z
- **THEN** cardX 返回群組 A 的原始位置
- **THEN** cardX 的 `subcategoryId` 恢復為群組 A 的 ID
- **THEN** 兩個群組的順序都恢復

#### Scenario: 撤銷堆疊限制
- **GIVEN** 使用者執行了 10 次拖放操作
- **WHEN** 使用者連續按下 Ctrl+Z
- **THEN** 系統最多撤銷最近 5 次操作（限制撤銷堆疊深度）
- **THEN** 超過 5 次的歷史操作無法撤銷

### Requirement: 觸控裝置支援
系統必須（SHALL）支援觸控裝置（平板、觸控螢幕）的拖放操作。

#### Scenario: 長按卡片進入拖放模式
- **GIVEN** 使用者在觸控裝置上使用 LinkTrove
- **WHEN** 使用者長按卡片（持續 >500ms）
- **THEN** 卡片進入拖放模式（視覺反饋與滑鼠拖放相同）
- **THEN** 使用者可移動手指調整卡片位置

#### Scenario: 觸控拖放時自動滾動
- **GIVEN** 使用者在觸控裝置上拖動卡片
- **WHEN** 手指移到螢幕邊緣（上方或下方 10% 區域）
- **THEN** 頁面自動向對應方向滾動
- **THEN** 滾動速度根據距離邊緣的距離調整

#### Scenario: 放開手指完成拖放
- **GIVEN** 使用者在觸控裝置上拖動卡片
- **WHEN** 使用者放開手指
- **THEN** 卡片放置到當前位置
- **THEN** 執行與滑鼠拖放相同的順序更新邏輯

### Requirement: 拖放狀態持久化
系統必須（SHALL）確保拖放操作的結果即時且可靠地儲存到 IndexedDB。

#### Scenario: 拖放完成後立即寫入 IndexedDB
- **WHEN** 使用者完成拖放操作
- **THEN** 系統在 100ms 內將新順序寫入 IndexedDB
- **THEN** 若寫入失敗，系統重試最多 3 次
- **THEN** 若仍失敗，系統顯示錯誤訊息並回滾 UI 狀態

#### Scenario: 離線時拖放操作
- **GIVEN** IndexedDB 可用但網路斷線（未來雲端同步功能）
- **WHEN** 使用者執行拖放操作
- **THEN** 系統正常更新 IndexedDB
- **THEN** 系統標記該變更為「待同步」（未來功能）

#### Scenario: 拖放過程中分頁關閉
- **GIVEN** 使用者正在拖動卡片
- **WHEN** 使用者意外關閉分頁（拖放未完成）
- **THEN** 下次開啟時，順序保持拖放前的狀態（未持久化）
- **THEN** 不會產生部分更新的資料損壞

## Related Documentation
- **技術設計**: `design.md` - 拖放實作細節與程式庫選擇
- **功能文檔**: `/docs/features/drag-drop-storage-display.md` - 拖放排序實作說明
- **相關規格**: `../bookmark-management/spec.md` - 順序管理機制
- **測試案例**: `src/app/__tests__/drag_integration.test.tsx` - 拖放整合測試
