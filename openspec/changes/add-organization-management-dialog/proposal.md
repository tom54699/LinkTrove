# Change: 新增 Organizations 管理按鈕與對話框

## Why
目前僅提供右鍵操作刪除組織，使用者回饋不直觀，需要明顯的管理入口來降低操作成本與誤解。

## What Changes
- 在組織導覽區新增「管理 Organizations」按鈕
- 提供管理對話框，列出所有組織並提供重新命名與刪除入口
- 刪除流程沿用既有確認對話框與錯誤提示行為

## Impact
- Affected specs: bookmark-management
- Affected code: src/app/sidebar/OrganizationNav.tsx
