# Spec Delta: Bookmark Management - Minimum Count Protection

**Change ID**: `minimum-count-protection`
**Capability**: `bookmark-management`

---

## MODIFIED Requirements

### Requirement: 階層式組織架構

系統必須（SHALL）支援四層式書籤組織架構，並強制執行最小數量保護以確保資料完整性。

#### Scenario: 阻擋刪除最後一個 Organization
- **GIVEN** 系統只有 1 個 Organization
- **WHEN** 使用者嘗試刪除該 Organization
- **THEN** 系統顯示錯誤訊息：「刪除失敗：至少需要保留一個 Organization」
- **THEN** 刪除操作被取消，Organization 未被刪除

#### Scenario: 允許刪除非最後一個 Organization
- **GIVEN** 系統有 2 個以上的 Organization
- **WHEN** 使用者刪除其中一個 Organization
- **THEN** 系統顯示確認對話框
- **WHEN** 使用者確認刪除
- **THEN** 系統級聯刪除該 Organization 及所有關聯資料：
  - 該 Organization 下的所有 Categories
  - 這些 Categories 下的所有 Subcategories (Groups)
  - 這些 Subcategories 下的所有 Webpages
- **THEN** 系統顯示成功訊息：「已刪除 Organization 及其所有資料」
- **THEN** 系統自動切換到另一個 Organization（若當前刪除的是已選中的）

#### Scenario: 阻擋刪除 Organization 下最後一個 Collection
- **GIVEN** Organization A 只有 1 個 Collection
- **WHEN** 使用者嘗試刪除該 Collection
- **THEN** 系統顯示錯誤訊息：「刪除失敗：至少需要保留一個 Collection」
- **THEN** 刪除操作被取消，Collection 未被刪除

#### Scenario: 允許刪除非最後一個 Collection
- **GIVEN** Organization A 有 2 個 Collection: C1 和 C2
- **WHEN** 使用者刪除 Collection C1
- **THEN** 系統顯示確認對話框
- **WHEN** 使用者確認刪除
- **THEN** 系統級聯刪除 C1 及所有關聯資料：
  - C1 下的所有 Subcategories (Groups)
  - 這些 Subcategories 下的所有 Webpages
- **THEN** 系統顯示成功訊息：「已刪除 Collection 及其所有資料」
- **THEN** 若 C1 是當前選中的 Collection，系統自動切換到 C2

#### Scenario: 跨 Organization 的 Collection 刪除獨立性
- **GIVEN** Organization A 有 1 個 Collection，Organization B 有 2 個 Collection
- **WHEN** 使用者嘗試刪除 Organization A 下的 Collection
- **THEN** 系統阻擋刪除（Organization A 只剩一個 Collection）
- **WHEN** 使用者刪除 Organization B 下的其中一個 Collection
- **THEN** 系統允許刪除（Organization B 還有另一個 Collection）

#### Scenario: 阻擋刪除 Collection 下最後一個 Group
- **GIVEN** Collection X 只有 1 個 Group
- **WHEN** 使用者嘗試刪除該 Group
- **THEN** 系統顯示錯誤訊息：「刪除失敗：至少需要保留一個 Group」
- **THEN** 刪除操作被取消，Group 未被刪除

#### Scenario: 允許刪除非最後一個 Group
- **GIVEN** Collection X 有 2 個 Group: G1 和 G2
- **WHEN** 使用者刪除 Group G1
- **THEN** 系統級聯刪除 G1 及其下所有 Webpages
- **THEN** 系統顯示成功訊息：「已刪除 Group 與其書籤」
- **THEN** 視圖自動切換顯示 G2 的內容

#### Scenario: UI 層與 Data 層雙重保護
- **GIVEN** 系統只有 1 個 Organization
- **WHEN** UI 層檢查通過但 Data 層檢查失敗（極少數 race condition）
- **THEN** Data 層拋出錯誤
- **THEN** 系統捕捉錯誤並顯示：「刪除失敗」
- **THEN** 系統輸出 console.error 以供除錯
- **THEN** Organization 未被刪除

#### Scenario: 級聯刪除的原子性
- **GIVEN** Organization O1 包含 3 個 Categories，10 個 Groups，100 個 Webpages
- **WHEN** 使用者刪除 Organization O1
- **WHEN** 系統在級聯刪除過程中發生錯誤（例如 DB 連線中斷）
- **THEN** 系統回滾整個交易（使用 IndexedDB transaction）
- **THEN** 所有資料保持完整（全部保留或全部刪除）
- **THEN** 系統顯示錯誤訊息：「刪除失敗」

#### Scenario: 刪除操作的錯誤處理格式統一
- **GIVEN** 使用者在 UI 中執行任何層級的刪除操作
- **WHEN** 操作因任何原因失敗（網路錯誤、DB 錯誤、驗證失敗等）
- **THEN** 系統輸出 `console.error('[Operation] error:', error)`
- **THEN** 系統顯示使用者友善的 toast 訊息：「刪除失敗」或「刪除失敗：[具體原因]」
- **THEN** UI 狀態保持穩定，不會進入錯誤狀態

---

## ADDED Requirements

### Requirement: Organization 刪除 UI

系統必須（SHALL）提供使用者介面以刪除 Organization，並在刪除前顯示確認對話框。

#### Scenario: Organization 刪除 UI 可見且可用
- **WHEN** 使用者檢視 Organization 列表（左側 Navigation 或 Switcher）
- **THEN** 每個 Organization 應有可觸發的操作選單（context menu 或 edit dialog）
- **THEN** 選單中包含「重新命名」和「刪除」選項
- **THEN** 刪除選項使用紅色文字或圖示以示警告

#### Scenario: Organization 刪除確認對話框
- **WHEN** 使用者點擊 Organization 的「刪除」選項
- **THEN** 系統顯示確認對話框
- **THEN** 對話框標題為：「確認刪除 Organization？」
- **THEN** 對話框內容警告：「此操作將刪除所有關聯的 Collections、Groups 和 Webpages，無法復原」
- **THEN** 對話框包含「取消」和「確認刪除」按鈕
- **WHEN** 使用者點擊「取消」
- **THEN** 對話框關閉，不執行任何操作
- **WHEN** 使用者點擊「確認刪除」
- **THEN** 系統執行刪除操作（受最小數量保護約束）

#### Scenario: Organization 刪除按鈕在僅剩一個時的狀態
- **GIVEN** 系統只有 1 個 Organization
- **WHEN** 使用者打開該 Organization 的操作選單
- **THEN** 「刪除」選項應可見但處於禁用狀態（灰色）
- **THEN** hover 顯示 tooltip：「無法刪除：至少需要保留一個 Organization」
- **OR** 「刪除」選項可點擊，但點擊後立即顯示 toast 錯誤訊息（如其他 scenarios 所述）

---

## MODIFIED Requirements

### Requirement: 多組織支援

系統必須（SHALL）支援使用者建立和切換多個組織，各組織的資料完全獨立，並確保刪除組織時的資料完整性。

#### Scenario: 刪除組織時不再使用重新分配邏輯
- **GIVEN** 系統包含 Organization A 和 Organization B
- **GIVEN** Organization A 包含 Categories C1, C2 及相關資料
- **WHEN** 使用者刪除 Organization A
- **THEN** 系統**不會**將 C1, C2 重新分配到 Organization B
- **THEN** 系統**直接刪除** Organization A 及其所有關聯資料（C1, C2 及其下的所有 Groups 和 Webpages）
- **THEN** Organization B 的資料保持不變

#### Scenario: 刪除當前選中的 Organization 後自動切換
- **GIVEN** 系統有 Organization A, B, C
- **GIVEN** 當前選中 Organization B
- **WHEN** 使用者刪除 Organization B
- **THEN** 系統自動切換到另一個可用的 Organization（A 或 C）
- **THEN** 系統將新的選擇狀態儲存到 `chrome.storage.local` 的 `selectedOrganizationId`
- **THEN** 左側邊欄顯示新選中的 Organization 的 Categories

---

## Related Documentation

- **技術設計**: `design.md` - 級聯刪除架構與雙重保護機制
- **實作任務**: `tasks.md` - 13 項實作任務與依賴關係
- **現有規格**: `/openspec/specs/bookmark-management/spec.md` - 原始階層架構規格

---

## Notes

- 本 spec delta 新增了 11 個 scenarios，涵蓋三層級的最小數量保護與級聯刪除
- 所有 scenarios 使用 BDD 格式（GIVEN-WHEN-THEN），確保可測試性
- 與 `auto-default-collection` 變更互補，共同確保階層架構的完整性
- 級聯刪除使用 IndexedDB transaction 確保原子性
