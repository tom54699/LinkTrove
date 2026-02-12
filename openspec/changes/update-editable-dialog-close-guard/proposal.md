# Change: 統一可編輯彈窗的防誤關閉行為（排除 Settings 主彈窗）

## Why
目前多個含輸入欄位的彈窗採用「點遮罩即關閉」行為。當使用者在 input/textarea 內按住滑鼠拖曳選字，放開時若落在遮罩區，彈窗會被誤關，造成編輯中斷與資料風險。

## What Changes
- 新增共用的可編輯彈窗關閉守門邏輯（shared hook），統一「外點關閉」判定。
- 只在「按下與放開都發生於遮罩」時才視為外點關閉。
- 使用者若從彈窗內欄位開始拖曳選字，即使放開在遮罩，不應關閉彈窗。
- 第一批套用於非 Settings 的可編輯彈窗：
  - 新增 Collection、新增 Organization
  - 編輯 Collection（sidebar）
  - 管理 Organization（名稱/顏色）
  - 卡片編輯（WebpageCard）
  - Share 設定、Token 設定
  - Move Selected Dialog
  - HTML/Toby 匯入命名彈窗（App 層）
- 明確排除本次範圍：`SettingsModal` 與其內部 `TemplatesManager`。

## Impact
- Affected specs: `bookmark-management`, `import-export`
- Affected code:
  - `src/app/App.tsx`
  - `src/app/sidebar/sidebar.tsx`
  - `src/app/sidebar/OrganizationNav.tsx`
  - `src/app/webpages/WebpageCard.tsx`
  - `src/app/groups/share/dialogs/ShareDialog.tsx`
  - `src/app/groups/share/dialogs/TokenDialog.tsx`
  - `src/app/webpages/MoveSelectedDialog.tsx`
  - 新增 shared hook 檔案（路徑待實作時決定）
- Non-goals:
  - 不調整 `src/app/ui/SettingsModal.tsx`
  - 不改動資料模型與儲存流程
