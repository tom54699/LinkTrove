# Change: 基礎互動防護（右鍵阻擋＋按鈕文字不可選取）

## Why
降低一般使用者在擴充功能頁面透過右鍵與選取文字進行複製的機率，增加基本防護門檻。

## What Changes
- 擴充功能頁面（newtab/popup）阻擋瀏覽器右鍵選單
- 按鈕類型文字不可被選取（連結文字不受影響）

## Impact
- Affected specs: ui-interaction
- Affected code: src/app/AppContext.tsx, src/index.css
