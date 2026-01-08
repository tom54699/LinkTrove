# Proposal: Auto-create Default Collection

## Summary
Automatically create a default Collection (Category) when a new Organization is created to reduce friction in the user onboarding experience.

## Problem
Currently, when users create a new Organization, they must manually create at least one Collection before they can start adding bookmarks. This creates unnecessary friction:

1. **Empty State**: New Organization appears empty with no Collections
2. **Extra Steps**: Users must understand the hierarchy and manually create a Collection
3. **Cognitive Load**: New users may not immediately understand why they can't add bookmarks yet

This is inconsistent with user expectations from similar tools (e.g., Toby), where creating a workspace automatically provides a usable starting point.

## Proposed Solution
Modify the `createOrganization` function to automatically create a default Collection immediately after the Organization is created. This ensures every Organization has at least one Collection ready for use.

**Key Changes:**
1. Extend `createOrganization` to accept an optional flag `createDefaultCollection` (default: `true`)
2. When `true`, automatically create a Collection named "General" or "My Collection" within the new Organization
3. Return both the created Organization and the default Collection (if created)
4. Ensure imports skip default Collection creation (to avoid duplicates)

**Transaction Approach:**
- Use a single IndexedDB transaction to create both the Organization and default Collection atomically
- Ensures data consistency even if the operation is interrupted

## Scope
- **In Scope**:
  - Modify `createOrganization` in `src/background/idb/storage.ts`
  - Add spec scenario for automatic default Collection creation
  - Update tests to verify default Collection creation
  - Ensure import operations skip auto-creation

- **Out of Scope**:
  - Creating default Subcategories/Groups (handled separately by `migrateSubcategoriesOnce`)
  - UI changes to customize default Collection name during Organization creation
  - Multiple default Collections

## Impact
- **User Experience**: Immediate improvement - new Organizations are instantly usable
- **Code Complexity**: Minimal - adds ~10-15 lines to `createOrganization`
- **Performance**: Negligible - one additional IndexedDB write per Organization creation
- **Backward Compatibility**: Full - existing Organizations unaffected, migration logic unchanged

## Alternatives Considered
1. **Manual Creation Only**: Keep current behavior
   - ❌ Poor UX, inconsistent with user expectations

2. **Create Default Collection + Subcategory**: Auto-create both levels
   - ❌ Over-engineered; `migrateSubcategoriesOnce` already handles Subcategory creation

3. **UI Prompt for Collection Name**: Ask user to name default Collection during Organization creation
   - ❌ Adds friction; can be changed later anyway

## Related Changes
- Spec delta: `openspec/specs/bookmark-management/spec.md` - Add scenario for auto-creation
- Implementation: `src/background/idb/storage.ts` - Modify `createOrganization`
- Tests: `src/background/idb/__tests__/organizations.crud.test.ts` - Add test cases

## Risks & Mitigation
- **Risk**: Import operations might create duplicate default Collections
  - **Mitigation**: Add `createDefaultCollection: false` parameter when called from import logic

- **Risk**: Transaction failure leaves orphaned Organization without Collection
  - **Mitigation**: Use atomic transaction for both operations; rollback on failure

## Success Criteria
1. New Organizations automatically have a default Collection named "General"
2. Importing data does NOT create duplicate default Collections
3. All existing tests pass
4. New tests verify auto-creation behavior

## Timeline
- Proposal: Current
- Implementation: ~1-2 hours
- Testing: ~30 minutes
- Total: ~2-3 hours
