# Change: Update Organization Collection Memory

## Why
Currently, the application only remembers the globally selected `Collection`. When switching between `Organizations`, the selected collection is reset to the first one available in the new organization, or an invalid collection ID is attempted. This creates a suboptimal user experience where the user loses their place in an organization after switching away and back.

## What Changes
- Modify the state persistence logic to store the selected `Collection` ID keyed by `Organization` ID.
- Update the initialization logic to restore the last selected collection *specific to the current organization*.
- Ensure backward compatibility with the existing `selectedCategoryId` for the initial migration.

## Impact
- **Affected Specs**: `bookmark-management`
- **Affected Code**:
  - `src/app/sidebar/categories.tsx`: Main logic for selecting and persisting categories.
  - `src/background/idb/db.ts`: (Potentially) If schema changes were needed, but likely we can use existing storage keys.
