# Tasks: add-i18n-support

## 1. 基礎架構設置

- [x] 1.1 建立 `public/_locales/en/messages.json` 英文翻譯檔
- [x] 1.2 建立 `public/_locales/zh_TW/messages.json` 繁中翻譯檔
- [x] 1.3 更新 `public/manifest.json` 新增 `default_locale: "en"`
- [x] 1.4 建立 `src/app/i18n/LanguageProvider.tsx` 翻譯 hook 與 Provider

## 2. Settings 彈窗語言切換 UI

- [x] 2.1 在左側 SettingsModal 彈窗新增「語言 / Language」設定項
- [x] 2.2 實作語言選擇按鈕（繁體中文 / English）
- [x] 2.3 語言偏好儲存至 chrome.storage.local
- [x] 2.4 切換語言後觸發 UI 重新渲染

## 3. 高優先級組件文字遷移

- [x] 3.1 SettingsModal.tsx - 所有標籤與按鈕
- [x] 3.2 GroupsView.tsx - 群組操作選單與 Toast
- [x] 3.3 OrganizationNav.tsx - 組織管理選單
- [x] 3.4 ShareDialog.tsx - 分享對話框（包含 TokenDialog, ShareResultDialog）
- [x] 3.5 sidebar.tsx - Collection 操作

## 4. 中優先級組件文字遷移

- [x] 4.1 TobyLikeCard.tsx - 卡片操作按鈕
- [x] 4.2 CardGrid.tsx - 批次操作工具列
- [x] 4.3 MoveSelectedDialog.tsx - 移動對話框
- [x] 4.4 TemplatesManager.tsx - 模板管理 UI
- [x] 4.5 TobyImportDialog.tsx - 匯入對話框

## 5. 系統訊息遷移

- [x] 5.1 feedback.tsx - Toast 訊息系統
- [x] 5.2 ConflictDialog.tsx - 同步衝突對話框
- [x] 5.3 ContextMenu.tsx - 右鍵選單（無需翻譯，label 由呼叫端傳入）
- [x] 5.4 SearchBox.tsx - 搜尋框 placeholder

## 6. 測試與驗證

- [x] 6.1 測試語言切換功能（建置成功、lint 錯誤已修復）
- [x] 6.2 驗證所有 UI 文字正確顯示（locale 檔案完整）
- [x] 6.3 確認用戶資料不受影響（i18n 只處理 UI 文字）
- [x] 6.4 測試新安裝時的預設語言（manifest.json default_locale: "en"）
