# Change: 新增簡體中文和韓語支援

## Why
擴展國際化支援，簡體中文和韓語是重要的目標市場。

## What Changes
- 新增 `public/_locales/zh_CN/messages.json` 簡體中文翻譯
- 新增 `public/_locales/ko/messages.json` 韓語翻譯
- 更新 `LanguageProvider.tsx` 支援 `zh_CN` 和 `ko` 語系

## Impact
- Affected code:
  - `src/app/i18n/LanguageProvider.tsx`
  - `public/_locales/zh_CN/messages.json` (新增)
  - `public/_locales/ko/messages.json` (新增)
- No breaking changes
