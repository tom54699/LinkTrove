# Change: Fix Group Highlight Stuck

## Why
When dragging a tab from the sidebar to the center CardGrid area, the group container's highlight (indicating the drop target) remains active even after the drop operation is completed. This is because the drop event propagation is stopped by the `CardGrid` component, preventing the parent `GroupsView` from clearing the `activeDropGroupId` state.

## What Changes
- Update the `onDropTab` callback in `src/app/groups/GroupsView.tsx` to explicitly clear the `activeDropGroupId` state (set to `null`) immediately when invoked.

## Impact
- **Affected Specs**: `drag-drop`
- **Affected Code**: `src/app/groups/GroupsView.tsx`