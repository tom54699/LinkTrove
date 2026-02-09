# Drag-Drop Spec Delta

## ADDED Requirements

### Requirement: 垂直拖曳位置判斷
系統必須（SHALL）在垂直拖曳（往上或往下）時，根據滑鼠的 X 和 Y 座標準確判斷 ghost 插入位置，與水平拖曳使用一致的邏輯。

#### Scenario: 往上拖曳到上一行
- **GIVEN** 當前卡片在第二行，位置 index 為 5
- **WHEN** 使用者向上拖曳卡片，滑鼠進入第一行的區域
- **AND** 滑鼠 X 座標在第一行的第 3 張卡片中心點附近
- **THEN** ghost 預覽應出現在第一行的第 3 張卡片位置（index 2 或 3）
- **AND** ghost 不應直接跳到第一行的最左側（行首）

#### Scenario: 往下拖曳到下一行
- **GIVEN** 當前卡片在第一行，位置 index 為 2
- **WHEN** 使用者向下拖曳卡片，滑鼠進入第二行的區域
- **AND** 滑鼠 X 座標在第二行的第 2 張卡片中心點附近
- **THEN** ghost 預覽應出現在第二行的第 2 張卡片位置
- **AND** ghost 位置應隨滑鼠 X 座標實時調整，不應固定在行首

#### Scenario: 行間區域的位置判斷
- **GIVEN** 使用者正在拖曳卡片
- **WHEN** 滑鼠位於兩行之間的間隙區域（垂直間距 ≤20px）
- **THEN** 系統判斷目標行（靠近上方或下方）
- **AND** 根據滑鼠 X 座標在目標行內找到合適的插入位置
- **AND** 插入位置判斷應使用與同行拖曳相同的中心點邏輯

#### Scenario: 垂直與水平拖曳邏輯一致性
- **GIVEN** 系統實作了統一的插入位置計算邏輯
- **WHEN** 使用者在任意方向（上、下、左、右、斜向）拖曳卡片
- **THEN** ghost 位置判斷都基於：
  1. 目標行判斷（Y 座標）
  2. 行內位置判斷（X 座標 vs 卡片中心點）
  3. Hysteresis 防抖（避免中心點附近頻繁跳動）
- **AND** 不應存在針對特定方向的特殊處理邏輯

## Implementation Notes
- 移除 `CardGrid.tsx:250-252` 的 `betweenRows` 特殊處理
- 保持 `computeGhostIndex` 函數的其他邏輯不變
- 確保 Hysteresis 緩衝區（buffer = 20）對所有方向都生效
