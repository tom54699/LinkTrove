## ADDED Requirements
### Requirement: Hooks Dependency Hygiene
Hooks 依賴需符合 lint 規則且不得改變既有行為（如避免不必要的重連/重載）。

#### Scenario: Listener behavior preserved
- **WHEN** OpenTabsProvider 註冊 runtime listener
- **THEN** 不會因 actions 變動而重連 port

#### Scenario: Category reload behavior preserved
- **WHEN** selectedId 變化
- **THEN** 不會觸發 CategoriesProvider 重新載入 DB
