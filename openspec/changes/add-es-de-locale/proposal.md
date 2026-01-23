# Change: 新增西班牙語和德語支援

## Why
擴展歐洲市場，西班牙語涵蓋西班牙+拉丁美洲，德語涵蓋德國/奧地利/瑞士，都是 Chrome 高市佔區域。

## What Changes
- 新增 `public/_locales/es/messages.json` 西班牙語翻譯
- 新增 `public/_locales/de/messages.json` 德語翻譯
- 更新 `LanguageProvider.tsx` 支援 `es` 和 `de` 語系

## Impact
- Affected code:
  - `src/app/i18n/LanguageProvider.tsx`
  - `public/_locales/es/messages.json` (新增)
  - `public/_locales/de/messages.json` (新增)
- No breaking changes
