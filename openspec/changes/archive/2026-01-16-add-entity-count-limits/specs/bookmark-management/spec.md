# Spec Delta: bookmark-management

## ADDED Requirements

### Requirement: 實體數量上限限制
系統必須（SHALL）對各層級實體的數量進行限制，以確保 UI 佈局的穩定性。

#### Scenario: Organization 數量上限
- **GIVEN** 系統已有 8 個 Organization
- **WHEN** 使用者嘗試建立新的 Organization
- **THEN** 系統拒絕創建並顯示錯誤訊息「已達上限：最多只能建立 8 個 Organization」
- **THEN** 不會寫入任何資料到 IndexedDB

#### Scenario: Collection 數量上限（每個 Organization）
- **GIVEN** Organization A 已有 20 個 Collection
- **WHEN** 使用者嘗試在 Organization A 建立新的 Collection
- **THEN** 系統拒絕創建並顯示錯誤訊息「已達上限：每個 Organization 最多只能建立 20 個 Collection」
- **THEN** 不會寫入任何資料到 IndexedDB

#### Scenario: Group 數量上限（每個 Collection）
- **GIVEN** Collection B 已有 50 個 Group
- **WHEN** 使用者嘗試在 Collection B 建立新的 Group
- **THEN** 系統拒絕創建並顯示錯誤訊息「已達上限：每個 Collection 最多只能建立 50 個 Group」
- **THEN** 不會寫入任何資料到 IndexedDB

#### Scenario: 未達上限時正常創建
- **GIVEN** 系統有 5 個 Organization（未達上限）
- **WHEN** 使用者建立新的 Organization
- **THEN** 系統正常創建 Organization 並寫入 IndexedDB
- **THEN** 顯示成功提示

#### Scenario: 匯入資料不受限制
- **GIVEN** 系統已有 8 個 Organization
- **WHEN** 使用者匯入包含額外 Organization 的 JSON 資料
- **THEN** 系統正常匯入所有資料（不檢查上限）
- **THEN** 匯入完成後顯示成功提示

## Related
- 此限制不影響現有超過上限的資料
- 限制常量定義在 `src/background/idb/storage.ts` 的 `ENTITY_LIMITS`
