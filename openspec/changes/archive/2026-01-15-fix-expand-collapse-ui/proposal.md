# Change: Fix Expand/Collapse & Update UI

## Why
Currently, the "Expand All" and "Collapse All" buttons in the main view are non-functional (bug). Additionally, the action buttons (Add Group, Expand, Collapse) deviate from the visual design mockups.

## What Changes
- **Fix Bug**: Ensure `groups:collapse-all` event is correctly handled in `GroupsView`.
- **UI Update**: Restyle "Add Group", "Expand", and "Collapse" buttons to match `mockups/index.html` (.header-btn style), adapting to the project's color theme.

## Impact
- **Affected Specs**: `bookmark-management`
- **Affected Code**: `src/app/App.tsx`, `src/app/groups/GroupsView.tsx`