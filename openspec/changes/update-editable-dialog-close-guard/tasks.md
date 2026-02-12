## 1. Implementation
- [x] 1.1 新增共用 hook：封裝可編輯彈窗的外點關閉守門邏輯（避免拖曳選字誤關閉）。
- [x] 1.2 套用到 App 層可編輯彈窗（新增 Collection/Organization、HTML/Toby 匯入命名）。
- [x] 1.3 套用到 Sidebar 與 Organization 管理彈窗（編輯 Collection、管理 Organization）。
- [x] 1.4 套用到卡片與分享相關彈窗（WebpageCard、ShareDialog、TokenDialog、MoveSelectedDialog）。
- [x] 1.5 確認 ESC、Cancel、右上角關閉按鈕行為維持既有語意。

## 2. Verification
- [x] 2.1 新增/更新互動測試：從輸入欄位 `mousedown` 開始拖曳、在遮罩 `mouseup` 不應關閉。
- [x] 2.2 新增/更新互動測試：純遮罩點擊（down/up 都在遮罩）應關閉。
- [x] 2.3 手動驗證第一批清單中的所有彈窗，不包含 SettingsModal。

## 3. Documentation
- [x] 3.1 更新相關功能文檔（如有）說明「防誤關閉」互動規則與適用範圍（以 OpenSpec proposal/design/spec delta 記錄）。
