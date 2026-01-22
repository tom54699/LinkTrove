## ADDED Requirements

### Requirement: Sidebar Collapse
系統 SHALL 提供側邊欄收合功能，讓使用者可以隱藏 Organization Rail 和 Collections Sidebar 以獲得更大的內容區域。

#### Scenario: 收合側邊欄
- **WHEN** 使用者點擊 Collections Sidebar 頂部的收合按鈕（«）
- **THEN** Organization Rail 和 Collections Sidebar 一起平滑隱藏
- **AND** 左側顯示一個置中的小把手

#### Scenario: 展開側邊欄
- **WHEN** 使用者點擊收合狀態的小把手（»）
- **THEN** Organization Rail 和 Collections Sidebar 一起平滑展開
- **AND** 展開後左邊距維持原本的 16px

#### Scenario: 動畫效果
- **WHEN** 側邊欄收合或展開時
- **THEN** 使用 300ms ease-out 的平滑過渡動畫
