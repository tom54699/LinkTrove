## MODIFIED Requirements

### Requirement: 拖放狀態持久化
系統必須（SHALL）確保拖放操作的結果即時且可靠地儲存到 IndexedDB。**新卡片建立時必須使用原子操作，一步完成建立、分類設定和排序，避免產生缺少 subcategoryId 的孤兒卡片。**

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

#### Scenario: 從 Open Tabs 拖曳新卡片到群組
- **GIVEN** 使用者從右側 Open Tabs 拖曳一個分頁
- **WHEN** 使用者將分頁放置到群組 G 的特定位置
- **THEN** 系統使用 atomic 操作一步完成：
  - 建立新卡片
  - 設定卡片的 `category` 為群組 G 所屬類別
  - 設定卡片的 `subcategoryId` 為群組 G 的 ID
  - 更新群組 G 的順序列表
- **THEN** 新卡片立即出現在正確位置，無需重新渲染
- **THEN** 不會產生缺少 `subcategoryId` 的孤兒卡片
