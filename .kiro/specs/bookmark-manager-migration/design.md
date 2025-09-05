# 設計文件

## 概述

這個專案將現有基於 Chrome Storage 的書籤管理 Extension 遷移至 SQLite-WASM + OPFS 架構，以解決容量限制並提供更強大的查詢功能。新架構採用分層資料存儲策略，結合本地 SQLite 資料庫和雲端同步機制。

## 架構

### 整體架構

```
Chrome Extension (Manifest V3)
├── Background Service Worker
│   ├── SQLite-WASM + OPFS 資料庫
│   ├── 資料遷移服務
│   ├── 同步管理服務
│   └── 搜尋引擎服務
├── Content Scripts (可選)
├── Popup UI (快速操作界面)
├── Options Page (設定和管理界面)
└── Chrome Storage (僅存設定資料)
```

### 技術棧選擇

- **資料庫**: SQLite-WASM + OPFS (Origin Private File System)
- **設定同步**: Chrome Storage Sync (< 100KB)
- **跨裝置同步**: JSON 匯出/匯入 + 多種同步策略
- **前端框架**: React 18 + TypeScript
- **建置工具**: Vite 5
- **狀態管理**: Zustand (輕量級)
- **UI 框架**: Tailwind CSS
- **搜尋引擎**: SQLite FTS5 (Full-Text Search)
- **同步協議**: WebDAV, Google Drive API, File System Access API

### 資料分層架構

```
├── 小量設定資料 (chrome.storage.sync)
│   ├── Categories (分類配置)
│   ├── Templates (範本設定)
│   ├── User Preferences (使用者偏好)
│   └── Sync Settings (同步設定)
│
├── 主要資料 (SQLite + OPFS)
│   ├── Bookmarks (書籤主體資料)
│   ├── Tags (標籤系統)
│   ├── Visit History (訪問紀錄)
│   ├── Search Index (搜尋索引)
│   └── Metadata Cache (網站元資料快取)
│
└── 同步機制
    ├── JSON Export/Import
    ├── File System Access API
    ├── WebDAV 同步
    └── Cloud Drive 整合
```

## 元件和介面

### 1. 資料庫設計

#### 1.1 SQLite Schema

```sql
-- 分類表
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#1976d2',
    icon TEXT,
    parent_id INTEGER REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 書籤表
CREATE TABLE bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id),
    favicon TEXT,
    visit_count INTEGER DEFAULT 0,
    last_visited DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 標籤表
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#757575'
);

-- 書籤標籤關聯表
CREATE TABLE bookmark_tags (
    bookmark_id INTEGER REFERENCES bookmarks(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (bookmark_id, tag_id)
);

-- 索引優化
CREATE INDEX idx_bookmarks_url ON bookmarks(url);
CREATE INDEX idx_bookmarks_title ON bookmarks(title);
CREATE INDEX idx_bookmarks_category ON bookmarks(category_id);
CREATE INDEX idx_bookmarks_created ON bookmarks(created_at);

-- 全文搜尋索引
CREATE VIRTUAL TABLE bookmarks_fts USING fts5(title, description, url);
```

### 2. 核心模組設計

#### 2.1 資料庫管理模組 (DatabaseManager)

```typescript
class DatabaseManager {
  private db: any = null;
  private isReady: boolean = false;

  constructor() {
    this.init();
  }

  // 初始化資料庫
  async init(): Promise<void> {
    // 載入 SQLite-WASM
    // 建立 OPFS 連接
    // 執行 Schema 建立
    // 建立索引
  }

  // 執行 SQL 查詢
  async query(sql: string, params?: any[]): Promise<any[]> {
    // 執行查詢並返回結果
  }

  // 事務處理
  async transaction(callback: (db: any) => Promise<void>): Promise<void> {
    // 開始事務
    // 執行回調
    // 提交或回滾
  }

  // 資料庫備份
  async backup(): Promise<Uint8Array> {
    // 建立資料庫備份
  }

  // 資料庫還原
  async restore(backupData: Uint8Array): Promise<void> {
    // 從備份還原資料庫
  }
}
```

#### 2.2 書籤操作模組 (BookmarkService)

```typescript
interface BookmarkData {
  id?: number;
  title: string;
  url: string;
  description?: string;
  categoryId?: number;
  favicon?: string;
  tags?: string[];
}

class BookmarkService {
  constructor(private db: DatabaseManager) {}

  // CRUD 操作
  async createBookmark(bookmarkData: BookmarkData): Promise<number> {}
  async getBookmark(id: number): Promise<BookmarkData | null> {}
  async updateBookmark(
    id: number,
    updates: Partial<BookmarkData>
  ): Promise<void> {}
  async deleteBookmark(id: number): Promise<void> {}

  // 批次操作
  async createBookmarks(bookmarksArray: BookmarkData[]): Promise<number[]> {}
  async deleteBookmarks(ids: number[]): Promise<void> {}

  // 查詢功能
  async searchBookmarks(
    query: string,
    options?: SearchOptions
  ): Promise<BookmarkData[]> {}
  async getBookmarksByCategory(categoryId: number): Promise<BookmarkData[]> {}
  async getBookmarksByTags(tagIds: number[]): Promise<BookmarkData[]> {}
  async getRecentBookmarks(limit: number): Promise<BookmarkData[]> {}
  async getPopularBookmarks(limit: number): Promise<BookmarkData[]> {}

  // 統計功能
  async getBookmarkStats(): Promise<BookmarkStats> {}
  async getCategoryStats(): Promise<CategoryStats[]> {}
}
```

#### 2.3 同步管理模組 (SyncManager)

```typescript
interface SyncConfig {
  type: 'filesystem' | 'webdav' | 'googledrive' | 'dropbox';
  settings: Record<string, any>;
}

class SyncManager {
  constructor(private db: DatabaseManager) {}

  // 匯出功能
  async exportToJSON(): Promise<string> {}
  async exportToNetscapeHTML(): Promise<string> {}
  async exportToChromeFormat(): Promise<string> {}

  // 匯入功能
  async importFromJSON(jsonData: string): Promise<ImportResult> {}
  async importFromNetscapeHTML(htmlData: string): Promise<ImportResult> {}
  async importFromChromeFormat(chromeData: any): Promise<ImportResult> {}

  // 同步策略
  async syncToFileSystem(): Promise<void> {}
  async syncToWebDAV(config: WebDAVConfig): Promise<void> {}
  async syncToGoogleDrive(): Promise<void> {}
  async syncToDropbox(): Promise<void> {}

  // 衝突解決
  async mergeData(localData: any, remoteData: any): Promise<MergeResult> {}
  async resolveConflicts(conflicts: Conflict[]): Promise<void> {}
}
```

#### 2.4 搜尋引擎模組 (SearchEngine)

```typescript
interface SearchOptions {
  categories?: number[];
  tags?: number[];
  dateRange?: { start: Date; end: Date };
  sortBy?: 'relevance' | 'date' | 'title' | 'visits';
  limit?: number;
  offset?: number;
}

class SearchEngine {
  constructor(private db: DatabaseManager) {}

  // 全文搜尋
  async fullTextSearch(query: string): Promise<BookmarkData[]> {}

  // 進階搜尋
  async advancedSearch(criteria: SearchOptions): Promise<BookmarkData[]> {}

  // 自動完成
  async getSearchSuggestions(partial: string): Promise<string[]> {}

  // 搜尋歷史
  async saveSearchQuery(query: string): Promise<void> {}
  async getSearchHistory(): Promise<string[]> {}

  // 索引管理
  async rebuildSearchIndex(): Promise<void> {}
  async updateSearchIndex(bookmarkId: number): Promise<void> {}
}
```

### 3. 資料遷移服務

```typescript
class MigrationService {
  constructor(private db: DatabaseManager) {}

  // 檢測舊資料
  async detectLegacyData(): Promise<boolean> {}

  // 遷移書籤資料
  async migrateBookmarks(): Promise<MigrationResult> {}

  // 遷移分類資料
  async migrateCategories(): Promise<MigrationResult> {}

  // 驗證遷移結果
  async validateMigration(): Promise<ValidationResult> {}

  // 清理舊資料
  async cleanupLegacyData(): Promise<void> {}
}
```

## 資料模型

### 1. 核心資料模型

```typescript
interface BookmarkData {
  id: number;
  title: string;
  url: string;
  description?: string;
  categoryId?: number;
  favicon?: string;
  visitCount: number;
  lastVisited?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags?: TagData[];
}

interface CategoryData {
  id: number;
  name: string;
  color: string;
  icon?: string;
  parentId?: number;
  sortOrder: number;
  createdAt: Date;
  children?: CategoryData[];
}

interface TagData {
  id: number;
  name: string;
  color: string;
  bookmarkCount?: number;
}
```

### 2. 同步資料模型

```typescript
interface SyncData {
  version: string;
  timestamp: Date;
  bookmarks: BookmarkData[];
  categories: CategoryData[];
  tags: TagData[];
  settings: UserSettings;
}

interface ConflictData {
  type: 'bookmark' | 'category' | 'tag';
  localItem: any;
  remoteItem: any;
  resolution?: 'local' | 'remote' | 'merge';
}
```

## 錯誤處理

### 1. 資料庫錯誤處理

- **初始化失敗**: 提供降級到 Chrome Storage 的選項
- **查詢錯誤**: 記錄錯誤並提供重試機制
- **事務失敗**: 自動回滾並通知使用者
- **資料損壞**: 從備份恢復或重建資料庫

### 2. 同步錯誤處理

- **網路錯誤**: 實作重試機制和離線佇列
- **認證失敗**: 重新導向到認證流程
- **衝突處理**: 提供使用者選擇解決方案
- **資料格式錯誤**: 驗證和清理匯入資料

### 3. 效能錯誤處理

- **記憶體不足**: 自動清理快取和分頁載入
- **查詢超時**: 優化查詢或提供進度指示
- **大檔案處理**: 使用串流處理和進度回饋

## 測試策略

### 1. 單元測試

- **資料庫操作測試**: 測試 CRUD 操作和查詢功能
- **服務層測試**: 測試業務邏輯和資料處理
- **同步機制測試**: 測試匯出/匯入和衝突解決
- **搜尋功能測試**: 測試全文搜尋和進階查詢

### 2. 整合測試

- **資料遷移測試**: 測試從 Chrome Storage 的完整遷移流程
- **跨元件通信測試**: 測試 Background 和 UI 間的通信
- **同步流程測試**: 測試完整的同步和衝突解決流程

### 3. 效能測試

- **大量資料測試**: 測試 10,000+ 書籤的處理效能
- **記憶體使用測試**: 監控記憶體洩漏和使用量
- **查詢效能測試**: 測試複雜查詢的響應時間
- **同步效能測試**: 測試大檔案同步的效能

### 4. 相容性測試

- **瀏覽器相容性**: 測試不同 Chrome 版本的相容性
- **資料格式相容性**: 測試不同匯入格式的處理
- **向下相容性**: 確保舊版本資料的正確處理

## 安全性考量

### 1. 資料保護

- **本地加密**: 提供可選的資料庫加密功能
- **同步加密**: 同步資料的端到端加密
- **備份保護**: 備份檔案的完整性驗證
- **敏感資料處理**: 安全地處理認證資訊

### 2. 權限管理

- **最小權限原則**: 只請求必要的 Chrome API 權限
- **同步權限**: 謹慎處理雲端服務的存取權限
- **檔案系統權限**: 安全地使用 File System Access API

### 3. 資料驗證

- **輸入驗證**: 驗證所有使用者輸入和匯入資料
- **URL 驗證**: 驗證書籤 URL 的有效性和安全性
- **同步資料驗證**: 驗證同步資料的完整性和真實性

## 效能優化

### 1. 資料庫優化

- **索引策略**: 為常用查詢建立適當索引
- **查詢優化**: 使用 EXPLAIN QUERY PLAN 優化查詢
- **批次操作**: 使用事務進行批次插入和更新
- **定期維護**: 實作 VACUUM 和 ANALYZE 操作

### 2. 記憶體管理

- **分頁載入**: 對大量資料實作分頁載入
- **虛擬滾動**: UI 中使用虛擬滾動技術
- **快取管理**: 智慧快取策略和及時清理
- **Web Workers**: 使用 Workers 處理大量運算

### 3. 同步優化

- **增量同步**: 只同步變更的資料
- **壓縮傳輸**: 壓縮同步資料減少傳輸量
- **背景同步**: 非同步背景同步機制
- **重試策略**: 智慧重試和錯誤恢復
