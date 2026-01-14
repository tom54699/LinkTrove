## MODIFIED Requirements
### Requirement: 拖曳視覺回饋
系統必須（SHALL）在拖曳過程中提供清楚的視覺回饋，讓使用者知道目前的操作狀態和目標位置。

#### Scenario: 進入群組時顯示高亮
- **WHEN** 使用者拖曳分頁或卡片進入群組區域
- **THEN** 該群組容器顯示高亮邊框和背景色（accent color）
- **THEN** 系統設定該群組為當前拖曳目標（Active Drop Target）

#### Scenario: 離開群組時移除高亮
- **WHEN** 使用者拖曳離開群組區域
- **THEN** 該群組移除高亮樣式
- **THEN** 系統清除當前拖曳目標狀態

#### Scenario: 放開（Drop）後移除高亮
- **WHEN** 使用者在群組內放開滑鼠（Drop）
- **THEN** 無論操作成功或失敗，該群組必須立即移除高亮樣式
- **THEN** 確保 UI 回復到初始狀態，不殘留任何拖曳視覺效果
