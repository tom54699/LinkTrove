# Change: Settings 語系選單改為自訂下拉並顯示國旗

## Why
目前設定頁的語系選擇 UI 破版且與既有設計不一致，使用體驗受影響。

## What Changes
- 將語系選擇改為自訂下拉選單（取代目前按鈕列）
- 下拉選項前顯示對應國旗
- 維持語言切換與儲存行為不變（僅 UI 呈現調整）

## Impact
- Affected specs: `settings`
- Affected code: `src/app/ui/SettingsModal.tsx`, `src/app/i18n/LanguageProvider.tsx`（語系選項資料若需擴充）
