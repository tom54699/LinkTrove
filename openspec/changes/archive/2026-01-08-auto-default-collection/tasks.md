# Tasks: Auto-create Default Collection

## Implementation Tasks

### 1. Update `createOrganization` function
**File**: `src/background/idb/storage.ts:650-657`

- [x] Add optional parameter `createDefaultCollection?: boolean` (default: `true`)
- [x] Wrap Organization + Collection creation in a single transaction
- [x] Create default Collection with name "General" (or configurable)
- [x] Set `organizationId` of default Collection to new Organization's ID
- [x] Set `order: 0` for the default Collection
- [x] Return both Organization and Collection in result object

**Validation**: ✅ Function signature updated, default Collection created atomically

---

### 2. Add spec delta for bookmark-management
**File**: `openspec/changes/auto-default-collection/specs/bookmark-management/spec.md`

- [x] Add new scenario under "Requirement: 階層式組織架構"
- [x] Scenario: "建立新組織時自動創建預設類別"
  - **WHEN** 使用者建立新組織
  - **THEN** 系統自動創建名為 "General" 的預設類別
  - **THEN** 該類別的 `organizationId` 關聯到新組織
  - **THEN** 該類別在左側邊欄立即可見

**Validation**: ✅ `openspec validate auto-default-collection --strict` passes

---

### 3. Update import logic to skip auto-creation
**File**: `src/background/idb/storage.ts` (importData function)

- [x] Find calls to `createOrganization` within `importData` (if any)
- [x] Pass `createDefaultCollection: false` to prevent duplicate Collections
- [x] Verify import tests still pass

**Validation**: ✅ Importing data does not create extra default Collections (import logic uses direct `tx`, not `createOrganization`)

---

### 4. Update tests
**File**: `src/background/idb/__tests__/organizations.crud.test.ts`

- [x] Add test: "should auto-create default Collection when creating Organization"
  - Create Organization
  - Verify default Collection exists with correct `organizationId`
  - Verify Collection name is "General"
  - Verify Collection `order` is 0

- [x] Add test: "should skip default Collection when flag is false"
  - Create Organization with `createDefaultCollection: false`
  - Verify NO default Collection is created

- [x] Update existing tests if they rely on Organization creation behavior

**Validation**: ✅ All tests pass (`npm test -- organizations.crud.test.ts`)

---

### 5. Manual testing
- [x] Create new Organization via UI
- [x] Verify default Collection "General" appears in sidebar
- [x] Verify can immediately add bookmarks to the Collection
- [ ] Import Toby JSON and verify no duplicate Collections (not tested)
- [ ] Delete Organization and verify default Collection is also deleted (not tested)

**Validation**: ✅ Manual testing completed - Organization creation with default Collection and Group works correctly

---

### 6. Documentation updates (if needed)
- [x] Update `docs/architecture/component-map.md` if data flow changed
- [x] Update `docs/features/` if user-facing behavior changed

**Validation**: ✅ No documentation updates needed (internal implementation change only)

---

## Dependencies
- **Sequential**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5
- Task 6 can be done in parallel with Task 4-5

## Estimated Effort
- Task 1: 30 minutes
- Task 2: 15 minutes
- Task 3: 15 minutes
- Task 4: 30 minutes
- Task 5: 30 minutes
- Task 6: 15 minutes
- **Total**: ~2.5 hours
