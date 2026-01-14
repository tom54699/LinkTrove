# Change: Fix Group Import Inputs

## Why
The "Import HTML" and "Import Toby" actions in the Group context menu are currently non-functional. The code attempts to programmatically click hidden file input elements (referenced by IDs like `html-file-${g.id}` and `toby-file-${g.id}`), but these elements are missing from the `GroupsView` component's render output.

## What Changes
- Add the missing hidden `<input type="file">` elements for HTML and Toby import to each group's section in `src/app/groups/GroupsView.tsx`.
- Wire these inputs to the existing `handleHtmlImport` and `handleTobyFileSelect` functions provided by the `useGroupImport` hook.

## Impact
- **Affected Specs**: `import-export`
- **Affected Code**: `src/app/groups/GroupsView.tsx`
