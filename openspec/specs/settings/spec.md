# Capability: Settings Management

## Purpose
提供完整的應用程式設定管理功能，包含外觀設定、行為設定、GitHub Token 管理、資料管理和隱私設定。確保使用者可以自訂應用程式行為並安全管理敏感資訊。

## Requirements

### Requirement: 外觀設定
系統必須（SHALL）支援使用者自訂應用程式外觀，包含主題、語言和視覺化選項。

#### Scenario: 切換主題模式
- **WHEN** 使用者在設定頁面選擇主題模式（淡色/深色/自動）
- **THEN** 系統立即套用選擇的主題
- **THEN** 系統將主題設定儲存到 chrome.storage.local
- **WHEN** 使用者選擇「自動」模式
- **THEN** 系統根據系統時間或瀏覽器主題自動切換（白天淡色、晚上深色）

#### Scenario: 設定語言偏好
- **WHEN** 使用者選擇語言（繁體中文/簡體中文/English）
- **THEN** 系統立即切換 UI 語言
- **THEN** 所有介面文字更新為選擇的語言
- **THEN** 語言設定儲存到 chrome.storage.local
- **WHEN** 使用者重新開啟新分頁
- **THEN** 自動載入上次選擇的語言

#### Scenario: 設定預設視圖
- **WHEN** 使用者設定「開啟新分頁時顯示」選項
- **THEN** 提供以下選項：
  - 最近使用的組織和類別
  - 指定的組織和類別
  - 空白頁（不選擇任何類別）
- **WHEN** 使用者選擇「指定的組織和類別」
- **THEN** 系統顯示組織和類別選擇器
- **THEN** 儲存選擇到 chrome.storage.local
- **WHEN** 使用者下次開啟新分頁
- **THEN** 自動載入指定的組織和類別

#### Scenario: 自訂卡片顯示密度
- **WHEN** 使用者調整「卡片顯示密度」設定
- **THEN** 提供選項：緊湊/標準/寬鬆
- **WHEN** 使用者選擇「緊湊」
- **THEN** 卡片間距減少，每行顯示更多卡片
- **THEN** 設定即時套用並持久化

### Requirement: 行為設定
系統必須（SHALL）提供行為設定選項，讓使用者自訂應用程式互動行為。

#### Scenario: 設定儲存後關閉分頁
- **WHEN** 使用者啟用「儲存後關閉分頁」選項
- **THEN** 系統將設定儲存為 `closeTabAfterSave: true`
- **WHEN** 使用者從 Open Tabs 儲存分頁到書籤
- **THEN** 系統儲存書籤後自動關閉該分頁
- **WHEN** 使用者停用此選項
- **THEN** 儲存書籤後分頁保持開啟

#### Scenario: 設定拖放確認
- **WHEN** 使用者啟用「拖放時顯示確認」選項
- **WHEN** 使用者拖放卡片到另一個群組
- **THEN** 系統顯示確認對話框：「確定要將卡片移動到 [群組名稱]？」
- **WHEN** 使用者確認
- **THEN** 執行移動操作
- **WHEN** 使用者停用此選項
- **THEN** 拖放操作直接執行（無確認）

#### Scenario: 設定自動備份頻率
- **WHEN** 使用者設定「自動備份」選項
- **THEN** 提供選項：關閉/每日/每週/每月
- **WHEN** 使用者選擇「每日」
- **THEN** 系統每日自動匯出資料到下載資料夾
- **THEN** 備份檔案命名為 `linktrove-backup-[date].json`

#### Scenario: 設定新卡片預設位置
- **WHEN** 使用者設定「新卡片加入位置」
- **THEN** 提供選項：頂部/底部
- **WHEN** 使用者選擇「頂部」
- **WHEN** 使用者新增卡片到群組
- **THEN** 新卡片插入到群組的最前面

#### Scenario: 設定重複 URL 處理
- **WHEN** 使用者設定「重複 URL 處理」選項
- **THEN** 提供選項：提示/自動跳過/允許重複
- **WHEN** 使用者選擇「自動跳過」
- **WHEN** 使用者嘗試儲存已存在的 URL
- **THEN** 系統自動跳過該 URL 並顯示通知
- **THEN** 不顯示確認對話框

### Requirement: GitHub Token 管理
系統必須（SHALL）提供安全的 GitHub Token 管理功能，用於 GitHub Gist 分享功能。

#### Scenario: 輸入 GitHub Token
- **WHEN** 使用者在設定頁面點擊「設定 GitHub Token」
- **THEN** 系統顯示 Token 輸入對話框
- **THEN** 提供說明連結：「如何取得 GitHub Token？」（連結到 GitHub 設定頁面）
- **WHEN** 使用者輸入 Token
- **THEN** 系統驗證 Token 格式（以 `ghp_` 或 `github_pat_` 開頭）
- **WHEN** 使用者儲存 Token
- **THEN** 系統加密 Token 並儲存到 chrome.storage.local
- **THEN** 顯示成功訊息：「GitHub Token 已設定」

#### Scenario: 驗證 GitHub Token 有效性
- **GIVEN** 使用者已輸入 GitHub Token
- **WHEN** 使用者點擊「測試連線」按鈕
- **THEN** 系統呼叫 GitHub API 驗證 Token（GET /user）
- **WHEN** Token 有效
- **THEN** 顯示成功訊息：「連線成功！已驗證為 [GitHub 使用者名稱]」
- **WHEN** Token 無效
- **THEN** 顯示錯誤訊息：「Token 無效，請檢查並重新輸入」

#### Scenario: 查看 Token 狀態
- **GIVEN** 使用者已設定 GitHub Token
- **WHEN** 使用者開啟設定頁面
- **THEN** 系統顯示 Token 狀態：「已設定（顯示前 4 碼：ghp_****）」
- **THEN** 提供「測試連線」和「刪除 Token」按鈕
- **THEN** Token 完整內容不顯示（安全性考量）

#### Scenario: 刪除 GitHub Token
- **GIVEN** 使用者已設定 GitHub Token
- **WHEN** 使用者點擊「刪除 Token」按鈕
- **THEN** 系統顯示確認對話框：「確定要刪除 GitHub Token？這將停用 Gist 分享功能。」
- **WHEN** 使用者確認刪除
- **THEN** 系統從 chrome.storage.local 清除 Token
- **THEN** 顯示訊息：「GitHub Token 已刪除」
- **WHEN** 使用者嘗試使用 Gist 分享功能
- **THEN** 系統提示「請先設定 GitHub Token」

#### Scenario: Token 權限檢查
- **GIVEN** 使用者已設定 GitHub Token
- **WHEN** 系統驗證 Token 時
- **THEN** 系統檢查 Token 是否具有 `gist` 權限
- **WHEN** Token 缺少 `gist` 權限
- **THEN** 顯示警告訊息：「Token 缺少 'gist' 權限，請重新建立 Token 並勾選 gist 權限」

### Requirement: 資料管理
系統必須（SHALL）提供完整的資料管理功能，包含匯出、匯入、清空和重置。

#### Scenario: 匯出所有資料
- **WHEN** 使用者點擊「匯出所有資料」按鈕
- **THEN** 系統產生包含所有資料的 JSON 檔案（參見 import-export capability）
- **THEN** 下載檔案命名為 `linktrove-export-[timestamp].json`
- **THEN** 顯示成功訊息：「已匯出 [卡片數量] 張卡片」

#### Scenario: 匯入資料
- **WHEN** 使用者點擊「匯入資料」按鈕並選擇檔案
- **THEN** 系統顯示匯入模式選擇（合併/覆蓋）
- **WHEN** 使用者選擇模式並確認
- **THEN** 系統執行匯入（參見 import-export capability）
- **THEN** 顯示匯入結果：「成功匯入 [數量] 張卡片」

#### Scenario: 清空快取
- **WHEN** 使用者點擊「清空快取」按鈕
- **THEN** 系統顯示確認對話框：「這將清除快取資料（不影響書籤），確定繼續？」
- **WHEN** 使用者確認
- **THEN** 系統清除以下快取：
  - 截圖快取
  - Favicon 快取
  - 臨時資料
- **THEN** 顯示成功訊息：「快取已清空」

#### Scenario: 重置應用程式
- **WHEN** 使用者點擊「重置應用程式」按鈕
- **THEN** 系統顯示嚴重警告對話框：「⚠️ 警告：此操作將刪除所有資料（包含所有書籤），且無法復原。請先匯出資料備份。」
- **THEN** 要求使用者輸入確認文字：「DELETE」
- **WHEN** 使用者輸入正確確認文字並確認
- **THEN** 系統清空所有 IndexedDB stores
- **THEN** 系統清空 chrome.storage.local
- **THEN** 系統重新載入應用程式
- **THEN** 應用程式回到初始狀態（建立預設模板）

#### Scenario: 顯示資料統計
- **WHEN** 使用者開啟設定頁面的「資料管理」區塊
- **THEN** 系統顯示以下統計資訊：
  - 組織數量：X 個
  - 類別數量：X 個
  - 群組數量：X 個
  - 卡片數量：X 張
  - 模板數量：X 個
  - 資料庫大小：約 X MB

### Requirement: 隱私與安全設定
系統必須（SHALL）提供隱私和安全相關設定選項。

#### Scenario: 設定隱私模式
- **WHEN** 使用者啟用「隱私模式」選項
- **THEN** 系統不追蹤以下資訊：
  - 分頁瀏覽歷史
  - 最近使用的群組
  - 搜尋歷史
- **THEN** 系統不儲存快取（截圖、favicon）
- **THEN** 所有功能正常運作，但不保留使用痕跡

#### Scenario: 設定自動鎖定
- **WHEN** 使用者啟用「自動鎖定」選項
- **THEN** 提供閒置時間選項：5 分鐘/15 分鐘/30 分鐘/1 小時
- **WHEN** 應用程式閒置超過設定時間
- **THEN** 系統自動鎖定應用程式
- **THEN** 顯示解鎖畫面（要求輸入密碼或 PIN）
- **WHEN** 使用者輸入正確密碼
- **THEN** 解鎖並恢復應用程式

#### Scenario: 設定資料加密
- **WHEN** 使用者啟用「資料加密」選項
- **THEN** 系統提示設定加密密碼
- **WHEN** 使用者設定密碼並確認
- **THEN** 系統使用 AES-256 加密所有書籤資料
- **THEN** 每次開啟應用程式時要求輸入密碼
- **WHEN** 使用者輸入錯誤密碼
- **THEN** 顯示錯誤訊息：「密碼錯誤」
- **THEN** 應用程式保持鎖定狀態

#### Scenario: 管理敏感資訊
- **WHEN** 使用者開啟「敏感資訊管理」區塊
- **THEN** 系統列出所有儲存的敏感資訊：
  - GitHub Token（已設定/未設定）
  - 加密密碼（已設定/未設定）
- **THEN** 提供「清除所有敏感資訊」按鈕
- **WHEN** 使用者清除敏感資訊
- **THEN** 系統刪除所有 Token 和密碼
- **THEN** 加密資料恢復為明文（若有設定加密）

### Requirement: 關於與說明
系統必須（SHALL）提供應用程式資訊、版本說明和使用指南。

#### Scenario: 顯示版本資訊
- **WHEN** 使用者開啟「關於」頁面
- **THEN** 系統顯示以下資訊：
  - 應用程式名稱：LinkTrove
  - 版本號碼：v1.2.3
  - 建置日期：2026-01-07
  - Chrome 版本需求：v120+
  - Manifest 版本：V3

#### Scenario: 查看更新日誌
- **WHEN** 使用者點擊「查看更新日誌」連結
- **THEN** 系統開啟 GitHub Releases 頁面
- **THEN** 顯示最新版本的更新內容

#### Scenario: 檢查更新
- **WHEN** 使用者點擊「檢查更新」按鈕
- **THEN** 系統呼叫 Chrome Web Store API 檢查最新版本
- **WHEN** 有新版本可用
- **THEN** 顯示訊息：「新版本 v1.3.0 已發布，點擊更新」
- **THEN** 提供「更新」按鈕（連結到 Chrome Web Store）
- **WHEN** 已是最新版本
- **THEN** 顯示訊息：「您已使用最新版本」

#### Scenario: 開啟使用指南
- **WHEN** 使用者點擊「使用指南」連結
- **THEN** 系統開啟新分頁，顯示線上文檔（GitHub Wiki 或官網）

#### Scenario: 查看隱私政策
- **WHEN** 使用者點擊「隱私政策」連結
- **THEN** 系統顯示隱私政策內容：
  - 資料儲存方式（本地 IndexedDB）
  - 不蒐集任何使用者資料
  - GitHub Token 僅儲存在本地
  - 不傳送資料到第三方伺服器

#### Scenario: 回報問題
- **WHEN** 使用者點擊「回報問題」連結
- **THEN** 系統開啟 GitHub Issues 頁面
- **THEN** 預填問題模板（版本號碼、瀏覽器資訊）

### Requirement: 設定同步
系統必須（SHALL）支援將設定匯出和匯入，以便在不同裝置間同步設定。

#### Scenario: 匯出設定
- **WHEN** 使用者點擊「匯出設定」按鈕
- **THEN** 系統產生包含所有設定的 JSON 檔案（不包含敏感資訊如 GitHub Token）
- **THEN** 下載檔案命名為 `linktrove-settings-[timestamp].json`
- **THEN** 設定檔案包含：
  - 外觀設定（主題、語言、密度）
  - 行為設定（儲存後關閉、拖放確認等）
  - 預設視圖設定
  - 但不包含 GitHub Token（安全考量）

#### Scenario: 匯入設定
- **WHEN** 使用者點擊「匯入設定」按鈕並選擇檔案
- **THEN** 系統解析設定檔案並驗證格式
- **WHEN** 格式有效
- **THEN** 系統套用所有設定
- **THEN** 顯示成功訊息：「設定已匯入」
- **THEN** UI 立即更新（主題、語言等）
- **WHEN** 格式無效
- **THEN** 顯示錯誤訊息：「設定檔案格式錯誤」

#### Scenario: 重置為預設設定
- **WHEN** 使用者點擊「重置為預設設定」按鈕
- **THEN** 系統顯示確認對話框：「此操作將恢復所有設定為預設值，確定繼續？」
- **WHEN** 使用者確認
- **THEN** 系統將所有設定恢復為預設值
- **THEN** 保留使用者資料（書籤、模板）
- **THEN** 清除 GitHub Token（安全考量）
- **THEN** 顯示成功訊息：「設定已重置」

## Related Documentation
- **技術設計**: `design.md` - 設定儲存機制與加密策略
- **實作位置**: `src/app/settings/` - 設定頁面實作
- **相關規格**: `../open-tabs-sync/spec.md` - 儲存後關閉分頁行為
- **Chrome Storage API**: https://developer.chrome.com/docs/extensions/reference/storage/
