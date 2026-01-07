# Capability: Global Search

## Purpose
提供強大的全域搜尋功能，讓使用者可以快速在所有書籤中找到目標卡片。支援標題、URL、備註的搜尋，提供模糊匹配和過濾選項，並記錄搜尋歷史以提升效率。

## Requirements

### Requirement: 全域搜尋介面
系統必須（SHALL）提供全域搜尋介面，可透過快捷鍵或點擊按鈕啟動。

#### Scenario: 使用快捷鍵啟動搜尋
- **WHEN** 使用者按下 Ctrl+K（Windows/Linux）或 Cmd+K（Mac）
- **THEN** 系統顯示搜尋對話框（居中覆蓋層）
- **THEN** 搜尋輸入框自動聚焦
- **THEN** 背景模糊化（視覺提示）

#### Scenario: 使用 / 鍵快速啟動
- **WHEN** 使用者按下 `/` 鍵（非輸入框內）
- **THEN** 系統顯示搜尋對話框
- **THEN** 搜尋輸入框自動聚焦並清空

#### Scenario: 點擊搜尋按鈕啟動
- **WHEN** 使用者點擊頂部工具列的搜尋圖示（🔍）
- **THEN** 系統顯示搜尋對話框
- **THEN** 搜尋輸入框自動聚焦

#### Scenario: 按 ESC 關閉搜尋
- **GIVEN** 搜尋對話框已開啟
- **WHEN** 使用者按下 ESC 鍵
- **THEN** 搜尋對話框關閉
- **THEN** 恢復背景顯示（取消模糊）

#### Scenario: 點擊背景關閉搜尋
- **GIVEN** 搜尋對話框已開啟
- **WHEN** 使用者點擊對話框外的背景區域
- **THEN** 搜尋對話框關閉

### Requirement: 即時搜尋
系統必須（SHALL）在使用者輸入時即時顯示搜尋結果，無需按下 Enter。

#### Scenario: 輸入關鍵字顯示結果
- **WHEN** 使用者在搜尋框輸入 "react"
- **THEN** 系統立即搜尋所有卡片（標題、URL、備註）
- **THEN** 在 200ms 內顯示匹配結果
- **THEN** 結果按相關性排序（標題匹配優先）

#### Scenario: 關鍵字高亮顯示
- **GIVEN** 使用者搜尋 "doc"
- **WHEN** 系統顯示匹配卡片
- **THEN** 卡片標題和 URL 中的 "doc" 高亮顯示（黃色背景）
- **THEN** 大小寫不敏感（"Doc", "DOC", "doc" 都匹配）

#### Scenario: 清空輸入清除結果
- **GIVEN** 搜尋框有輸入內容且顯示結果
- **WHEN** 使用者清空搜尋框
- **THEN** 搜尋結果區域顯示「輸入關鍵字開始搜尋」提示
- **THEN** 顯示搜尋歷史（最近 5 次）

#### Scenario: 無結果顯示提示
- **GIVEN** 使用者搜尋 "xyzabc123"（不存在的關鍵字）
- **WHEN** 系統執行搜尋
- **THEN** 顯示訊息：「找不到相關書籤」
- **THEN** 提供建議：「試試其他關鍵字或檢查拼寫」

#### Scenario: 搜尋結果計數顯示
- **GIVEN** 使用者搜尋 "javascript"
- **WHEN** 系統找到 42 個匹配結果
- **THEN** 搜尋框下方顯示：「找到 42 個結果」

### Requirement: 搜尋範圍
系統必須（SHALL）支援在標題、URL 和備註中搜尋關鍵字。

#### Scenario: 搜尋標題
- **GIVEN** 卡片 A 的標題為 "React Documentation"
- **WHEN** 使用者搜尋 "react"
- **THEN** 卡片 A 出現在搜尋結果中
- **THEN** 標題中的 "React" 高亮顯示

#### Scenario: 搜尋 URL
- **GIVEN** 卡片 B 的 URL 為 "https://github.com/facebook/react"
- **WHEN** 使用者搜尋 "github"
- **THEN** 卡片 B 出現在搜尋結果中
- **THEN** URL 中的 "github" 高亮顯示

#### Scenario: 搜尋備註
- **GIVEN** 卡片 C 的備註為 "常用參考文檔"
- **WHEN** 使用者搜尋 "參考"
- **THEN** 卡片 C 出現在搜尋結果中
- **THEN** 備註中的 "參考" 高亮顯示

#### Scenario: 多欄位匹配
- **GIVEN** 卡片 D 的標題、URL 和備註都包含 "api"
- **WHEN** 使用者搜尋 "api"
- **THEN** 卡片 D 只出現一次（不重複）
- **THEN** 所有包含 "api" 的欄位都高亮顯示

### Requirement: 模糊搜尋
系統必須（SHALL）支援容錯搜尋，允許拼寫錯誤和部分匹配。

#### Scenario: 拼寫錯誤容錯
- **GIVEN** 卡片標題為 "JavaScript Tutorial"
- **WHEN** 使用者搜尋 "javascrpt"（拼錯）
- **THEN** 系統仍然找到該卡片（容忍 1-2 個字元差異）
- **THEN** 顯示提示：「您是否要找：JavaScript？」

#### Scenario: 部分匹配
- **GIVEN** 卡片標題為 "Introduction to TypeScript"
- **WHEN** 使用者搜尋 "typesc"（部分關鍵字）
- **THEN** 系統找到該卡片
- **THEN** "TypeScript" 中的 "TypeSc" 高亮顯示

#### Scenario: 拼音搜尋（未來功能）
- **GIVEN** 卡片標題為 "前端開發"
- **WHEN** 使用者搜尋 "qianduan"（拼音）
- **THEN** 系統找到該卡片（拼音轉中文匹配）

### Requirement: 搜尋過濾
系統必須（SHALL）提供過濾選項，讓使用者縮小搜尋範圍。

#### Scenario: 按類別過濾
- **GIVEN** 搜尋結果包含 50 個卡片
- **WHEN** 使用者選擇「只在類別: 前端開發」過濾
- **THEN** 只顯示屬於「前端開發」類別的卡片
- **THEN** 結果計數更新為過濾後的數量

#### Scenario: 按群組過濾
- **GIVEN** 搜尋結果包含多個群組的卡片
- **WHEN** 使用者選擇「只在群組: React」過濾
- **THEN** 只顯示屬於「React」群組的卡片

#### Scenario: 按日期範圍過濾
- **WHEN** 使用者選擇「建立時間: 最近 7 天」過濾
- **THEN** 只顯示最近 7 天建立的卡片
- **THEN** 提供更多選項：今天/本週/本月/本年/自訂範圍

#### Scenario: 清除過濾條件
- **GIVEN** 使用者已套用多個過濾條件
- **WHEN** 使用者點擊「清除所有過濾」按鈕
- **THEN** 所有過濾條件清除
- **THEN** 顯示完整搜尋結果

### Requirement: 搜尋結果操作
系統必須（SHALL）支援對搜尋結果執行操作（開啟、編輯、刪除）。

#### Scenario: 點擊結果開啟卡片
- **GIVEN** 搜尋結果顯示 10 個卡片
- **WHEN** 使用者點擊其中一個卡片
- **THEN** 搜尋對話框關閉
- **THEN** 系統導航到該卡片所屬的群組
- **THEN** 該卡片高亮顯示（3 秒後恢復）

#### Scenario: 鍵盤導航結果
- **GIVEN** 搜尋結果顯示多個卡片
- **WHEN** 使用者按下方向鍵 ↓
- **THEN** 第一個結果被選中（藍色邊框）
- **WHEN** 使用者連續按 ↓
- **THEN** 選擇依序向下移動
- **WHEN** 使用者按 Enter
- **THEN** 開啟選中的卡片

#### Scenario: 在新分頁開啟卡片
- **GIVEN** 搜尋結果顯示卡片 A
- **WHEN** 使用者按住 Ctrl（或 Cmd）並點擊卡片 A
- **THEN** 在新瀏覽器分頁開啟卡片 A 的 URL
- **THEN** 搜尋對話框保持開啟

#### Scenario: 快速編輯卡片
- **GIVEN** 搜尋結果顯示卡片 B
- **WHEN** 使用者懸停在卡片 B 上
- **THEN** 顯示快速操作按鈕：編輯（✏️）、刪除（🗑️）
- **WHEN** 使用者點擊「編輯」
- **THEN** 顯示卡片編輯對話框（不關閉搜尋對話框）

### Requirement: 搜尋歷史
系統必須（SHALL）記錄搜尋歷史，並提供快速重新搜尋功能。

#### Scenario: 記錄搜尋歷史
- **WHEN** 使用者搜尋 "javascript" 並點擊結果
- **THEN** 系統將 "javascript" 加入搜尋歷史
- **THEN** 搜尋歷史儲存到 chrome.storage.local

#### Scenario: 顯示搜尋歷史
- **GIVEN** 使用者有搜尋歷史：["react", "vue", "angular", "typescript", "webpack"]
- **WHEN** 使用者開啟搜尋對話框（輸入框為空）
- **THEN** 顯示最近 5 次搜尋歷史
- **THEN** 每個歷史項目旁有時鐘圖示（🕐）

#### Scenario: 點擊歷史快速搜尋
- **GIVEN** 搜尋歷史顯示 "react"
- **WHEN** 使用者點擊 "react"
- **THEN** 搜尋框自動填入 "react"
- **THEN** 系統立即執行搜尋並顯示結果

#### Scenario: 刪除單個歷史記錄
- **GIVEN** 搜尋歷史顯示多個項目
- **WHEN** 使用者懸停在 "vue" 上
- **THEN** 顯示刪除按鈕（×）
- **WHEN** 使用者點擊刪除按鈕
- **THEN** "vue" 從歷史中移除

#### Scenario: 清除所有歷史
- **GIVEN** 搜尋歷史有多個項目
- **WHEN** 使用者點擊「清除歷史」按鈕
- **THEN** 系統顯示確認對話框：「確定清除所有搜尋歷史？」
- **WHEN** 使用者確認
- **THEN** 所有搜尋歷史清除

#### Scenario: 歷史記錄去重
- **GIVEN** 搜尋歷史包含 "react"
- **WHEN** 使用者再次搜尋 "react"
- **THEN** 系統不新增重複項目
- **THEN** "react" 移動到歷史列表頂部（最新）

### Requirement: 搜尋效能優化
系統必須（SHALL）確保搜尋在大量資料（1000+ 卡片）時仍保持流暢。

#### Scenario: 大量資料搜尋
- **GIVEN** 資料庫包含 2000 張卡片
- **WHEN** 使用者搜尋 "doc"
- **THEN** 搜尋結果在 200ms 內返回
- **THEN** 搜尋過程不阻塞 UI（異步執行）

#### Scenario: Debounce 搜尋請求
- **GIVEN** 使用者快速輸入 "react"（5 個字元）
- **WHEN** 系統偵測到連續輸入（間隔 <150ms）
- **THEN** 系統延遲搜尋直到輸入暫停 150ms
- **THEN** 避免中間狀態的搜尋請求（r, re, rea, reac）

#### Scenario: 搜尋結果虛擬化
- **GIVEN** 搜尋返回 500 個結果
- **WHEN** 系統渲染結果列表
- **THEN** 只渲染可見區域的結果（約 20 個）
- **THEN** 滾動時動態加載其他結果
- **THEN** DOM 節點數保持在 30 個以內

#### Scenario: 搜尋取消機制
- **GIVEN** 使用者搜尋 "javascript"，搜尋正在執行
- **WHEN** 使用者立即修改為 "typescript"
- **THEN** 系統取消前一次搜尋請求
- **THEN** 只執行最新的搜尋請求

### Requirement: 搜尋建議
系統必須（SHALL）提供搜尋建議，幫助使用者快速找到目標。

#### Scenario: 自動完成建議
- **WHEN** 使用者輸入 "jav"
- **THEN** 系統顯示建議：
  - "javascript"
  - "java"
  - "javadoc"
- **THEN** 建議基於歷史搜尋和常見標題
- **WHEN** 使用者點擊建議
- **THEN** 搜尋框自動填入並執行搜尋

#### Scenario: 相關搜尋建議
- **GIVEN** 使用者搜尋 "react"
- **WHEN** 搜尋結果顯示後
- **THEN** 底部顯示「相關搜尋」：
  - "react hooks"
  - "react router"
  - "react native"
- **WHEN** 使用者點擊相關搜尋
- **THEN** 執行該搜尋

## Related Documentation
- **技術設計**: `design.md` - 搜尋演算法與 IndexedDB 索引優化
- **實作位置**: `src/app/search/SearchDialog.tsx` - 搜尋對話框實作
- **相關規格**: `../bookmark-management/spec.md` - 資料結構與 IndexedDB
- **Fuse.js 文檔**: https://fusejs.io/ - 模糊搜尋函式庫
