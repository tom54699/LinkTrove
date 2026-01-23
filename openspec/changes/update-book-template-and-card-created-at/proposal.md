# Change: 還原書籍模板預設欄位並在卡片翻面顯示時間資訊

## Why
書籍模板預設欄位在 UI 重構後被縮減，與書籍 metadata 規格不一致；同時卡片缺少新增/最後編輯時間的可見性，使用者難以確認資料建立與更新時點。

## What Changes
- 還原「書籍模板」快速建立欄位為 8 個固定鍵名
- 在卡片翻面背面顯示「新增時間 / 最後編輯時間」（唯讀，支援 i18n）
- 將原「移動」圖示改為翻面觸發（移除原功能）
- WebpageCard 資料結構補上 createdAt/updatedAt 以供 UI 顯示

## Impact
- Affected specs: templates, bookmark-management
- Affected code: src/app/templates/TemplatesManager.tsx, src/app/webpages/WebpageCard.tsx, src/app/webpages/WebpagesProvider.tsx, public/_locales/*/messages.json, src/app/webpages/__tests__/*
