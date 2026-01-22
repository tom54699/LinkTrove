# Change: 新增日文語系支援

## Why
擴展國際化支援，日本是 Chrome 擴充功能的主要市場之一，新增日文可以吸引更多用戶。

## What Changes
- 新增 `public/_locales/ja/messages.json` 日文翻譯檔
- 更新 `LanguageProvider.tsx` 支援 `ja` 語系
- 更新 `LANGUAGE_OPTIONS` 新增日文選項

## Impact
- Affected code:
  - `src/app/i18n/LanguageProvider.tsx`
  - `public/_locales/ja/messages.json` (新增)
- UX: 使用者可以選擇日文介面
- No breaking changes
