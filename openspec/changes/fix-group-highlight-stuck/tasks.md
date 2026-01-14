# Tasks: Fix Group Highlight Stuck

## Implementation
- [ ] Modify `src/app/groups/GroupsView.tsx`: Call `setActiveDropGroupId(null)` inside the `onDropTab` callback passed to `CardGrid`.
- [ ] Modify `src/app/groups/GroupsView.tsx`: Call `setActiveDropGroupId(null)` inside the `onDropExistingCard` callback passed to `CardGrid`.

## Verification
- [ ] Manual test: Drag a tab into a group and verify the highlight clears on drop.
- [ ] Manual test: Drag a card between groups and verify highlights clear correctly.
