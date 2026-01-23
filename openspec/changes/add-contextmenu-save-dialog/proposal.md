# Change: 右鍵選單保存 + 階層式選單選擇目標

## Why
使用者希望在任何頁面透過右鍵快速保存，並且**每次都要選擇** Organization → Collection → Group，且儲存順序必須與拖拉一致（追加到群組末端）。

## What Changes
- 新增右鍵選單項目：保存目前分頁、保存連結、保存選取文字
- 右鍵選單內直接展開 Organization → Collection → Group（不彈出視窗）
- 保存邏輯共用拖拉儲存流程，並固定追加到最後順位
- 保存後自動補抓頁面 meta（與卡片新增流程一致）
- 選取文字不寫入卡片描述

## Impact
- Affected specs: bookmark-management
- Affected code: background service worker、contextMenus 動態選單、資料儲存服務（共用拖拉邏輯）、manifest 權限
