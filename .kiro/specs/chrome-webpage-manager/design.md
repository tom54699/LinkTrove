# 設計文件

## 概述

這個 Chrome 插件將提供類似 Toby 的三欄式網頁管理界面，讓使用者能夠透過拖拉操作管理和組織網頁收藏。插件採用 Chrome Extension Manifest V3 架構，結合現代前端技術實現流暢的使用者體驗。

## 架構

### 整體架構

```
Chrome Extension
├── manifest.json (Manifest V3 配置)
├── background.js (Service Worker)
├── src/
│   ├── components/ (React 元件)
│   ├── hooks/ (自訂 React Hooks)
│   ├── stores/ (狀態管理)
│   ├── utils/ (工具函數)
│   ├── types/ (TypeScript 類型定義)
│   └── styles/ (CSS/Tailwind 樣式)
├── public/
│   ├── popup.html (彈出視窗)
│   └── newtab.html (主要功能頁面)
├── dist/ (建置輸出)
└── 建置配置 (vite.config.ts 或 webpack.config.js)
```

### 建置配置考量

- **模組打包**: 需要將 React 應用打包為 Chrome Extension 相容格式
- **程式碼分割**: 分離 background script、popup 和 main app
- **資源處理**: 處理圖片、字體和其他靜態資源
- **開發模式**: 支援熱重載和開發工具
- **生產建置**: 程式碼壓縮和優化

### 技術棧選擇

- **Chrome Extension API**: Manifest V3
- **前端框架**: React 18 + TypeScript (推薦) 或 Vue 3 + TypeScript
- **建置工具**: Vite 或 Webpack 5
- **狀態管理**: React Context API 或 Zustand (輕量級)
- **拖拉功能**: react-beautiful-dnd 或 HTML5 Drag and Drop API
- **資料存儲**: Chrome Storage API (chrome.storage.local + chrome.storage.sync)
- **分頁管理**: Chrome Tabs API (chrome.tabs)
- **UI 框架**: Tailwind CSS 或 styled-components
- **主題**: 深色主題設計
- **類型檢查**: TypeScript 4.9+

## 元件和介面

### 1. 主要 UI 元件

#### 1.1 三欄式佈局容器

```html
<div class="app-container">
  <aside class="sidebar"><!-- 左側分類導航 --></aside>
  <main class="content-area"><!-- 中間卡片網格 --></main>
  <aside class="tabs-panel"><!-- 右側 OPEN TABS --></aside>
</div>
```

#### 1.2 左側邊欄 (Sidebar)

- **功能**: 顯示收藏分類和導航
- **元件**:
  - 分類清單
  - 新增分類按鈕
  - 設定選項

#### 1.3 中間主要區域 (Content Area)

- **功能**: 顯示儲存的網頁卡片網格
- **元件**:
  - 卡片網格容器
  - 個別網頁卡片
  - 拖拉放置區域指示器

#### 1.4 右側面板 (Tabs Panel)

- **功能**: 顯示目前開啟的分頁
- **元件**:
  - "OPEN TABS" 標題
  - 分頁清單
  - 分頁項目 (可拖拉)

### 2. 核心元件設計

#### 2.1 WebpageCard 元件 (React)

```typescript
interface WebpageCardProps {
  data: WebpageData;
  onEdit: (id: string, note: string) => void;
  onDelete: (id: string) => void;
  onClick: (url: string) => void;
}

const WebpageCard: React.FC<WebpageCardProps> = ({
  data, onEdit, onDelete, onClick
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(data.note);

  return (
    <div className="webpage-card" onClick={() => onClick(data.url)}>
      {/* 卡片內容 */}
    </div>
  );
};
```

#### 2.2 TabItem 元件 (React)

```typescript
interface TabItemProps {
  tab: chrome.tabs.Tab;
  onDragStart: (tab: chrome.tabs.Tab) => void;
}

const TabItem: React.FC<TabItemProps> = ({ tab, onDragStart }) => {
  return (
    <div
      className="tab-item"
      draggable
      onDragStart={() => onDragStart(tab)}
    >
      <img src={tab.favIconUrl} alt="" />
      <span>{tab.title}</span>
    </div>
  );
};
```

#### 2.3 DragDropContext (React)

```typescript
const App: React.FC = () => {
  const [draggedTab, setDraggedTab] = useState<chrome.tabs.Tab | null>(null);

  const handleDragStart = (tab: chrome.tabs.Tab) => {
    setDraggedTab(tab);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    if (draggedTab) {
      await saveWebpage(draggedTab);
      setDraggedTab(null);
    }
  };

  return (
    <div className="app-container" onDrop={handleDrop}>
      {/* 應用程式內容 */}
    </div>
  );
};
```

## 資料模型

### 1. 網頁資料模型

```javascript
interface WebpageData {
  id: string;           // 唯一識別碼
  title: string;        // 網頁標題
  url: string;          // 網頁 URL
  favicon: string;      // 網站圖標 URL
  note: string;         // 使用者備註
  category: string;     // 所屬分類
  createdAt: Date;      // 建立時間
  updatedAt: Date;      // 更新時間
}
```

### 2. 分類資料模型

```javascript
interface CategoryData {
  id: string;           // 分類 ID
  name: string;         // 分類名稱
  color: string;        // 分類顏色
  order: number;        // 排序順序
}
```

### 3. 應用程式狀態模型

```typescript
interface AppState {
  webpages: WebpageData[];
  categories: CategoryData[];
  currentCategory: string;
  openTabs: chrome.tabs.Tab[];
  isDragging: boolean;
  isLoading: boolean;
  error: string | null;
}

// React Context 或 Zustand Store
interface WebpageStore {
  state: AppState;
  actions: {
    addWebpage: (webpage: WebpageData) => Promise<void>;
    deleteWebpage: (id: string) => Promise<void>;
    updateWebpage: (id: string, updates: Partial<WebpageData>) => Promise<void>;
    loadWebpages: () => Promise<void>;
    setCurrentCategory: (categoryId: string) => void;
    refreshOpenTabs: () => Promise<void>;
  };
}
```

## 錯誤處理

### 1. Chrome API 錯誤處理

- **權限錯誤**: 檢查 manifest.json 中的權限設定
- **API 呼叫失敗**: 提供降級功能和錯誤訊息
- **存儲空間不足**: 警告使用者並提供清理選項

### 2. 拖拉操作錯誤處理

- **無效放置區域**: 視覺回饋並取消操作
- **重複儲存**: 檢查 URL 是否已存在
- **網路錯誤**: 處理 favicon 載入失敗

### 3. 資料完整性錯誤處理

- **資料損壞**: 提供資料修復機制
- **版本不相容**: 資料遷移策略
- **存儲失敗**: 重試機制和本地備份

## 測試策略

### 1. 單元測試

- **元件測試**: 測試各個 UI 元件的功能
- **資料模型測試**: 驗證資料結構和操作
- **工具函數測試**: 測試輔助函數的正確性

### 2. 整合測試

- **Chrome API 整合**: 測試與 Chrome Extension API 的互動
- **拖拉功能測試**: 驗證拖拉操作的完整流程
- **資料持久化測試**: 測試資料儲存和載入

### 3. 使用者介面測試

- **響應式設計測試**: 測試不同視窗大小的佈局
- **互動測試**: 驗證滑鼠和鍵盤操作
- **視覺回饋測試**: 確保適當的使用者回饋

### 4. 效能測試

- **大量資料測試**: 測試處理大量網頁收藏的效能
- **記憶體使用測試**: 監控記憶體洩漏
- **載入時間測試**: 優化初始載入速度

## 安全性考量

### 1. 內容安全政策 (CSP)

- 設定嚴格的 CSP 規則
- 避免 inline scripts 和 eval()
- 限制外部資源載入

### 2. 權限最小化

- 只請求必要的 Chrome API 權限
- 限制 host permissions 範圍
- 定期審查權限需求

### 3. 資料驗證

- 驗證使用者輸入
- 清理和過濾 URL 和標題
- 防止 XSS 攻擊

## 資料存儲策略

### 1. 第一版本 - Chrome 內建存儲

#### 1.1 Chrome Storage API

- **chrome.storage.local**: 本地存儲，無大小限制，不會同步
- **chrome.storage.sync**: 雲端同步存儲，限制 100KB，自動跨裝置同步
- **混合策略**: 基本資料用 sync，大量資料用 local

```typescript
interface StorageService {
  // 本地存儲 (無限制)
  saveToLocal: (data: WebpageData[]) => Promise<void>;
  loadFromLocal: () => Promise<WebpageData[]>;

  // 同步存儲 (跨裝置，但有大小限制)
  saveToSync: (data: CategoryData[]) => Promise<void>;
  loadFromSync: () => Promise<CategoryData[]>;

  // 匯出/匯入功能
  exportData: () => Promise<string>; // JSON 格式
  importData: (jsonData: string) => Promise<void>;
}
```

#### 1.2 資料分層存儲

- **chrome.storage.sync**: 分類設定、使用者偏好 (< 100KB)
- **chrome.storage.local**: 網頁收藏資料 (無限制)
- **本地快取**: favicon 和縮圖

### 2. 未來版本擴展選項

#### 2.1 Google Drive 整合 (v2.0)

```typescript
interface GoogleDriveService {
  authenticate: () => Promise<void>;
  uploadBackup: (data: AppState) => Promise<string>; // 回傳檔案 ID
  downloadBackup: (fileId: string) => Promise<AppState>;
  autoSync: (enabled: boolean) => void;
}
```

**優點**:

- 使用者擁有完全控制權
- 無需後端伺服器
- 利用 Google 的基礎設施
- 跨裝置同步

**實作考量**:

- 需要 Google Drive API 權限
- OAuth 2.0 認證流程
- 處理網路連線問題
- 衝突解決機制

#### 2.2 本地檔案系統 (v2.0)

```typescript
interface LocalFileService {
  exportToFile: (data: AppState) => Promise<void>; // 下載 JSON 檔案
  importFromFile: (file: File) => Promise<AppState>; // 上傳 JSON 檔案
  autoBackup: (interval: number) => void; // 定期匯出
}
```

**優點**:

- 完全離線
- 使用者完全控制
- 無隱私疑慮
- 可與其他工具整合

#### 2.3 自建後端服務 (v3.0)

```typescript
interface BackendService {
  register: (email: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<string>; // JWT token
  syncData: (data: AppState) => Promise<void>;
  fetchData: () => Promise<AppState>;
  shareCollection: (collectionId: string) => Promise<string>; // 分享連結
}
```

**優點**:

- 進階功能 (分享、協作)
- 更好的同步控制
- 分析和統計功能
- 跨平台支援

**考量**:

- 需要維護成本
- 隱私和安全責任
- 使用者帳號管理

### 3. 資料遷移策略

#### 3.1 版本相容性

```typescript
interface DataMigration {
  version: string;
  migrate: (oldData: any) => AppState;
}

const migrations: DataMigration[] = [
  {
    version: '1.0.0',
    migrate: (data) => ({ ...data, version: '1.0.0' }),
  },
  {
    version: '2.0.0',
    migrate: (data) => ({ ...data, googleDriveEnabled: false }),
  },
];
```

#### 3.2 資料備份和恢復

- 自動本地備份
- 匯出/匯入功能
- 版本控制和回滾
- 資料完整性檢查

## 效能優化

### 1. 虛擬化渲染

- 對大量卡片實施虛擬滾動
- 延遲載入非可見元素
- 優化 DOM 操作

### 2. 資料快取和壓縮

- 快取 favicon 和網頁資訊
- 實施智慧更新策略
- 壓縮存儲資料 (gzip)
- 增量同步機制

### 3. 事件處理優化

- 使用事件委派
- 節流和防抖動處理
- 優化拖拉事件處理
