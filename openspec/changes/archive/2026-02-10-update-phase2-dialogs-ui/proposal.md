# Change: Update Phase 2 Dialogs UI

## Why
Phase 2 中的對話框（TobyImportDialog, TokenDialog, ShareDialog, ShareResultDialog, MoveSelectedDialog, ConflictDialog）目前仍使用舊版設計語言，與 Phase 1 已更新的 UI（如 SettingsModal, OrganizationNav）及專案整體的現代感不符。為了提升視覺一致性並確保 Dracula 配色的準確應用，需要進行 UI 重構。

## What Changes
- **UI 基礎設施升級**:
  - 容器圓角從 `rounded-lg` 或 `rounded` 升級為 `rounded-xl` 或 `rounded-2xl`。
  - 背景遮罩加入 `backdrop-blur-sm`。
  - 邊框與背景色統一使用 CSS 變數 (`--border`, `--panel`, `--bg`)。
- **表單優化**:
  - 標籤改用 `text-xs font-bold text-[var(--muted)] uppercase tracking-wider` 樣式。
  - 輸入框改用 `rounded-lg` 並統一內距與焦點效果。
- **特定對話框增強**:
  - **MoveSelectedDialog**: 更新選擇器樣式。
  - **TokenDialog**: 加入安全 Callout 區塊。
  - **ConflictDialog**: 改進數據對比 Grid。
  - **ShareResultDialog**: 強化成功狀態視覺與 URL 複製體驗。

## Impact
- Affected specs: `bookmark-management`, `import-export`, `settings`, `search`
- Affected code:
  - `src/app/webpages/MoveSelectedDialog.tsx`
  - `src/app/ui/ConflictDialog.tsx`
  - `src/app/groups/share/dialogs/TokenDialog.tsx`
  - `src/app/groups/share/dialogs/ShareDialog.tsx`
  - `src/app/groups/share/dialogs/ShareResultDialog.tsx`
  - `src/app/groups/import/dialogs/TobyImportDialog.tsx`
