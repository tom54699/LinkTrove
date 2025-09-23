# 雲端同步（Google Drive appDataFolder）實作設計

本文件定義以 Google Drive 的 appDataFolder 為儲存端的「跨裝置雲端同步」方案。採增量落地：先確保本地匯出/匯入完整，接著提供雲端備份/還原，再升級為自動雙向同步。所有變更以「非破壞、可回退」為原則。

---

## 0. 前置：本地匯出/匯入驗證與小加固（Phase 0）

目標：確認目前格式在多資料面向下正確（webpages/categories/templates/subcategories/organizations/settings/orders），並對常見錯誤提供清楚訊息。

驗證清單：
- 多 Organization：`categories.organizationId` 存取與匯入後對應
- 多群組 + 群組排序：`subcategories` 與 `orders.subcategories[gid]` 恢復正確
- Templates：
  - 匯入後模板欄位鍵名與型別完整
  - Collections 的 `defaultTemplateId` 綁定仍有效
- 書籍欄位：webpage.meta 中固定鍵名（bookTitle/author/serialStatus/genre/wordCount/siteName/lastUpdate…）隨匯出/匯入保留

小加固（不改格式）：
- 匯出 JSON 內加摘要：`metaCounts = { webpages, categories, templates, subcategories, organizations }` 與 `exportedAt`
- 匯入前檢查：
  - `schemaVersion` 是否支援
  - 主要欄位是否為 Array；不符時顯示「無效匯入檔」錯誤
- README 註記匯出內容與相容性（已補）

---

## 1. 雲端儲存與權限

首選 Google Drive 的 `appDataFolder`：
- 優點：
  - 隱藏於使用者 Drive 介面，不干擾檔案；不易被誤刪
  - 僅需 `drive.appdata` scope，權限最小化
- 檔名：`linktrove.json`（若啟用 E2EE，可用 `linktrove.enc`）
- MIME：`application/json`（加密時 `application/octet-stream`）

Scopes 與 OAuth：
- manifest（MV3）：
  - `permissions`: ["identity"]
  - `oauth2.client_id`: <Chrome Extension OAuth Client ID>
  - `oauth2.scopes`: ["https://www.googleapis.com/auth/drive.appdata"]
- 取得 Token：`chrome.identity.getAuthToken({ interactive: true })`

Drive API 端點（REST v3）：
- 搜尋檔案（是否已存在）
  - GET `https://www.googleapis.com/drive/v3/files?q='appDataFolder'+in+parents+and+name='linktrove.json'&spaces=appDataFolder&fields=files(id,name,modifiedTime,md5Checksum)`
- 建立（multipart）
  - POST `/upload/drive/v3/files?uploadType=multipart`
    - metadata: `{ name: 'linktrove.json', parents: ['appDataFolder'] }`
    - media: JSON 內容
- 更新（覆蓋內容）
  - PATCH `/upload/drive/v3/files/{fileId}?uploadType=media`

---

## 2. 同步模式與流程

階段性落地：
- Phase 1：手動備份/還原（Backup/Restore）
  - Settings 新增「Cloud Sync」分頁（或區塊）：Connect / Backup Now / Restore / Disconnect / Auto Sync 開關
  - 行為：
    - Backup Now：讀本地完整 JSON →（可選 E2EE）→ 上傳到 appDataFolder；記錄 `lastCloudModified`
    - Restore：下載雲端 JSON → schema 檢查 → 替換本地（與匯入一致）
- Phase 2：自動雙向同步（LWW 合併）
  - Pull：啟動、開啟 Settings、或使用者按 Sync Now 時觸發
  - Push：監聽本地寫入（webpages/categories/templates/subcategories/orders），debounce 2s 批次上傳
  - 合併策略（對於每一類集合）：
    - 以 id 建立 Map，本地與雲端逐筆比較 `updatedAt`（或 `modifiedTime`）
    - `webpages/categories/subcategories/templates/organizations`：`updatedAt` 較新的覆蓋
    - `orders.subcategories[gid]`：較新者覆蓋（以「最後一次寫入為準」）
    - 刪除（第二階段）：加入 `deleted: true` tombstone，避免幽靈復活

同步觸發點：
- Pull：
  - App 啟動 / Settings 開啟 / 使用者按 Sync Now
- Push：
  - 我們已監聽 `chrome.storage.onChanged('webpages')` 做 UI reload；再加一個「同步佇列」：本地寫入時 enqueue（webpages/templates/categories/subcategories/orders）→ debounce 後合併出完整 JSON 上傳

狀態顯示（UI）
- 右上圖示或 Settings 內：
  - Connected / Disconnected
  - Last sync at / Syncing... / Error（可點開看簡短錯誤）

---

## 3. 資料格式與合併細節

檔案結構（沿用 exportData）：
```
{
  schemaVersion: 1,
  webpages: [...],
  categories: [...],
  templates: [...],
  subcategories: [...],
  organizations: [...],
  settings: { theme?, selectedCategoryId?, selectedOrganizationId? },
  orders: { subcategories: { [gid: string]: string[] } },
  metaCounts?: { webpages, categories, templates, subcategories, organizations },
  exportedAt?: string
}
```

合併演算法（LWW）：
- 對 `webpages/categories/subcategories/templates/organizations`：
  - `byId = new Map([...local, ...remote])` → 遍歷所有 id → 如果雙方都有，用 `updatedAt` 取較新；只有一方則採用
- 對 `orders.subcategories`：
  - 若 gid 同時存在，取較新（可比對 local/remote 層的 `exportedAt`/`modifiedTime` 或加一份 `ordersUpdatedAt`）
- `settings`：
  - 可採「本地優先」，或以雲端較新者覆蓋；保守建議：本地優先

刪除（第二階段）：
- 各集合加 `deleted?: boolean`；
- 合併時 `deleted === true` 代表優先刪除對方同 id；
- 本地硬刪除前，先寫 tombstone 並上傳；一段時間後再做垃圾回收（GC）。

---

## 4. 安全（可選 E2EE）

- 目標：雲端只存密文；需使用者密語（passphrase）在本機派生金鑰。
- 方案：WebCrypto SubtleCrypto
  - KDF：PBKDF2（或 Argon2 if available）
  - 加密：AES-GCM（隨機 iv）
  - JSON → Uint8Array → Encrypt → Base64；解密流程相反
- UI：Settings 中提供「啟用加密」與「更換密語」入口（警告：遺失密語將無法解密）

---

## 5. 元件與模組設計

檔案分佈（建議）：
- `src/app/data/cloud/googleDrive.ts`
  - `connect(): Promise<{ tokenInfo, userEmail? }>`
  - `disconnect(): Promise<void>`
  - `getFile(): Promise<{ fileId, modifiedTime } | null>`
  - `download(fileId): Promise<Uint8Array | string>`
  - `createOrUpdate(content: Uint8Array | string): Promise<{ fileId, modifiedTime }>`
- `src/app/data/syncService.ts`
  - `getStatus(): { connected, lastSyncedAt, syncing, error? }`
  - `syncNow(): Promise<void>`（pull→merge→push）
  - `backupNow(): Promise<void>`（只 push）
  - `restoreNow(): Promise<void>`（只 pull→replace）
  - `setAutoSync(enabled: boolean)`；內部管理 debounce push 與觸發 pull
  - `setEncryption(passphrase?: string)`；保存/清除加密設定
- `src/app/ui/SettingsModal.tsx`
  - 新增 Cloud Sync 分頁：Connect / Backup / Restore / Auto Sync / Encryption（可選）
  - 顯示同步狀態與錯誤
- `src/background/` 不需要新增 SW 端邏輯（優先在前端 UI 操作時觸發）；若要支援更隱性自動同步，可在 SW 監聽 storage 變更發訊號（低優先）

儲存與設定：
- `chrome.storage.local`：
  - `cloudSync.connected: boolean`
  - `cloudSync.lastSyncedAt: string`
  - `cloudSync.auto: boolean`
  - `cloudSync.encrypted: boolean`
  - `cloudSync.kdfSalt: string`（E2EE 時）
  - `cloudSync.drive.fileId: string`

---

## 6. 錯誤處理與回退

常見錯誤：
- 權限失效 / 需要重新登入：
  - UI 顯示「連線已失效，請按重新連線」
- API 配額 / 網路錯誤：
  - 顯示錯誤與重試按鈕；push 保留最近一次待送佇列，定時重試（退避策略）
- JSON 不合法 / schema 不符：
  - 給出清楚訊息；不覆蓋本地；可下載雲端原檔供除錯

回退：
- 保留本地快照最近 1 份（`chrome.storage.local.cloudSync.lastLocalSnapshot`）
- 還原按鈕：可回復到快照

---

## 7. UX 細節

- 同步狀態徽章：
  - Connected（綠）/ Syncing（藍動態）/ Error（紅）
  - 最後同步時間：`YYYY-MM-DD HH:mm`
- 操作防呆：
  - Restore 前二次確認：此操作會覆蓋本地資料
  - Encryption：提示「遺失密語將無法解密」

---

## 8. 節流與效能

- Push：監聽本地寫入後 debounce 2s；合併為單一上傳（避免高頻 API 呼叫）
- Pull：僅在 App 啟動、Settings 開啟、或 Sync Now 時進行；或固定最小間隔（例如 10 分鐘）
- 大檔：傳輸前可選 gzip（需斟酌 API header 與 manifest CSP）

---

## 9. 測試計畫

- 單元：
  - 合併演算法（LWW）：各集合、orders 覆蓋
  - E2EE：加解密往返一致
- 整合：
  - 連線 + 首次上傳 + 下載還原
  - 本地修改→debounce push；雲端修改→pull 合併
  - 錯誤處理（token 失效、配額錯誤）

---

## 10. 里程碑與交付

- M0：匯出/匯入驗證 + 小加固（摘要/錯誤/文件）
- M1：Drive 備份/還原（Connect/Backup/Restore/Disconnect + 狀態 UI）
- M2：自動雙向同步（Pull + Debounced Push + 合併）
- M3（可選）：E2EE、本地快照回復、tombstone 刪除、分享/協作

---

## 11. FAQ 與備註

- 為何不用 Chrome Storage Sync？
  - 容量小、配額限制，資料一多就不實用
- 為何選 appDataFolder？
  - 私有、權限最小、避免誤刪；若你希望讓使用者「看見檔案」，可以改為一般資料夾（需 drive.file）
- 與 Firestore 比較？
  - Drive 方案無需後端、易落地；若未來要多人協作或低延遲即時同步，再考慮 Firestore

---

附錄：欄位固定鍵名對照
- 參考 `docs/book-metadata-mapping.md`（書籍欄位鍵名與 OG 對應、正規化、合併策略）
