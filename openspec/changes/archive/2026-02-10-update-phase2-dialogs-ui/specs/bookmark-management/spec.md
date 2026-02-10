## ADDED Requirements

### Requirement: Modern Dialog UI Standards
系統的所有對話框必須（SHALL）遵循現代 UI 規範，以確保視覺一致性與優質的使用者體驗。

#### Scenario: Dialog Container Styling
- **WHEN** 系統顯示對話框（如移動卡片、匯入確認、設定 Token）
- **THEN** 容器圓角必須為 `rounded-xl` (或更高)
- **THEN** 背景必須使用 `bg-[var(--panel)]`
- **THEN** 邊框必須使用 `border-[var(--border)]` (或 `border-white/5`)
- **THEN** 陰影必須為 `shadow-2xl`

#### Scenario: Backdrop Blur Effect
- **WHEN** 對話框開啟時
- **THEN** 背景遮罩必須具有 `backdrop-blur-sm` (或更高) 的毛玻璃效果
- **THEN** 遮罩顏色必須為深色半透明（如 `bg-black/70`）

#### Scenario: Form Label Typography
- **WHEN** 對話框中顯示表單標籤
- **THEN** 標籤樣式必須為 `text-xs font-bold text-[var(--muted)] uppercase tracking-wider`
- **THEN** 標籤與輸入框之間必須有適當間距 (如 `mb-1.5`)
