# Change: 新增多國語系支援 (i18n)

## Why

LinkTrove 目前所有 UI 文字皆為硬編碼的繁體中文，無法讓非中文使用者使用。為了擴大使用者族群，需要建立多語言切換機制，首階段支援繁體中文（zh-TW）與英文（en）。

## What Changes

- **新增 Chrome 原生 i18n 基礎架構**：建立 `_locales/` 目錄結構與翻譯檔案
- **新增語言切換 UI**：Settings 中新增語言選項
- **遷移固定 UI 文字**：按鈕、標籤、提示、對話框訊息等
- **新增 React i18n Hook**：建立 `useI18n` hook 簡化翻譯調用
- **更新 manifest.json**：設定 `default_locale`

## Scope Clarification

### 需要翻譯（固定 UI 文字）
- 按鈕標籤：「編輯」「刪除」「取消」「確定」
- 選單項目：「管理 Organizations」「匯入 Toby JSON」
- 對話框訊息：「確定要刪除嗎？」「匯入成功」
- 表單標籤：「模板名稱」「分享標題」
- Toast 提示：「已儲存」「刪除失敗」
- Placeholder 文字

### 不需要翻譯（用戶資料）
- 卡片標題 (title)、URL、描述
- 用戶自訂的 meta 欄位值
- Organization / Category / Group 名稱
- Template 欄位的用戶輸入值

## Impact

- **Affected specs**:
  - `settings` - 新增語言設定選項
  - 新建 `i18n` spec - 國際化功能規格

- **Affected code**:
  - `src/_locales/` - 新建翻譯檔案目錄
  - `src/app/ui/SettingsModal.tsx` - 新增語言切換
  - `src/app/hooks/useI18n.ts` - 新建 i18n hook
  - `src/manifest.json` - 新增 default_locale
  - UI 組件（約 45 個檔案的固定文字）

## Success Criteria

1. Settings 可切換繁中/英文並立即生效
2. 所有固定 UI 文字正確切換顯示
3. 用戶資料內容不受語言設定影響
4. 語言偏好持久化儲存
