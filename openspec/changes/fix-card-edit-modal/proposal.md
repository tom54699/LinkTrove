# Change: 修復卡片編輯對話框的兩個問題

## Why
卡片編輯對話框有兩個問題：
1. `cbfbe00` 重構 UI 時遺漏了 Description（Note）輸入欄位
2. `9332623` 修改 useEffect 依賴後，自動儲存會導致用戶輸入被重置（回朔問題）

## What Changes
- **修復 1**：在 `TobyLikeCard.tsx` 編輯 Modal 中加回 Note 輸入欄位（Title 和 URL 之間）
- **修復 2**：改用 ref 追蹤 Modal 開啟狀態，只在 Modal 從關閉變開啟時初始化表單值，避免 props 更新時覆蓋用戶輸入

## Impact
- Affected specs: `bookmark-management`（卡片元資料管理需求）
- Affected code: `src/app/webpages/TobyLikeCard.tsx`

## Root Cause Analysis
| 問題 | 引入 Commit | 日期 |
|------|-------------|------|
| Note 欄位消失 | `cbfbe00` | 2026-01-13 |
| 輸入回朔 | `9332623` | 2025-09-23 |
