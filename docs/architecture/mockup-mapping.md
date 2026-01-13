# Mockup 到 React 組件映射指引

> 本文件定義了 `mockups/index.html` (設計藍圖) 與 LinkTrove (React 專案) 之間的組件對應關係，供 AI 與開發者重構 UI 時參考。

---

## 1. 核心區塊映射 (Core Layout)

| Mockup HTML 選擇器 | React 組件檔案 | 資料層級 | 職責描述 |
| :--- | :--- | :--- | :--- |
| `.app-rail` | `OrganizationNav.tsx` | **L1 Org** | 跨組織切換、切換器、新增組織入口 |
| `.app-sidebar` | `Sidebar.tsx` (Collections) | **L2 Collection** | 當前組織下的類別導航、管理類別 |
| `.app-main` | `GroupsView.tsx` | **L3 & L4** | 內容主區域、群組與卡片的渲染容器 |
| `.top-bar` | `Header.tsx` / `MainHeader.tsx` | N/A | 搜尋框、排序切換、新增群組按鈕 |
| `.app-drawer` | `OpenTabs.tsx` | N/A | 瀏覽器分頁同步、一鍵儲存功能 |

---

## 2. 內容組件映射 (Content Components)

| Mockup HTML 選擇器 | React 組件檔案 | 職責描述 |
| :--- | :--- | :--- |
| `.group-container` | `Group.tsx` | 單一群組的容器，包含標題編輯與收摺邏輯 |
| `.group-header` | `GroupHeader.tsx` | 顯示群組標題、計數與操作選單 |
| `.card-grid` | `CardGrid.tsx` | 負責卡片的 Grid 佈局與拖放目標區域 (Droppable) |
| `.card` | `TobyLikeCard.tsx` | 單張卡片的完整展現與 Hover 操作選單 |
| `.tab-item` | `TabItem.tsx` | 右側欄的單個分頁項，具備可拖拽屬性 (Draggable) |

---

## 3. 設計權杖對接 (Design Tokens)

未來應將 `index.html` 中的 CSS 變數直接映射至 `tailwind.config.ts`：

| CSS 變數 (Mockup) | Tailwind 配置對應 | 用途 |
| :--- | :--- | :--- |
| `--accent-primary` | `theme.colors.primary` (#ff507a) | Toby Pink 品牌色 |
| `--bg-panel` | `theme.colors.panel` (#181c22) | 側邊欄背景色 |
| `--bg-surface` | `theme.colors.card` (#232730) | 卡片/表面背景色 |
| `--text-primary` | `theme.colors.foreground` (#e8eaf0) | 主要文字色 |

---

## 4. 數據屬性標記 (Data Attributes)

在重構時，請保留 Mockup 中使用的特定 Data 屬性，這對自動化測試與 AI 識別有幫助：
- `data-gid`: 群組 ID
- `data-cid`: 卡片 ID
- `data-tid`: 分頁 ID

---

**最後更新：2026-01-09**
