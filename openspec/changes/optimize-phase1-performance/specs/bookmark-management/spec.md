## ADDED Requirements

### Requirement: Groups 列表渲染性能優化
系統必須（SHALL）使用 memoization 優化 Groups 列表渲染，避免重複計算以提升大量卡片和群組時的性能。

#### Scenario: 使用 useMemo 預先分組卡片
- **GIVEN** 系統包含 500 張卡片分布在 10 個 groups
- **WHEN** 系統渲染 GroupsView 組件
- **THEN** 系統使用 `useMemo` 一次性將所有 items 分組為 `Map<groupId, items[]>`
- **THEN** 避免在每個 group render 時重複執行 `items.filter(...)`
- **THEN** 計算複雜度從 O(items × groups) 降低為 O(items)

#### Scenario: Groups render 時直接查 Map
- **GIVEN** `groupedItems` Map 已建立完成
- **WHEN** 系統渲染每個 group（`groups.map((g) => ...)`）
- **THEN** 系統直接使用 `groupedItems.get(g.id) || []` 取得該 group 的卡片
- **THEN** 不執行任何 filter 操作
- **THEN** 每個 group 的渲染時間 <2ms（vs 優化前 >20ms）

#### Scenario: Items 變動時自動重新分組
- **GIVEN** `groupedItems` 的 dependencies 為 `[items, categoryId]`
- **WHEN** 使用者新增、刪除或移動卡片（items 變動）
- **THEN** `useMemo` 自動重新執行分組邏輯
- **THEN** 確保 `groupedItems` 始終反映最新的資料狀態

#### Scenario: 卡片計數顯示正確
- **GIVEN** group A 包含 15 張卡片
- **WHEN** 系統渲染 group A 的標題列
- **THEN** 系統使用 `groupedItems.get(g.id)?.length || 0` 取得計數
- **THEN** 顯示「15」作為卡片數量徽章
- **THEN** 避免重複 filter 造成的計算開銷

#### Scenario: 大量 groups 渲染性能
- **GIVEN** 系統包含 500 張卡片分布在 20 個 groups
- **WHEN** 系統完整渲染 GroupsView
- **THEN** 分組計算只執行一次（useMemo）
- **THEN** 每個 group 直接查 Map（O(1)）
- **THEN** 總渲染時間 <100ms（vs 優化前 >500ms）
- **THEN** 用戶感受到流暢的列表渲染體驗
