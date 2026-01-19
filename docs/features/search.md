# 搜尋功能（Search）

本文件整理目前搜尋功能的 UI 行為與資料流程，供開發與維護參考。

**最後更新：2026-01-19**

---

## 範疇與入口

- UI 元件：`src/app/ui/SearchBox.tsx`
- 觸發方式：
  - 點擊頂部 Search Pill
  - `Ctrl/Cmd+K`
  - `Ctrl/Cmd+F`（攔截瀏覽器搜尋）
  - `/`（非輸入框時）

---

## 搜尋流程（現況）

1. 使用者開啟搜尋 → 顯示全螢幕 modal
2. 輸入關鍵字 → 即時比對 `title + url + description`
3. 結果分群：
   - 依 Collection（category）分組
   - 再依 Group（subcategory）分組
4. Enter 或點擊結果 → 導航至卡片
   - 切換至目標 Collection
   - 展開目標 Group
   - 滾動定位卡片並以組織色高亮

---

## 篩選與排序規則

- 僅搜尋**有 `subcategoryId`** 的卡片
- 僅搜尋**目前 Organization 的 Collections**（或 `category` 為空的卡片）
- 排序依 `indexOf` 的最早匹配位置（越小越前）
- 最多顯示 **20** 筆結果

---

## Recent Search（最近搜尋）

- 儲存位置：`chrome.storage.local.searchHistory`
- 格式：`{ term, time }`（最多 10 筆）
- 顯示條件：搜尋框為空
- 顯示內容：關鍵字 + 相對時間（Just now / Xm / Xh / Xd）

---

## 導航與高亮

- 透過 `groups:collapse-all` 事件展開對應 group
- 以組織色設定卡片 `outline + boxShadow`（約 3 秒）
- 依容器/視窗 scroll 高度進行平滑滾動定位

---

## 已知限制

- 無模糊搜尋（僅 `indexOf`）
- 無搜尋過濾條件（例如：欄位/模板/標籤）
- 無搜尋建議與歷史管理（僅最近 10 筆）
- 無結果虛擬化或取消機制
- 不包含未歸屬群組的卡片
