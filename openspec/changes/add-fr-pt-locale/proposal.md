# Change: 新增法語和葡萄牙語支援

## Why
擴展歐洲和拉丁美洲市場，法語涵蓋法國/加拿大/比利時，葡萄牙語涵蓋巴西龐大用戶群。

## What Changes
- 新增 `public/_locales/fr/messages.json` 法語翻譯
- 新增 `public/_locales/pt_BR/messages.json` 葡萄牙語(巴西)翻譯
- 更新 `LanguageProvider.tsx` 支援 `fr` 和 `pt_BR` 語系

## Impact
- Affected code:
  - `src/app/i18n/LanguageProvider.tsx`
  - `public/_locales/fr/messages.json` (新增)
  - `public/_locales/pt_BR/messages.json` (新增)
- No breaking changes
